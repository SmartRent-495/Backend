require('dotenv').config();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://smartrent-fawn.vercel.app';

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production',
  dbPath: process.env.DATABASE_PATH || './smartrent.db',

  corsOptions: {
    origin: function (origin, callback) {
      const allowedOrigins = [
        'http://localhost:3000',
        FRONTEND_URL,
      ];

      // Allow requests with no origin (curl/Postman/server-to-server)
      if (!origin) return callback(null, true);

      // Allow Vercel preview deployments too (optional but useful)
      if (origin.endsWith('.vercel.app')) return callback(null, true);

      if (!allowedOrigins.includes(origin)) {
        return callback(new Error(`CORS blocked for origin: ${origin}`), false);
      }

      return callback(null, true);
    },

    credentials: true,

    // ✅ IMPORTANT: allow PATCH/DELETE and preflight
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // ✅ IMPORTANT: allow Authorization header
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-bootstrap-secret'],

    optionsSuccessStatus: 200,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  },
};
