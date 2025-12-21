const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Middleware to ensure Stripe is configured
 * Attaches stripe instance to req.stripe
 */
const requireStripe = (req, res, next) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ 
      error: 'Stripe is not configured on the server' 
    });
  }
  
  req.stripe = stripe;
  next();
};

module.exports = { requireStripe };