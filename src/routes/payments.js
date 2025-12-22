const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const { authenticateToken } = require('../middleware/auth');
const { getPaymentService } = require('../services/payment.service');

const db = getFirestore();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


// Helper: Check if tenant has any previous payments for this property
async function hasExistingPayments(tenantId, propertyId) {
  const snap = await db.collection('payments')
    .where('tenantId', '==', tenantId)
    .where('propertyId', '==', propertyId)
    .where('status', 'in', ['paid', 'pending'])
    .limit(1)
    .get();
  
  return !snap.empty;
}


// TENANT: Get their own payments
router.get('/tenant', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.userId;
    const paymentService = getPaymentService();
    
    const payments = await paymentService.getByTenant(tenantId);
    
    res.json({ payments });
  } catch (err) {
    console.error('❌ Get tenant payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});


// LANDLORD: Get all payments for their properties
router.get('/landlord', authenticateToken, async (req, res) => {
  try {
    const landlordId = req.user.userId;
    const paymentService = getPaymentService();
    
    const payments = await paymentService.getByLandlord(landlordId);
    
    res.json({ payments });
  } catch (err) {
    console.error('❌ Get landlord payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});


// Check if tenant has existing payments for a property
router.get('/check-existing/:tenantId/:propertyId', authenticateToken, async (req, res) => {
  try {
    const { tenantId, propertyId } = req.params;
    const landlordId = req.user.userId;

    // Verify the landlord owns this property
    const propertyDoc = await db.collection('properties').doc(propertyId).get();
    if (!propertyDoc.exists) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const propertyData = propertyDoc.data();
    if (propertyData.landlordId !== landlordId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const hasPayments = await hasExistingPayments(tenantId, propertyId);
    
    res.json({ 
      hasExistingPayments: hasPayments,
      requiresDeposit: !hasPayments 
    });
  } catch (err) {
    console.error('❌ Check existing payments error:', err);
    res.status(500).json({ error: 'Failed to check payments' });
  }
});


// LANDLORD: Create payment request for tenant
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { 
      tenantId, 
      propertyId, 
      period, 
      rentAmount = 0, 
      utilitiesAmount = 0, 
      depositAmount = 0, 
      description 
    } = req.body;
    const landlordId = req.user.userId;

    // Validate input
    if (!tenantId || !propertyId || !period) {
      return res.status(400).json({ 
        error: 'Missing required fields: tenantId, propertyId, period' 
      });
    }

    // At least one amount must be provided
    const rent = parseFloat(rentAmount) || 0;
    const utilities = parseFloat(utilitiesAmount) || 0;
    const deposit = parseFloat(depositAmount) || 0;

    if (rent <= 0 && utilities <= 0 && deposit <= 0) {
      return res.status(400).json({ 
        error: 'At least one payment amount (rent, utilities, or deposit) must be greater than 0' 
      });
    }

    // Validate period format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ 
        error: 'Invalid period format. Use YYYY-MM' 
      });
    }

    // Check if tenant has existing payments - if yes, deposits shouldn't be allowed
    const hasPayments = await hasExistingPayments(tenantId, propertyId);
    if (hasPayments && deposit > 0) {
      return res.status(400).json({ 
        error: 'Deposit can only be charged for the first payment. This tenant already has payments for this property.' 
      });
    }

    // Calculate total amount
    const totalAmount = rent + utilities + deposit;

    if (totalAmount <= 0) {
      return res.status(400).json({ 
        error: 'Total payment amount must be greater than 0' 
      });
    }

    // Check for duplicate payment (same tenant, property, period)
    const paymentService = getPaymentService();
    const existingSnap = await db.collection('payments')
      .where('landlordId', '==', landlordId)
      .where('tenantId', '==', tenantId)
      .where('propertyId', '==', propertyId)
      .where('period', '==', period)
      .where('status', 'in', ['pending', 'paid'])
      .limit(1)
      .get();
    
    if (!existingSnap.empty) {
      return res.status(409).json({ 
        error: `Payment already exists for this tenant and property in ${period}` 
      });
    }

    // Create payment record in Firestore
    const payment = await paymentService.create({
      tenantId,
      landlordId,
      propertyId,
      totalAmount,
      rentAmount: rent,
      utilitiesAmount: utilities,
      depositAmount: deposit,
      currency: 'USD',
      period,
      description: description || `Payment for ${period}`,
      isFirstPayment: !hasPayments, // Track if this is their first payment
    });

    console.log('✅ Payment request created:', payment.id);

    res.json({ 
      paymentId: payment.id,
      message: 'Payment request created successfully',
      payment
    });

  } catch (err) {
    console.error('❌ Create payment error:', err);
    res.status(500).json({ error: 'Failed to create payment request' });
  }
});


// TENANT: Initiate payment (create Stripe PaymentIntent)
router.post('/pay/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const tenantId = req.user.userId;
    const paymentService = getPaymentService();

    // Get payment
    const payment = await paymentService.getById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Authorization: Must be the tenant
    if (payment.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Unauthorized: This payment is not for you' });
    }

    // Check status
    if (payment.status === 'paid') {
      return res.status(400).json({ error: 'Payment already completed' });
    }

    if (payment.status === 'cancelled') {
      return res.status(400).json({ error: 'Payment has been cancelled' });
    }

    // If PaymentIntent already exists, return it
    if (payment.stripePaymentIntentId) {
      const existingIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
      
      if (existingIntent.status === 'succeeded') {
        return res.status(400).json({ error: 'Payment already completed' });
      }

      if (existingIntent.status !== 'canceled') {
        return res.json({ 
          clientSecret: existingIntent.client_secret,
          paymentIntentId: existingIntent.id
        });
      }
    }

    // Create Stripe Payment Intent
    const amountInCents = Math.round(payment.totalAmount * 100);
    
    console.log('Creating Stripe PaymentIntent:', {
      amount: amountInCents,
      currency: 'usd',
      paymentId: payment.id
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        paymentId: payment.id,
        tenantId: payment.tenantId,
        landlordId: payment.landlordId,
        propertyId: payment.propertyId,
        period: payment.period,
      },
      automatic_payment_methods: { enabled: true },
    });

    console.log('✅ Stripe PaymentIntent created:', paymentIntent.id, 'Status:', paymentIntent.status);

    // Update payment with Stripe ID
    await paymentService.updateStripeIntentId(payment.id, paymentIntent.id);

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (err) {
    console.error('❌ Pay error:', err);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});


// Sync payment status with Stripe
router.post('/sync/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.userId;
    const paymentService = getPaymentService();

    const payment = await paymentService.getById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Authorization check
    if (payment.tenantId !== userId && payment.landlordId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get status from Stripe
    if (!payment.stripePaymentIntentId) {
      return res.status(400).json({ error: 'No Stripe payment intent found' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(
      payment.stripePaymentIntentId
    );

    console.log(`🔄 Syncing payment ${paymentId}: Stripe status = ${paymentIntent.status}, DB status = ${payment.status}`);

    // Update our database to match Stripe
    if (paymentIntent.status === 'succeeded' && payment.status !== 'paid') {
      let stripeChargeId = null;
      if (paymentIntent.charges && paymentIntent.charges.data && paymentIntent.charges.data.length > 0) {
        stripeChargeId = paymentIntent.charges.data[0].id;
      }
      
      await paymentService.updateStatus(paymentId, 'paid', {
        stripeChargeId: stripeChargeId,
      });
      console.log(`✅ Synced payment ${paymentId} to 'paid'`);
      
      return res.json({ 
        message: 'Payment synced successfully',
        status: 'paid',
        synced: true
      });
    }

    if (paymentIntent.status === 'canceled' && payment.status === 'pending') {
      await paymentService.updateStatus(paymentId, 'failed');
      console.log(`✅ Synced payment ${paymentId} to 'failed'`);
      
      return res.json({ 
        message: 'Payment synced successfully',
        status: 'failed',
        synced: true
      });
    }

    res.json({ 
      message: 'No sync needed',
      status: payment.status,
      synced: false
    });

  } catch (err) {
    console.error('❌ Sync payment error:', err);
    res.status(500).json({ error: 'Failed to sync payment' });
  }
});


// LANDLORD: Cancel a payment request (only if not paid)
router.delete('/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const landlordId = req.user.userId;
    const paymentService = getPaymentService();

    const payment = await paymentService.getById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Authorization: Must be the landlord
    if (payment.landlordId !== landlordId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Can't cancel paid payments
    if (payment.status === 'paid') {
      return res.status(400).json({ error: 'Cannot cancel a paid payment' });
    }

    await paymentService.updateStatus(paymentId, 'cancelled');

    res.json({ message: 'Payment cancelled successfully' });
  } catch (err) {
    console.error('❌ Cancel payment error:', err);
    res.status(500).json({ error: 'Failed to cancel payment' });
  }
});


// Get single payment details
router.get('/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.userId;
    const paymentService = getPaymentService();

    const payment = await paymentService.getById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Authorization: only tenant or landlord can view
    if (payment.tenantId !== userId && payment.landlordId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(payment);
  } catch (err) {
    console.error('❌ Get payment error:', err);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});


// Stripe webhook
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const paymentService = getPaymentService();

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const succeededIntent = event.data.object;
        const paymentId = succeededIntent.metadata.paymentId;

        let stripeChargeId = null;
        if (succeededIntent.charges && succeededIntent.charges.data && succeededIntent.charges.data.length > 0) {
          stripeChargeId = succeededIntent.charges.data[0].id;
        }

        await paymentService.updateStatus(paymentId, 'paid', {
          stripeChargeId: stripeChargeId,
        });

        console.log(`✅ Payment ${paymentId} succeeded`);
        break;

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object;
        const failedPaymentId = failedIntent.metadata.paymentId;

        await paymentService.updateStatus(failedPaymentId, 'failed');

        console.log(`❌ Payment ${failedPaymentId} failed`);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('❌ Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;