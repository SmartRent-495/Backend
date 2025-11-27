//Handles all user-related database operations using Firestore

const { getFirestoreService } = require('./firestore');

class UserService {
    constructor() {
        this.firestore = getFirestoreService();
        this.collection = 'users';
    }

   
    async createUser(uid, userData) {
        try {
            const user = {
                uid,
                email: userData.email,
                displayName: userData.displayName || '',
                photoURL: userData.photoURL || '',
                role: userData.role || 'tenant',
                phoneNumber: userData.phoneNumber || '',
                address: userData.address || '',
                city: userData.city || '',
                state: userData.state || '',
                zipCode: userData.zipCode || '',
                country: userData.country || '',
                membershipStartDate: userData.membershipStartDate || null,
                membershipEndDate: userData.membershipEndDate || null,
                membershipType: userData.membershipType || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Add landlordId for tenants
            if (userData.landlordId) {
                user.landlordId = userData.landlordId;
            }

            await this.firestore.set(this.collection, uid, user, false);
            return user;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    
    //Get user by Firebase Auth UID
    async getUserById(uid) {
        try {
            return await this.firestore.getById(this.collection, uid);
        } catch (error) {
            console.error('Error getting user by ID:', error);
            throw error;
        }
    }

    // Get user by email
    async getUserByEmail(email) {
        try {
            const users = await this.firestore.query(this.collection, [
                ['email', '==', email]
            ]);
            
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            console.error('Error getting user by email:', error);
            throw error;
        }
    }

    //Update profile
    async updateUser(uid, updateData) {
        try {
            // Remove uid from update data to prevent overwriting
            const { uid: _, ...dataToUpdate } = updateData;
            
            return await this.firestore.update(this.collection, uid, dataToUpdate);
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    // Gte all admins
    async getAllUsers() {
        try {
            return await this.firestore.getAll(this.collection);
        } catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        }
    }

    // Get users by specifc roles
    async getUsersByRole(role) {
        try {
            return await this.firestore.query(this.collection, [
                ['role', '==', role]
            ]);
        } catch (error) {
            console.error('Error getting users by role:', error);
            throw error;
        }
    }

    //Delete user
    async deleteUser(uid) {
        try {
            return await this.firestore.delete(this.collection, uid);
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    // Update membership
    async updateMembership(uid, membershipData) {
        try {
            return await this.firestore.update(this.collection, uid, {
                membershipStartDate: membershipData.startDate,
                membershipEndDate: membershipData.endDate,
                membershipType: membershipData.type
            });
        } catch (error) {
            console.error('Error updating membership:', error);
            throw error;
        }
    }

   // Check if user exists
    async userExists(uid) {
        try {
            const user = await this.getUserById(uid);
            return user !== null;
        } catch (error) {
            console.error('Error checking user existence:', error);
            throw error;
        }
    }
}

// Export singleton instance
let userServiceInstance = null;

const getUserService = () => {
    if (!userServiceInstance) {
        userServiceInstance = new UserService();
    }
    return userServiceInstance;
};

module.exports = {
    UserService,
    getUserService
};
