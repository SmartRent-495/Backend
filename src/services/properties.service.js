/**
 * Property Service - Firestore Operations
 * 
 * Handles all property-related database operations using Firestore
 */

const { getFirestoreService } = require('./firestore');

class PropertyService {
    constructor() {
        this.firestore = getFirestoreService();
        this.collection = 'properties';
    }

    /**
     * Create a new property
     */
    async createProperty(propertyData) {
        try {
            const property = {
                landlordId: propertyData.landlordId,
                title: propertyData.title,
                description: propertyData.description || '',
                address: propertyData.address,
                city: propertyData.city,
                state: propertyData.state,
                zipCode: propertyData.zipCode,
                country: propertyData.country || 'USA',
                propertyType: propertyData.propertyType || 'apartment',
                bedrooms: propertyData.bedrooms || 0,
                bathrooms: propertyData.bathrooms || 0,
                squareFeet: propertyData.squareFeet || 0,
                monthlyRent: propertyData.monthlyRent || 0,
                securityDeposit: propertyData.securityDeposit || 0,
                availableFrom: propertyData.availableFrom || new Date().toISOString(),
                status: propertyData.status || 'available',
                amenities: propertyData.amenities || [],
                images: propertyData.images || [],
                petPolicy: propertyData.petPolicy || 'no_pets',
                parkingSpaces: propertyData.parkingSpaces || 0,
                furnished: propertyData.furnished || false,
                utilitiesIncluded: propertyData.utilitiesIncluded || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            return await this.firestore.create(this.collection, property);
        } catch (error) {
            console.error('Error creating property:', error);
            throw error;
        }
    }

    /**
     * Get property by ID
     */
    async getPropertyById(propertyId) {
        try {
            return await this.firestore.getById(this.collection, propertyId);
        } catch (error) {
            console.error('Error getting property by ID:', error);
            throw error;
        }
    }

    /**
     * Get all properties
     */
    async getAllProperties() {
        try {
            return await this.firestore.getAll(this.collection);
        } catch (error) {
            console.error('Error getting all properties:', error);
            throw error;
        }
    }

    /**
     * Get properties by landlord ID
     */
    async getPropertiesByLandlord(landlordId) {
        try {
            return await this.firestore.query(this.collection, [
                ['landlordId', '==', landlordId]
            ]);
        } catch (error) {
            console.error('Error getting properties by landlord:', error);
            throw error;
        }
    }

    /**
     * Get available properties
     */
    async getAvailableProperties() {
        try {
            return await this.firestore.query(this.collection, [
                ['status', '==', 'available']
            ]);
        } catch (error) {
            console.error('Error getting available properties:', error);
            throw error;
        }
    }

    /**
     * Update property
     */
    async updateProperty(propertyId, updateData) {
        try {
            // Remove id from update data to prevent overwriting
            const { id: _, ...dataToUpdate } = updateData;
            
            return await this.firestore.update(this.collection, propertyId, dataToUpdate);
        } catch (error) {
            console.error('Error updating property:', error);
            throw error;
        }
    }

    /**
     * Update property status
     */
    async updatePropertyStatus(propertyId, status) {
        try {
            return await this.firestore.update(this.collection, propertyId, { status });
        } catch (error) {
            console.error('Error updating property status:', error);
            throw error;
        }
    }

    /**
     * Delete property
     */
    async deleteProperty(propertyId) {
        try {
            return await this.firestore.delete(this.collection, propertyId);
        } catch (error) {
            console.error('Error deleting property:', error);
            throw error;
        }
    }

    /**
     * Search properties by filters
     * @param {object} filters - Search criteria
     */
    async searchProperties(filters) {
        try {
            const queryFilters = [];

            if (filters.city) {
                queryFilters.push(['city', '==', filters.city]);
            }
            if (filters.state) {
                queryFilters.push(['state', '==', filters.state]);
            }
            if (filters.propertyType) {
                queryFilters.push(['propertyType', '==', filters.propertyType]);
            }
            if (filters.status) {
                queryFilters.push(['status', '==', filters.status]);
            }

            let results = await this.firestore.query(this.collection, queryFilters);

            // Client-side filtering for range queries (Firestore limitations)
            if (filters.minRent) {
                results = results.filter(p => p.monthlyRent >= parseFloat(filters.minRent));
            }
            if (filters.maxRent) {
                results = results.filter(p => p.monthlyRent <= parseFloat(filters.maxRent));
            }
            if (filters.minBedrooms) {
                results = results.filter(p => p.bedrooms >= parseInt(filters.minBedrooms));
            }
            if (filters.minBathrooms) {
                results = results.filter(p => p.bathrooms >= parseFloat(filters.minBathrooms));
            }

            return results;
        } catch (error) {
            console.error('Error searching properties:', error);
            throw error;
        }
    }
}

// Export singleton instance
let propertyServiceInstance = null;

const getPropertyService = () => {
    if (!propertyServiceInstance) {
        propertyServiceInstance = new PropertyService();
    }
    return propertyServiceInstance;
};

module.exports = {
    PropertyService,
    getPropertyService
};
