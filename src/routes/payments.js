const express = require('express');
const router = express.Router();

// Initialize Stripe only if API key is provided
let stripe;
try {
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'your_stripe_secret_key_here') {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
} catch (error) {
  console.warn('⚠️  Stripe not initialized:', error.message);
}

// Prices in TL (converted to Kuruş for Stripe, i.e., multiply by 100)
const MEMBERSHIP_PRICES = {
  '1month': 60000,   // 600 TL
  '2weeks': 30000,  // 300 TL
  '1week': 25000    // 250 TL
};
const BOOKING_PRICE_PER_HOUR = 50000; // 500 TL

// POST /api/payments/create-checkout-session
router.post('/create-checkout-session', express.json(), async (req, res) => {
  try {
    const { type, plan, hours, facility, userEmail } = req.body;
    let line_items = [];

    if (type === 'membership') {
      if (!MEMBERSHIP_PRICES[plan]) {
        return res.status(400).json({ error: 'Invalid membership plan' });
      }
      line_items.push({
        price_data: {
          currency: 'try',
          product_data: {
            name: `Membership - ${plan}`,
          },
          unit_amount: MEMBERSHIP_PRICES[plan],
          recurring: { interval: plan === '1month' ? 'month' : 'week', interval_count: plan === '2weeks' ? 2 : 1 },
        },
        quantity: 1,
      });
    } else if (type === 'booking') {
      if (!hours || !facility) {
        return res.status(400).json({ error: 'Missing booking details' });
      }
      line_items.push({
        price_data: {
          currency: 'try',
          product_data: {
            name: `Booking - ${facility}`,
          },
          unit_amount: BOOKING_PRICE_PER_HOUR,
        },
        quantity: hours,
      });
    } else {
      return res.status(400).json({ error: 'Invalid payment type' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: type === 'membership' ? 'subscription' : 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscriptions?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscriptions?canceled=true`,
      customer_email: userEmail,
      metadata: type === 'booking' ? {
        facility,
        hours,
        booking_date: req.body.booking_date || ''
      } : {},
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Failed to create Stripe session' });
  }
});

// Stripe webhook endpoint
const db = require('../config/database');
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Stripe webhook event received:', event.type);
  console.log('Incoming event:', event);
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('Checkout session completed:', session);
      console.log('Session metadata:', session.metadata);
      console.log('Session plan_key:', session.metadata && session.metadata.plan_key);
      // If this was a booking, create the booking in the database
      if (session.metadata && session.metadata.facility && session.metadata.hours && session.metadata.booking_date) {
        const facility = session.metadata.facility;
        const hours = parseInt(session.metadata.hours, 10);
        const booking_date = session.metadata.booking_date;
        const email = session.customer_email;
        if (email) {
          db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
            if (err || !user) {
              console.error('User lookup failed for booking:', err || 'User not found');
              return;
            }
            db.run('INSERT INTO bookings (user_id, facility, hours, booking_date, status) VALUES (?, ?, ?, ?, ?)', [user.id, facility, hours, booking_date, 'confirmed'], function(err2) {
              if (err2) {
                console.error('Failed to create booking from Stripe webhook:', err2);
              } else {
                console.log('Booking created from Stripe webhook for user', user.id);
              }
            });
          });
        }
      } else {
        // Membership purchase: insert new membership record
        const email = session.customer_email;
        const plan_key = session.metadata && session.metadata.plan_key;
        console.log('Membership purchase: email:', email, 'plan_key:', plan_key);
        if (!plan_key) {
          console.error('No plan_key in session metadata');
          break;
        }
        
        // Get user ID
        db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
          if (err || !user) {
            console.error('User lookup failed for membership:', err || 'User not found');
            return;
          }
          
          // Start a transaction to ensure data consistency
          db.serialize(() => {
            // First, get the current date in YYYY-MM-DD format
            const currentDate = new Date().toISOString().split('T')[0];
            
            // Calculate end date based on plan
            const endDate = new Date();
            if (plan_key === '1week') {
              endDate.setDate(endDate.getDate() + 7);
            } else if (plan_key === '2weeks') {
              endDate.setDate(endDate.getDate() + 14);
            } else if (plan_key === '1month') {
              endDate.setMonth(endDate.getMonth() + 1);
            } else {
              console.error('Invalid plan key:', plan_key);
              return;
            }
            const endDateStr = endDate.toISOString().split('T')[0];
            
            // Check for existing active memberships
            db.get(
              `SELECT id FROM memberships 
               WHERE user_id = ? AND status = 'active' 
               AND (end_date IS NULL OR end_date >= date('now'))`,
              [user.id],
              (err, existingMembership) => {
                if (err) {
                  console.error('Error checking for existing memberships:', err);
                  return;
                }
                
                if (existingMembership) {
                  console.log('User already has an active membership, updating existing one');
                  
                  // Update existing membership end date to the new end date
                  db.run(
                    `UPDATE memberships 
                     SET end_date = date(?, '+1 day'),  // Add one day to include the last day
                         status = 'active',
                         updated_at = datetime('now')
                     WHERE id = ?`,
                    [endDateStr, existingMembership.id],
                    function(updateErr) {
                      if (updateErr) {
                        console.error('Failed to update existing membership:', updateErr);
                      } else {
                        console.log(`Extended existing membership ID ${existingMembership.id} to ${endDateStr}`);
                      }
                    }
                  );
                } else {
                  // Insert new membership with calculated end date
                  db.run(
                    `INSERT INTO memberships 
                     (user_id, plan_key, start_date, end_date, status, created_at) 
                     VALUES (?, ?, date('now'), date(?, '+1 day'), 'active', datetime('now'))`,
                    [user.id, plan_key, endDateStr],
                    function(insertErr) {
                      if (insertErr) {
                        console.error('Failed to create membership:', insertErr);
                      } else {
                        console.log(`Created new membership for user ${user.id}, plan ${plan_key} until ${endDateStr}`);
                      }
                    }
                  );
                }
              }
            );
          });
        });
      }
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router; 