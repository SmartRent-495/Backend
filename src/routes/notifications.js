const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getNotificationService } = require('../services/notifications.service');

// Get all notifications for current user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const { is_read, type } = req.query;

        const filters = {};
        if (is_read !== undefined) {
            filters.isRead = is_read === 'true' || is_read === '1';
        }
        if (type) {
            filters.type = type;
        }

        const notificationService = getNotificationService();
        const notifications = await notificationService.getByUser(userId, filters);

        res.json({ data: notifications });
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Get unread count - MUST be before /:id route
router.get('/unread/count', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const notificationService = getNotificationService();
        const count = await notificationService.getUnreadCount(userId);
        res.json({ unreadCount: count });
    } catch (err) {
        console.error('Error counting unread notifications:', err);
        res.status(500).json({ error: 'Failed to count notifications' });
    }
});

// Get notification by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const { id } = req.params;
        
        const notificationService = getNotificationService();
        const notification = await notificationService.getByUser(userId);
        
        const found = notification.find(n => n.id === id);
        
        if (!found) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        res.json(found);
    } catch (err) {
        console.error('Error fetching notification:', err);
        res.status(500).json({ error: 'Failed to fetch notification' });
    }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const { id } = req.params;
        const notificationService = getNotificationService();
        await notificationService.markAsRead(id, userId);
        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        if (err.message === 'Not found') {
            return res.status(404).json({ error: 'Notification not found' });
        }
        console.error('Error marking notification as read:', err);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Mark all notifications as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const notificationService = getNotificationService();
        const count = await notificationService.markAllAsRead(userId);
        res.json({ 
            message: 'All notifications marked as read',
            updatedCount: count
        });
    } catch (err) {
        console.error('Error marking all notifications as read:', err);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const { id } = req.params;
        const notificationService = getNotificationService();
        await notificationService.delete(id, userId);
        res.json({ message: 'Notification deleted successfully' });
    } catch (err) {
        if (err.message === 'Not found') {
            return res.status(404).json({ error: 'Notification not found' });
        }
        console.error('Error deleting notification:', err);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

// Delete all read notifications
router.delete('/read/clear', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const notificationService = getNotificationService();
        
        const notifications = await notificationService.getByUser(userId, { isRead: true });
        let deletedCount = 0;
        
        for (const notification of notifications) {
            await notificationService.delete(notification.id, userId);
            deletedCount++;
        }
        
        res.json({ 
            message: 'Read notifications cleared',
            deletedCount
        });
    } catch (err) {
        console.error('Error clearing read notifications:', err);
        res.status(500).json({ error: 'Failed to clear notifications' });
    }
});

// Create notification (internal use - typically called by other routes)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { user_id, type, title, message, related_id, related_type } = req.body;

        if (!user_id || !type || !title || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const notificationService = getNotificationService();
        const notification = await notificationService.create({
            userId: user_id,
            type,
            title,
            message,
            relatedId: related_id,
            relatedType: related_type
        });

        res.status(201).json({
            message: 'Notification created successfully',
            notificationId: notification.id
        });
    } catch (err) {
        console.error('Error creating notification:', err);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

module.exports = router;
