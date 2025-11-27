const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all notifications for current user
router.get('/', authenticateToken, (req, res) => {
    const { userId } = req.user;
    const { is_read, type, limit = 50 } = req.query;

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];

    // Filter by read status
    if (is_read !== undefined) {
        query += ' AND is_read = ?';
        params.push(is_read === 'true' || is_read === '1' ? 1 : 0);
    }

    // Filter by type
    if (type) {
        query += ' AND type = ?';
        params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    db.all(query, params, (err, notifications) => {
        if (err) {
            console.error('Error fetching notifications:', err);
            return res.status(500).json({ error: 'Failed to fetch notifications' });
        }

        res.json(notifications);
    });
});

// Get notification by ID
router.get('/:id', authenticateToken, (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;

    db.get(
        'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
        [id, userId],
        (err, notification) => {
            if (err) {
                console.error('Error fetching notification:', err);
                return res.status(500).json({ error: 'Failed to fetch notification' });
            }

            if (!notification) {
                return res.status(404).json({ error: 'Notification not found' });
            }

            res.json(notification);
        }
    );
});

// Get unread count
router.get('/unread/count', authenticateToken, (req, res) => {
    const { userId } = req.user;

    db.get(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
        [userId],
        (err, result) => {
            if (err) {
                console.error('Error counting unread notifications:', err);
                return res.status(500).json({ error: 'Failed to count notifications' });
            }

            res.json({ unreadCount: result.count });
        }
    );
});

// Mark notification as read
router.put('/:id/read', authenticateToken, (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;

    db.run(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
        [id, userId],
        function(err) {
            if (err) {
                console.error('Error marking notification as read:', err);
                return res.status(500).json({ error: 'Failed to update notification' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Notification not found' });
            }

            res.json({ message: 'Notification marked as read' });
        }
    );
});

// Mark all notifications as read
router.put('/mark-all/read', authenticateToken, (req, res) => {
    const { userId } = req.user;

    db.run(
        'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
        [userId],
        function(err) {
            if (err) {
                console.error('Error marking all notifications as read:', err);
                return res.status(500).json({ error: 'Failed to update notifications' });
            }

            res.json({ 
                message: 'All notifications marked as read',
                updatedCount: this.changes
            });
        }
    );
});

// Delete notification
router.delete('/:id', authenticateToken, (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;

    db.run(
        'DELETE FROM notifications WHERE id = ? AND user_id = ?',
        [id, userId],
        function(err) {
            if (err) {
                console.error('Error deleting notification:', err);
                return res.status(500).json({ error: 'Failed to delete notification' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Notification not found' });
            }

            res.json({ message: 'Notification deleted successfully' });
        }
    );
});

// Delete all read notifications
router.delete('/read/clear', authenticateToken, (req, res) => {
    const { userId } = req.user;

    db.run(
        'DELETE FROM notifications WHERE user_id = ? AND is_read = 1',
        [userId],
        function(err) {
            if (err) {
                console.error('Error clearing read notifications:', err);
                return res.status(500).json({ error: 'Failed to clear notifications' });
            }

            res.json({ 
                message: 'Read notifications cleared',
                deletedCount: this.changes
            });
        }
    );
});

// Create notification (internal use - typically called by other routes)
router.post('/', authenticateToken, (req, res) => {
    const { user_id, type, title, message, related_id, related_type } = req.body;

    // Validation
    if (!user_id || !type || !title || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const query = `
        INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [user_id, type, title, message, related_id || null, related_type || null], function(err) {
        if (err) {
            console.error('Error creating notification:', err);
            return res.status(500).json({ error: 'Failed to create notification' });
        }

        res.status(201).json({
            message: 'Notification created successfully',
            notificationId: this.lastID
        });
    });
});

module.exports = router;
