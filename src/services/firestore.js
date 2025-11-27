/**
 * Firestore Service Layer
 * 
 * This service provides a unified interface for all Firestore operations.
 * It handles collection references, queries, and error handling.
 */

const { initializeFirebase } = require('../config/firebase');

class FirestoreService {
    constructor() {
        const { db, isFirebase } = initializeFirebase();
        
        if (!isFirebase) {
            throw new Error('Firestore is not initialized. Check your Firebase configuration.');
        }
        
        this.db = db;
        this.collections = {
            users: 'users',
            properties: 'properties',
            leases: 'leases',
            maintenance: 'maintenance',
            payments: 'payments',
            notifications: 'notifications'
        };
    }

    /**
     * Get a reference to a collection
     */
    collection(name) {
        return this.db.collection(name);
    }

    /**
     * Create a new document with auto-generated ID
     */
    async create(collectionName, data) {
        try {
            const docRef = await this.collection(collectionName).add({
                ...data,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            
            return {
                id: docRef.id,
                ...data
            };
        } catch (error) {
            console.error(`Error creating document in ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Create or update a document with a specific ID
     */
    async set(collectionName, docId, data, merge = true) {
        try {
            await this.collection(collectionName).doc(docId).set({
                ...data,
                updatedAt: new Date().toISOString()
            }, { merge });
            
            return {
                id: docId,
                ...data
            };
        } catch (error) {
            console.error(`Error setting document in ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Get a document by ID
     */
    async getById(collectionName, docId) {
        try {
            const doc = await this.collection(collectionName).doc(docId).get();
            
            if (!doc.exists) {
                return null;
            }
            
            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error(`Error getting document from ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Get all documents from a collection
     */
    async getAll(collectionName) {
        try {
            const snapshot = await this.collection(collectionName).get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`Error getting all documents from ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Query documents with filters
     * @param {string} collectionName - Collection name
     * @param {Array} filters - Array of [field, operator, value] tuples
     * Example: [['status', '==', 'active'], ['userId', '==', '123']]
     */
    async query(collectionName, filters = []) {
        try {
            let query = this.collection(collectionName);
            
            // Apply filters
            filters.forEach(([field, operator, value]) => {
                query = query.where(field, operator, value);
            });
            
            const snapshot = await query.get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`Error querying ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Update a document
     */
    async update(collectionName, docId, data) {
        try {
            await this.collection(collectionName).doc(docId).update({
                ...data,
                updatedAt: new Date().toISOString()
            });
            
            return await this.getById(collectionName, docId);
        } catch (error) {
            console.error(`Error updating document in ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Delete a document
     */
    async delete(collectionName, docId) {
        try {
            await this.collection(collectionName).doc(docId).delete();
            return true;
        } catch (error) {
            console.error(`Error deleting document from ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Batch write operations
     */
    batch() {
        return this.db.batch();
    }

    /**
     * Run a transaction
     */
    async runTransaction(callback) {
        return await this.db.runTransaction(callback);
    }
}

// Export singleton instance
let firestoreInstance = null;

const getFirestoreService = () => {
    if (!firestoreInstance) {
        firestoreInstance = new FirestoreService();
    }
    return firestoreInstance;
};

module.exports = {
    FirestoreService,
    getFirestoreService
};
