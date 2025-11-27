require('dotenv').config();

module.exports = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production',
    dbPath: process.env.DATABASE_PATH || './smartrent.db',
    corsOptions: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
    },
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    },
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    }
}; 