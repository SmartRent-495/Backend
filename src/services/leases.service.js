/**
 * Lease Service - Firestore Operations
 * 
 * Handles all lease-related database operations using Firestore
 */

const { getFirestoreService } = require('./firestore');

class LeaseService {
    constructor() {
        this.firestore = getFirestoreService();
        this.collection = 'leases';
    }

    /**
     * Create a new lease
     */
    async createLease(leaseData) {
        try {
            const lease = {
                propertyId: leaseData.propertyId,
                tenantId: leaseData.tenantId,
                landlordId: leaseData.landlordId,
                startDate: leaseData.startDate,
                endDate: leaseData.endDate,
                monthlyRent: leaseData.monthlyRent,
                securityDeposit: leaseData.securityDeposit || 0,
                status: leaseData.status || 'active',
                terms: leaseData.terms || '',
                paymentDueDay: leaseData.paymentDueDay || 1,
                lateFeesPolicy: leaseData.lateFeesPolicy || '',
                moveInDate: leaseData.moveInDate || null,
                moveOutDate: leaseData.moveOutDate || null,
                documents: leaseData.documents || [],
                notes: leaseData.notes || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            return await this.firestore.create(this.collection, lease);
        } catch (error) {
            console.error('Error creating lease:', error);
            throw error;
        }
    }

    /**
     * Get lease by ID
     */
    async getLeaseById(leaseId) {
        try {
            return await this.firestore.getById(this.collection, leaseId);
        } catch (error) {
            console.error('Error getting lease by ID:', error);
            throw error;
        }
    }

    /**
     * Get all leases
     */
    async getAllLeases() {
        try {
            return await this.firestore.getAll(this.collection);
        } catch (error) {
            console.error('Error getting all leases:', error);
            throw error;
        }
    }

    /**
     * Get leases by tenant ID
     */
    async getLeasesByTenant(tenantId) {
        try {
            return await this.firestore.query(this.collection, [
                ['tenantId', '==', tenantId]
            ]);
        } catch (error) {
            console.error('Error getting leases by tenant:', error);
            throw error;
        }
    }

    /**
     * Get leases by landlord ID
     */
    async getLeasesByLandlord(landlordId) {
        try {
            return await this.firestore.query(this.collection, [
                ['landlordId', '==', landlordId]
            ]);
        } catch (error) {
            console.error('Error getting leases by landlord:', error);
            throw error;
        }
    }

    /**
     * Get leases by property ID
     */
    async getLeasesByProperty(propertyId) {
        try {
            return await this.firestore.query(this.collection, [
                ['propertyId', '==', propertyId]
            ]);
        } catch (error) {
            console.error('Error getting leases by property:', error);
            throw error;
        }
    }

    /**
     * Get active leases
     */
    async getActiveLeases() {
        try {
            return await this.firestore.query(this.collection, [
                ['status', '==', 'active']
            ]);
        } catch (error) {
            console.error('Error getting active leases:', error);
            throw error;
        }
    }

    /**
     * Update lease
     */
    async updateLease(leaseId, updateData) {
        try {
            // Remove id from update data to prevent overwriting
            const { id: _, ...dataToUpdate } = updateData;
            
            return await this.firestore.update(this.collection, leaseId, dataToUpdate);
        } catch (error) {
            console.error('Error updating lease:', error);
            throw error;
        }
    }

    /**
     * Update lease status
     */
    async updateLeaseStatus(leaseId, status) {
        try {
            const updateData = { status };
            
            // If terminating lease, add moveOutDate
            if (status === 'terminated' || status === 'expired') {
                updateData.moveOutDate = new Date().toISOString();
            }
            
            return await this.firestore.update(this.collection, leaseId, updateData);
        } catch (error) {
            console.error('Error updating lease status:', error);
            throw error;
        }
    }

    /**
     * Delete lease
     */
    async deleteLease(leaseId) {
        try {
            return await this.firestore.delete(this.collection, leaseId);
        } catch (error) {
            console.error('Error deleting lease:', error);
            throw error;
        }
    }

    /**
     * Get lease with property and tenant details (joined query simulation)
     */
    async getLeaseWithDetails(leaseId) {
        try {
            const lease = await this.getLeaseById(leaseId);
            if (!lease) return null;

            // Fetch related data in parallel
            const [property, tenant, landlord] = await Promise.all([
                this.firestore.getById('properties', lease.propertyId),
                this.firestore.getById('users', lease.tenantId),
                this.firestore.getById('users', lease.landlordId)
            ]);

            return {
                ...lease,
                property,
                tenant,
                landlord
            };
        } catch (error) {
            console.error('Error getting lease with details:', error);
            throw error;
        }
    }

    /**
     * Get expiring leases (within X days)
     */
    async getExpiringLeases(daysFromNow = 30) {
        try {
            const activeLeases = await this.getActiveLeases();
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + daysFromNow);

            return activeLeases.filter(lease => {
                const endDate = new Date(lease.endDate);
                return endDate <= targetDate;
            });
        } catch (error) {
            console.error('Error getting expiring leases:', error);
            throw error;
        }
    }
}

// Export singleton instance
let leaseServiceInstance = null;

const getLeaseService = () => {
    if (!leaseServiceInstance) {
        leaseServiceInstance = new LeaseService();
    }
    return leaseServiceInstance;
};

module.exports = {
    LeaseService,
    getLeaseService
};
