const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');
const { admin } = require('../config/firebase');

// ✅ Define once, use everywhere
const ALLOWED_COLLECTIONS = new Set([
  'users',
  'properties',
  'leases',
  'maintenance',
  'notifications',
  'payments',
]);

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Admin role required' });
  }
  next();
}

async function readCollection(name) {
  const snap = await admin.firestore().collection(name).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * GET /api/admin/overview
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
 */
router.get('/collection/:name', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const name = req.params.name;

    if (!ALLOWED_COLLECTIONS.has(name)) {
      return res.status(400).json({ status: 'error', message: 'Invalid collection name' });
    }

    const rows = await readCollection(name);
    return res.json({ status: 'success', data: rows });
  } catch (error) {
    console.error('[Admin collection] error:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

/**
 * POST /api/admin/collection/:name
 * Creates a new document (auto-id)
 */
router.post('/collection/:name', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const name = req.params.name;

    if (!ALLOWED_COLLECTIONS.has(name)) {
      return res.status(400).json({ status: 'error', message: 'Invalid collection name' });
    }

    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ status: 'error', message: 'JSON body is required' });
    }

    const now = new Date().toISOString();

    const doc = {
      ...payload,
      createdAt: payload.createdAt || now, // keep if caller sent it
      updatedAt: now,
      updatedBy: req.user.email || req.user.userId,
    };

    const ref = await admin.firestore().collection(name).add(doc);

    return res.status(201).json({
      status: 'success',
      data: { id: ref.id, ...doc },
    });
  } catch (error) {
    console.error('[Admin create] error:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

/**
 * PATCH /api/admin/collection/:name/:id
 * Updates fields on a document (merge)
 */
router.patch('/collection/:name/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const name = req.params.name;
    const id = req.params.id;

    if (!ALLOWED_COLLECTIONS.has(name)) {
      return res.status(400).json({ status: 'error', message: 'Invalid collection name' });
    }
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Document id required' });
    }

    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ status: 'error', message: 'JSON body is required' });
    }

    // Don't allow overwriting id fields
    const { id: _ignoreId, ...rest } = payload;

    const now = new Date().toISOString();
    const updateDoc = {
      ...rest,
      updatedAt: now,
      updatedBy: req.user.email || req.user.userId,
    };

    const ref = admin.firestore().collection(name).doc(id);
    await ref.set(updateDoc, { merge: true });

    const snap = await ref.get();
    const updated = snap.exists ? { id: snap.id, ...snap.data() } : { id, ...updateDoc };

    return res.json({ status: 'success', data: updated });
  } catch (error) {
    console.error('[Admin patch] error:', error);
    return res.status(500).json({ status: 'error', message: 'Server error', details: error.message });
  }
});

/**
 * DELETE /api/admin/collection/:name/:id
 */
router.delete('/collection/:name/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const name = req.params.name;
    const id = req.params.id;

    if (!ALLOWED_COLLECTIONS.has(name)) {
      return res.status(400).json({ status: 'error', message: 'Invalid collection name' });
    }
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Document id required' });
    }

    await admin.firestore().collection(name).doc(id).delete();

    return res.json({ status: 'success', message: 'Deleted' });
  } catch (error) {
    console.error('[Admin delete] error:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

module.exports = router;
