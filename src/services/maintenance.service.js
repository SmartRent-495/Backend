/**
 * Maintenance Service - Firestore Operations
 * 
 * Handles all maintenance request-related database operations using Firestore
 */

const { getFirestoreService } = require('./firestore');

class MaintenanceService {
    constructor() {
        this.firestore = getFirestoreService();
        this.collection = 'maintenance';
    }

    /**
     * Create a new maintenance request
     */
    async createMaintenanceRequest(requestData) {
        try {
            const request = {
                propertyId: requestData.propertyId,
                tenantId: requestData.tenantId,
                landlordId: requestData.landlordId,
                title: requestData.title,
                description: requestData.description,
                category: requestData.category || 'general',
                priority: requestData.priority || 'medium',
                status: requestData.status || 'pending',
                images: requestData.images || [],
                scheduledDate: requestData.scheduledDate || null,
                completedDate: requestData.completedDate || null,
                assignedTo: requestData.assignedTo || null,
                estimatedCost: requestData.estimatedCost || 0,
                actualCost: requestData.actualCost || 0,
                notes: requestData.notes || '',
                technicianNotes: requestData.technicianNotes || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            return await this.firestore.create(this.collection, request);
        } catch (error) {
            console.error('Error creating maintenance request:', error);
            throw error;
        }
    }

    /**
     * Get maintenance request by ID
     */
    async getMaintenanceById(requestId) {
        try {
            return await this.firestore.getById(this.collection, requestId);
        } catch (error) {
            console.error('Error getting maintenance request by ID:', error);
            throw error;
        }
    }

    /**
     * Get all maintenance requests
     */
    async getAllMaintenanceRequests() {
        try {
            return await this.firestore.getAll(this.collection);
        } catch (error) {
            console.error('Error getting all maintenance requests:', error);
            throw error;
        }
    }

    /**
     * Get maintenance requests by tenant ID
     */
    async getMaintenanceByTenant(tenantId) {
        try {
            return await this.firestore.query(this.collection, [
                ['tenantId', '==', tenantId]
            ]);
        } catch (error) {
            console.error('Error getting maintenance requests by tenant:', error);
            throw error;
        }
    }

    /**
     * Get maintenance requests by landlord ID
     */
    async getMaintenanceByLandlord(landlordId) {
        try {
            return await this.firestore.query(this.collection, [
                ['landlordId', '==', landlordId]
            ]);
        } catch (error) {
            console.error('Error getting maintenance requests by landlord:', error);
            throw error;
        }
    }

    /**
     * Get maintenance requests by property ID
     */
    async getMaintenanceByProperty(propertyId) {
        try {
            return await this.firestore.query(this.collection, [
                ['propertyId', '==', propertyId]
            ]);
        } catch (error) {
            console.error('Error getting maintenance requests by property:', error);
            throw error;
        }
    }

    /**
     * Get maintenance requests by status
     */
    async getMaintenanceByStatus(status) {
        try {
            return await this.firestore.query(this.collection, [
                ['status', '==', status]
            ]);
        } catch (error) {
            console.error('Error getting maintenance requests by status:', error);
            throw error;
        }
    }

    /**
     * Get maintenance requests by priority
     */
    async getMaintenanceByPriority(priority) {
        try {
            return await this.firestore.query(this.collection, [
                ['priority', '==', priority]
            ]);
        } catch (error) {
            console.error('Error getting maintenance requests by priority:', error);
            throw error;
        }
    }

    /**
     * Update maintenance request
     */
    async updateMaintenanceRequest(requestId, updateData) {
        try {
            // Remove id from update data to prevent overwriting
            const { id: _, ...dataToUpdate } = updateData;
            
            return await this.firestore.update(this.collection, requestId, dataToUpdate);
        } catch (error) {
            console.error('Error updating maintenance request:', error);
            throw error;
        }
    }

    /**
     * Update maintenance status
     */
    async updateMaintenanceStatus(requestId, status) {
        try {
            const updateData = { status };
            
            // If completed, add completedDate
            if (status === 'completed') {
                updateData.completedDate = new Date().toISOString();
            }
            
            return await this.firestore.update(this.collection, requestId, updateData);
        } catch (error) {
            console.error('Error updating maintenance status:', error);
            throw error;
        }
    }

    /**
     * Assign maintenance request to technician
     */
    async assignMaintenanceRequest(requestId, technicianId, scheduledDate) {
        try {
            return await this.firestore.update(this.collection, requestId, {
                assignedTo: technicianId,
                scheduledDate: scheduledDate || new Date().toISOString(),
                status: 'in_progress'
            });
        } catch (error) {
            console.error('Error assigning maintenance request:', error);
            throw error;
        }
    }

    /**
     * Delete maintenance request
     */
    async deleteMaintenanceRequest(requestId) {
        try {
            return await this.firestore.delete(this.collection, requestId);
        } catch (error) {
            console.error('Error deleting maintenance request:', error);
            throw error;
        }
    }

    /**
     * Get maintenance request with property and tenant details
     */
    async getMaintenanceWithDetails(requestId) {
        try {
            const request = await this.getMaintenanceById(requestId);
            if (!request) return null;

            // Fetch related data in parallel
            const [property, tenant, landlord] = await Promise.all([
                this.firestore.getById('properties', request.propertyId),
                this.firestore.getById('users', request.tenantId),
                this.firestore.getById('users', request.landlordId)
            ]);

            return {
                ...request,
                property,
                tenant,
                landlord
            };
        } catch (error) {
            console.error('Error getting maintenance request with details:', error);
            throw error;
        }
    }

    /**
     * Get urgent maintenance requests (high priority + pending/in_progress)
     */
    async getUrgentMaintenanceRequests() {
        try {
            const highPriority = await this.getMaintenanceByPriority('high');
            
            // Filter for pending or in_progress status
            return highPriority.filter(req => 
                req.status === 'pending' || req.status === 'in_progress'
            );
        } catch (error) {
            console.error('Error getting urgent maintenance requests:', error);
            throw error;
        }
    }
}

// Export singleton instance
let maintenanceServiceInstance = null;

const getMaintenanceService = () => {
    if (!maintenanceServiceInstance) {
        maintenanceServiceInstance = new MaintenanceService();
    }
    return maintenanceServiceInstance;
};

module.exports = {
    MaintenanceService,
    getMaintenanceService
};
