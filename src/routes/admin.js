const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');
const { admin } = require('../config/firebase');

// Helper: ensure admin role
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Admin role required' });
  }
  next();
}

// Helper: read a whole collection
async function readCollection(name) {
  const snap = await admin.firestore().collection(name).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * GET /api/admin/overview
 * Returns all major data for admin dashboard.
 */
router.get('/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await readCollection('users');
    const properties = await readCollection('properties');
    const leases = await readCollection('leases');
    const maintenance = await readCollection('maintenance');
    const notifications = await readCollection('notifications');
    const payments = await readCollection('payments');


    const landlords = users.filter((u) => u.role === 'landlord');
    const tenants = users.filter((u) => u.role === 'tenant');
    const admins = users.filter((u) => u.role === 'admin');

    return res.json({
      status: 'success',
      data: {
        admins,
        landlords,
        tenants,
        users,
        properties,
        leases,
        maintenance,
        notifications,
        payments,
      },
    });
  } catch (error) {
    console.error('[Admin overview] error:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

/**
 * GET /api/admin/collection/:name
 * Example: /api/admin/collection/users
 */
router.get('/collection/:name', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const name = req.params.name;

    const allowed = new Set(['users', 'properties', 'leases', 'maintenance', 'notifications', 'payments']);
    if (!allowed.has(name)) {
      return res.status(400).json({ status: 'error', message: 'Invalid collection name' });
    }

    const rows = await readCollection(name);
    return res.json({ status: 'success', data: rows });
  } catch (error) {
    console.error('[Admin collection] error:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

module.exports = router;
