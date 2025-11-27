/**
 * Firestore Service Layer
 * Provides centralized database operations for all collections
 */

const { initializeFirebase } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

// Get Firestore instance
const { db: firestore, isFirebase } = initializeFirebase();

if (!isFirebase) {
    throw new Error('Firestore is not enabled. Please configure Firebase properly.');
}

/**
 * Generic CRUD operations
 */
class FirestoreService {
    /**
     * Create a new document in a collection
     * @param {string} collection - Collection name
     * @param {object} data - Document data
     * @param {string} docId - Optional document ID
     * @returns {Promise<{id: string, data: object}>}
     */
    async create(collection, data, docId = null) {
        try {
            const timestamp = FieldValue.serverTimestamp();
            const docData = {
                ...data,
                createdAt: timestamp,
                updatedAt: timestamp
            };

            let docRef;
            if (docId) {
                docRef = firestore.collection(collection).doc(docId);
                await docRef.set(docData);
            } else {
                docRef = await firestore.collection(collection).add(docData);
            }

            const doc = await docRef.get();
            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error(`[Firestore] Error creating document in ${collection}:`, error);
            throw error;
        }
    }

    /**
     * Get a document by ID
     * @param {string} collection - Collection name
     * @param {string} docId - Document ID
     * @returns {Promise<object|null>}
     */
    async getById(collection, docId) {
        try {
            const doc = await firestore.collection(collection).doc(docId).get();
            
            if (!doc.exists) {
                return null;
            }

            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error(`[Firestore] Error getting document from ${collection}:`, error);
            throw error;
        }
    }

    /**
     * Get all documents in a collection with optional filters
     * @param {string} collection - Collection name
     * @param {object} filters - Query filters {field: value}
     * @param {object} options - Query options {orderBy, limit, offset}
     * @returns {Promise<Array>}
     */
    async getAll(collection, filters = {}, options = {}) {
        try {
            let query = firestore.collection(collection);

            // Apply filters
            Object.entries(filters).forEach(([field, value]) => {
                if (value !== undefined && value !== null) {
                    query = query.where(field, '==', value);
                }
            });

            // Apply ordering
            if (options.orderBy) {
                const [field, direction = 'asc'] = options.orderBy.split(' ');
                query = query.orderBy(field, direction);
            }

            // Apply limit
            if (options.limit) {
                query = query.limit(options.limit);
            }

            // Apply offset
            if (options.offset) {
                query = query.offset(options.offset);
            }

            const snapshot = await query.get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`[Firestore] Error getting documents from ${collection}:`, error);
            throw error;
        }
    }

    /**
     * Update a document
     * @param {string} collection - Collection name
     * @param {string} docId - Document ID
     * @param {object} data - Updated data
     * @returns {Promise<object>}
     */
    async update(collection, docId, data) {
        try {
            const docRef = firestore.collection(collection).doc(docId);
            
            await docRef.update({
                ...data,
                updatedAt: FieldValue.serverTimestamp()
            });

            const doc = await docRef.get();
            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error(`[Firestore] Error updating document in ${collection}:`, error);
            throw error;
        }
    }

    /**
     * Delete a document
     * @param {string} collection - Collection name
     * @param {string} docId - Document ID
     * @returns {Promise<void>}
     */
    async delete(collection, docId) {
        try {
            await firestore.collection(collection).doc(docId).delete();
        } catch (error) {
            console.error(`[Firestore] Error deleting document from ${collection}:`, error);
            throw error;
        }
    }

    /**
     * Query with complex conditions
     * @param {string} collection - Collection name
     * @param {Array} conditions - Array of {field, operator, value}
     * @param {object} options - Query options
     * @returns {Promise<Array>}
     */
    async query(collection, conditions = [], options = {}) {
        try {
            let query = firestore.collection(collection);

            // Apply conditions
            conditions.forEach(({ field, operator, value }) => {
                query = query.where(field, operator, value);
            });

            // Apply ordering
            if (options.orderBy) {
                const [field, direction = 'asc'] = options.orderBy.split(' ');
                query = query.orderBy(field, direction);
            }

            // Apply limit
            if (options.limit) {
                query = query.limit(options.limit);
            }

            const snapshot = await query.get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`[Firestore] Error querying ${collection}:`, error);
            throw error;
        }
    }

    /**
     * Get user by email
     * @param {string} email - User email
     * @returns {Promise<object|null>}
     */
    async getUserByEmail(email) {
        try {
            const snapshot = await firestore.collection('users')
                .where('email', '==', email)
                .limit(1)
                .get();

            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error('[Firestore] Error getting user by email:', error);
            throw error;
        }
    }

    /**
     * Get properties by landlord
     * @param {string} landlordId - Landlord user ID
     * @returns {Promise<Array>}
     */
    async getPropertiesByLandlord(landlordId) {
        return this.getAll('properties', { landlordId }, { orderBy: 'createdAt desc' });
    }

    /**
     * Get leases by tenant or landlord
     * @param {string} userId - User ID
     * @param {string} role - User role ('landlord' or 'tenant')
     * @returns {Promise<Array>}
     */
    async getLeasesByUser(userId, role) {
        const field = role === 'landlord' ? 'landlordId' : 'tenantId';
        return this.getAll('leases', { [field]: userId }, { orderBy: 'createdAt desc' });
    }

    /**
     * Get maintenance requests
     * @param {string} userId - User ID
     * @param {string} role - User role
     * @returns {Promise<Array>}
     */
    async getMaintenanceByUser(userId, role) {
        const field = role === 'landlord' ? 'landlordId' : 'tenantId';
        return this.getAll('maintenance', { [field]: userId }, { orderBy: 'createdAt desc' });
    }
}

module.exports = new FirestoreService();
