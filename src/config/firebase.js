/**
 * Firebase Configuration for SmartRent
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
let db = null;
let storage = null;
let messaging = null;
let firebaseInitialized = false;

const initializeFirebase = () => {
    if (firebaseInitialized) {
        console.log('ℹ️ Firebase already initialized');
        return { db, storage, messaging, isFirebase: true };
    }

    try {
        // Check if Firebase credentials are configured
        if (process.env.FIREBASE_PROJECT_ID) {
            console.log('🔥 Initializing Firebase with project:', process.env.FIREBASE_PROJECT_ID);
            
            let serviceAccount;
            
            // Try to get service account from environment variable first
            if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                console.log('📝 Using service account from environment variable');
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            } else {
                // Try to load from file
                try {
                    const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
                    console.log('📝 Loading service account from:', serviceAccountPath);
                    serviceAccount = require(serviceAccountPath);
                } catch (fileError) {
                    // Try alternative path
                    const altPath = path.join(__dirname, '../firebase-service-account.json');
                    console.log('📝 Trying alternative path:', altPath);
                    serviceAccount = require(altPath);
                }
            }

            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
                });
                console.log('✅ Firebase Admin SDK initialized');
            }

            db = admin.firestore();
            storage = admin.storage();
            messaging = admin.messaging();
            firebaseInitialized = true;

            console.log('✅ Firebase services ready (Firestore, Storage, Messaging)');
            return { db, storage, messaging, isFirebase: true };
        } else {
            console.error('❌ FIREBASE_PROJECT_ID not set in environment variables');
            console.log('ℹ️ Running without Firebase - this will cause authentication errors');
            return { db: null, isFirebase: false };
        }
    } catch (error) {
        console.error('❌ Error initializing Firebase:', error.message);
        console.error('❌ Stack trace:', error.stack);
        throw error; // Don't silently fail - we need Firebase for auth
    }
};

// Firestore Collection Names
const COLLECTIONS = {
    USERS: 'users',
    PROPERTIES: 'properties',
    LEASES: 'leases',
    PAYMENTS: 'payments',
    MAINTENANCE_REQUESTS: 'maintenance_requests',
    NOTIFICATIONS: 'notifications',
    UTILITIES: 'utilities',
    DOCUMENTS: 'documents',
    MESSAGES: 'messages'
};

// Helper functions for Firestore operations
const firestoreHelpers = {
    // Convert Firestore document to plain object
    docToObject: (doc) => {
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    },

    // Convert Firestore query snapshot to array of objects
    queryToArray: (snapshot) => {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // Add timestamp fields
    withTimestamps: (data, isUpdate = false) => {
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        if (isUpdate) {
            return { ...data, updated_at: timestamp };
        }
        return { ...data, created_at: timestamp, updated_at: timestamp };
    },

    // Batch write operations
    batchWrite: async (operations) => {
        const batch = db.batch();
        operations.forEach(({ ref, data, operation = 'set' }) => {
            if (operation === 'set') {
                batch.set(ref, data);
            } else if (operation === 'update') {
                batch.update(ref, data);
            } else if (operation === 'delete') {
                batch.delete(ref);
            }
        });
        return await batch.commit();
    }
};

module.exports = {
    initializeFirebase,
    COLLECTIONS,
    firestoreHelpers,
    admin // Export admin for use in middleware
};