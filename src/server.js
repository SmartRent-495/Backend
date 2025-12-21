const app = require('./app');
const config = require('./config/config');

// Error handlers for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
    process.exit(1);
});

// Start server
const server = app.listen(config.port, () => {
    console.log('='.repeat(50));
    console.log('🚀 SmartRent Server Started');
    console.log('='.repeat(50));
    console.log(`📍 Environment: ${config.nodeEnv}`);
    console.log(`🌐 Port: ${config.port}`);
    console.log(`🔗 API URL: http://localhost:${config.port}/api`);
    console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? 
        (process.env.STRIPE_SECRET_KEY.startsWith('sk_test') ? '✅ TEST MODE' : '✅ LIVE MODE') : 
        '⚠️  NOT CONFIGURED'}`);
    console.log(`📊 Database: Firestore (Cloud)`);
    console.log('='.repeat(50));
    console.log('');
    console.log('Available endpoints:');
    console.log('  - POST   /api/payments/create-payment-intent');
    console.log('  - GET    /api/payments/status/:paymentIntentId');
    console.log('  - GET    /api/payments/history/:userId');
    console.log('  - GET    /api/payments/landlord-history/:landlordId');
    console.log('  - POST   /api/payments/refund');
    console.log('  - POST   /api/payments/webhook (Stripe webhook)');
    console.log('  - GET    /health (Health check)');
    console.log('');
    console.log('📝 Note: Stripe webhook endpoint ready at:');
    console.log(`     http://localhost:${config.port}/api/payments/webhook`);
    console.log('');
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    server.close(async () => {
        console.log('✅ HTTP server closed');
        
        // Close any other connections here if needed
        // e.g., database connections, redis, etc.
        
        console.log('✅ All connections closed');
        console.log('👋 Server shutdown complete');
        process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// NOTE: Scheduled tasks (lease expiration checks, etc.) 
// should be implemented in Firebase Cloud Functions
// See: functions/index.js for scheduled tasks