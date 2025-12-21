const { getFirestoreService } = require('./firestore');

class NotificationService {
    constructor() {
        this.firestore = getFirestoreService();
        this.collection = 'notifications';
    }

    async create(data) {
        try {
            const notification = {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                relatedId: data.relatedId || null,
                relatedType: data.relatedType || null,
                isRead: false,
                createdAt: new Date().toISOString()
            };

            return await this.firestore.create(this.collection, notification);
        } catch (err) {
            console.error('Error creating notification:', err);
            throw err;
        }
    }

    async getByUser(userId, filters = {}) {
        try {
            let notifications = await this.firestore.query(this.collection, [
                ['userId', '==', userId]
            ]);

            // filter by read status if specified
            if (filters.isRead !== undefined) {
                notifications = notifications.filter(n => n.isRead === filters.isRead);
            }

            // filter by type
            if (filters.type) {
                notifications = notifications.filter(n => n.type === filters.type);
            }

            // sort by date desc
            notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return notifications;
        } catch (err) {
            console.error('Error getting notifications:', err);
            throw err;
        }
    }

    async markAsRead(notificationId, userId) {
        try {
            // verify ownership first
            const notification = await this.firestore.getById(this.collection, notificationId);
            if (!notification || notification.userId !== userId) {
                throw new Error('Not found');
            }

            await this.firestore.update(this.collection, notificationId, {
                isRead: true
            });

            return true;
        } catch (err) {
            console.error('Error marking notification as read:', err);
            throw err;
        }
    }

    async markAllAsRead(userId) {
        try {
            const notifications = await this.firestore.query(this.collection, [
                ['userId', '==', userId],
                ['isRead', '==', false]
            ]);

            const promises = notifications.map(n => 
                this.firestore.update(this.collection, n.id, { isRead: true })
            );

            await Promise.all(promises);
            return notifications.length;
        } catch (err) {
            console.error('Error marking all as read:', err);
            throw err;
        }
    }

    async delete(notificationId, userId) {
        try {
            const notification = await this.firestore.getById(this.collection, notificationId);
            if (!notification || notification.userId !== userId) {
                throw new Error('Not found');
            }

            await this.firestore.delete(this.collection, notificationId);
            return true;
        } catch (err) {
            console.error('Error deleting notification:', err);
            throw err;
        }
    }

    async getUnreadCount(userId) {
        try {
            const notifications = await this.firestore.query(this.collection, [
                ['userId', '==', userId],
                ['isRead', '==', false]
            ]);

            return notifications.length;
        } catch (err) {
            console.error('Error getting unread count:', err);
            return 0;
        }
    }
}

let notificationService;

function getNotificationService() {
    if (!notificationService) {
        notificationService = new NotificationService();
    }
    return notificationService;
}

module.exports = { getNotificationService };
