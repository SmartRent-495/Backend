const app = require('./app');
const config = require('./config/config');
// SQLite removed - now using Firestore
// const db = require('./config/database');

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1);
});

const server = app.listen(config.port, () => {
    console.log(`🚀 SmartRent Server running in ${config.nodeEnv} mode on port ${config.port}`);
    console.log(`📊 Database: Firestore (Cloud)`);
    console.log(`🔗 API available at: http://localhost:${config.port}/api`);
});

// NOTE: Lease expiration check moved to Firebase Cloud Functions
// See: functions/index.js for scheduled tasks

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
}); 