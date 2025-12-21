const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const { authenticateToken } = require('../middleware/auth');
const { getPaymentService } = require('../services/payment.service');

const db = getFirestore();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


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


router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { leaseId, period, type = 'rent' } = req.body;
    const tenantId = req.user.userId;

    // Validate input
    if (!leaseId || !period) {
      return res.status(400).json({ 
        error: 'Missing required fields: leaseId, period' 
      });
    }

    // Validate period format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ 
        error: 'Invalid period format. Use YYYY-MM' 
      });
    }

    // 1️⃣ Fetch lease
    const leaseSnap = await db.collection('leases').doc(leaseId).get();
    if (!leaseSnap.exists) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const lease = { id: leaseSnap.id, ...leaseSnap.data() };

    // 2️⃣ Authorization check
    if (lease.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // 3️⃣ Lease must be active
    if (lease.status !== 'active') {
      return res.status(400).json({ 
        error: `Cannot create payment for ${lease.status} lease` 
      });
    }

    // 4️⃣ Check for duplicate payment
    const paymentService = getPaymentService();
    const exists = await paymentService.existsForPeriod(leaseId, period);
    
    if (exists) {
      return res.status(409).json({ 
        error: `Payment already exists for ${period}` 
      });
    }

    // 5️⃣ Determine amount
    let amount;
    switch (type) {
      case 'rent':
        amount = lease.monthlyRent;
        break;
      case 'deposit':
        amount = lease.securityDeposit || lease.monthlyRent;
        break;
      default:
        return res.status(400).json({ error: 'Invalid payment type' });
    }

    // 6️⃣ Create payment record in Firestore
    const payment = await paymentService.create({
      leaseId,
      tenantId,
      landlordId: lease.landlordId,
      propertyId: lease.propertyId,
      amount,
      currency: 'USD',
      type,
      period,
    });

    // 7️⃣ Create Stripe Payment Intent
    const amountInCents = Math.round(amount * 100);
    
    console.log('Creating Stripe PaymentIntent:', {
      amount: amountInCents,
      currency: 'usd',
      paymentId: payment.id
    });

    // Validate amount
    if (amountInCents <= 0) {
      return res.status(400).json({ 
        error: 'Invalid payment amount: must be greater than 0' 
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents, // Convert to cents
      currency: 'usd',
      metadata: {
        paymentId: payment.id,
        leaseId,
        tenantId,
        period,
        type,
      },
      automatic_payment_methods: { enabled: true },
    });

    console.log('✅ Stripe PaymentIntent created:', paymentIntent.id, 'Status:', paymentIntent.status);

    // 8️⃣ Update payment with Stripe ID
    await paymentService.updateStripeIntentId(payment.id, paymentIntent.id);

    res.json({ 
      paymentId: payment.id,
      clientSecret: paymentIntent.client_secret 
    });

  } catch (err) {
    console.error('❌ Create payment error:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});


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
      // Extract charge ID safely
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


router.post('/get-intent', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.body;
    const userId = req.user.userId;
    const paymentService = getPaymentService();

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    // Get payment
    const payment = await paymentService.getById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Authorization check
    if (payment.tenantId !== userId && payment.landlordId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // If payment is already completed, don't return client secret
    if (payment.status === 'paid') {
      return res.status(400).json({ 
        error: 'Payment already completed',
        status: 'paid' 
      });
    }

    // Get the payment intent from Stripe
    if (!payment.stripePaymentIntentId) {
      return res.status(400).json({ 
        error: 'Payment intent not found' 
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(
      payment.stripePaymentIntentId
    );

    // Check if payment intent can be used
    if (paymentIntent.status === 'succeeded') {
      return res.status(400).json({ 
        error: 'Payment already completed',
        status: 'paid' 
      });
    }

    if (paymentIntent.status === 'canceled') {
      return res.status(400).json({ 
        error: 'Payment was canceled',
        status: 'canceled' 
      });
    }

    console.log('Payment Intent Status:', paymentIntent.status);
    console.log('Payment Intent Amount:', paymentIntent.amount);

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      amount: paymentIntent.amount
    });

  } catch (err) {
    console.error('❌ Get payment intent error:', err);
    res.status(500).json({ error: 'Failed to retrieve payment intent' });
  }
});


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


router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // req.body is raw because we registered this route before express.json()
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

        // Extract charge ID safely
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