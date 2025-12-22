const { getFirestoreService } = require('./firestore');

class ApplicationService {
    constructor() {
        this.firestore = getFirestoreService();
        this.collection = 'applications';
    }

    async create(data) {
        try {
            const application = {
                tenantId: data.tenantId,
                landlordId: data.landlordId,
                propertyId: data.propertyId,
                status: 'pending', // pending, approved, rejected
                message: data.message || '',
                tenantName: data.tenantName || '',
                tenantEmail: data.tenantEmail || '',
                tenantPhone: data.tenantPhone || '',
                propertyTitle: data.propertyTitle || '',
                propertyAddress: data.propertyAddress || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            return await this.firestore.create(this.collection, application);
        } catch (err) {
            console.error('Error creating application:', err);
            throw err;
        }
    }

    async getById(id) {
        try {
            return await this.firestore.getById(this.collection, id);
        } catch (err) {
            console.error('Error getting application:', err);
            throw err;
        }
    }

    async getByTenant(tenantId) {
        try {
            const applications = await this.firestore.query(this.collection, [
                ['tenantId', '==', tenantId]
            ]);

            // Sort by date desc
            applications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return applications;
        } catch (err) {
            console.error('Error getting tenant applications:', err);
            throw err;
        }
    }

    async getByLandlord(landlordId) {
        try {
            const applications = await this.firestore.query(this.collection, [
                ['landlordId', '==', landlordId]
            ]);

            // Sort by date desc
            applications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return applications;
        } catch (err) {
            console.error('Error getting landlord applications:', err);
            throw err;
        }
    }

    async getByProperty(propertyId) {
        try {
            const applications = await this.firestore.query(this.collection, [
                ['propertyId', '==', propertyId]
            ]);

            // Sort by date desc
            applications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return applications;
        } catch (err) {
            console.error('Error getting property applications:', err);
            throw err;
        }
    }

    async updateStatus(id, status, additionalData = {}) {
        try {
            const updateData = {
                status,
                updatedAt: new Date().toISOString(),
                ...additionalData
            };

            if (status === 'approved') {
                updateData.approvedAt = new Date().toISOString();
            } else if (status === 'rejected') {
                updateData.rejectedAt = new Date().toISOString();
            }

            return await this.firestore.update(this.collection, id, updateData);
        } catch (err) {
            console.error('Error updating application status:', err);
            throw err;
        }
    }

    async delete(id) {
        try {
            return await this.firestore.delete(this.collection, id);
        } catch (err) {
            console.error('Error deleting application:', err);
            throw err;
        }
    }

    // Check if tenant already applied to this property
    async hasExistingApplication(tenantId, propertyId) {
        try {
            const applications = await this.firestore.query(this.collection, [
                ['tenantId', '==', tenantId],
                ['propertyId', '==', propertyId],
                ['status', 'in', ['pending', 'approved']]
            ]);

            return applications.length > 0;
        } catch (err) {
            console.error('Error checking existing application:', err);
            throw err;
        }
    }
}

let applicationService;

function getApplicationService() {
    if (!applicationService) {
        applicationService = new ApplicationService();
    }
    return applicationService;
}

module.exports = { getApplicationService };
