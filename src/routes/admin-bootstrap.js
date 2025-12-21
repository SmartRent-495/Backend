const express = require('express');
const router = express.Router();

const { admin } = require('../config/firebase');
const { getUserService } = require('../services/users.service');

router.post('/create-admin', async (req, res) => {
  try {
    const secret = req.header('x-admin-bootstrap-secret');
    if (!secret || secret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
      return res.status(403).json({ status: 'error', message: 'Invalid bootstrap secret' });
    }

    const { email, password, adminId, displayName } = req.body;

    if (!email || !password || !adminId) {
      return res.status(400).json({
        status: 'error',
        message: 'email, password, adminId are required'
      });
    }

    // 1) Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: displayName || 'Admin User',
    });

    // 2) Create Firestore user doc
    const userService = getUserService();
    const userData = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      role: 'admin',
      adminId,
      phoneNumber: '',
      createdAt: new Date().toISOString(),
    };

    await userService.createUser(userRecord.uid, userData);

    return res.status(201).json({
      status: 'success',
      message: 'Admin created',
      data: { uid: userRecord.uid, email: userRecord.email, admin_id: adminId }
    });
  } catch (error) {
    console.error('[create-admin] error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error'
    });
  }
});

module.exports = router;
