const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticateToken, authenticateFirebaseOnly } = require('../middleware/auth');
const { getUserService } = require('../services/users.service');

// Set up multer storage for avatars
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/avatars');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `user_${req.user.userId}${ext}`);
  }
});
const upload = multer({ storage: avatarStorage });

// ============================================================================
// NOTE: /register and /login routes below are LEGACY (SQLite-based) and NOT USED
// Frontend uses Firebase Auth + /firebase-register instead
// These routes are kept for backward compatibility but will be removed soon
// ============================================================================

// Register new user (with role support) - DEPRECATED, use Firebase Auth instead
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role, first_name, last_name, phone } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Username, email, and password are required'
            });
        }

        // Validate role
        const userRole = role && ['landlord', 'tenant'].includes(role) ? role : 'tenant';

        // Check if user already exists
        db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], async (err, user) => {
            if (err) {
                console.error('Database error in registration:', err);
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error'
                });
            }

            if (user) {
                return res.status(400).json({
                    status: 'error',
                    message: 'User already exists with this email or username'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            db.run(
                'INSERT INTO users (username, email, password, role, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [username, email, hashedPassword, userRole, first_name || null, last_name || null, phone || null],
                function(err) {
                    if (err) {
                        console.error('Error creating user:', err);
                        return res.status(500).json({
                            status: 'error',
                            message: 'Error creating user'
                        });
                    }

                    // Generate token
                    const token = jwt.sign(
                        { userId: this.lastID, username, role: userRole },
                        config.jwtSecret,
                        { expiresIn: '24h' }
                    );

                    res.status(201).json({
                        status: 'success',
                        data: {
                            token,
                            user: {
                                id: this.lastID,
                                username,
                                email,
                                role: userRole,
                                first_name,
                                last_name,
                                phone
                            }
                        }
                    });
                }
            );
        });
    } catch (error) {
      console.error('Exception in /register:', error);
      res.status(500).json({
          status: 'error',
          message: 'Server error'
      });
  }
});

// Firebase user registration - saves user to Firestore with correct role
// Uses Firebase-only auth (doesn't require user in DB yet)
// Firebase user registration - saves user to Firestore with correct role
router.post('/firebase-register', authenticateFirebaseOnly, async (req, res) => {
  try {
    const { username, first_name, last_name, phone, role, landlordCode } = req.body;

    const email = req.user.email;
    const firebaseUid = req.user.firebaseUid;

    console.log('\n[Firebase Register] Registering user:', {
      email,
      firebaseUid,
      username,
      role,
      landlordCode
    });

    const userRole = ['landlord', 'tenant', 'admin'].includes(role) ? role : 'tenant';
    const userService = getUserService();

    let landlordId = null;

    // Tenant CAN provide a landlord (optional during signup)
    if (userRole === 'tenant' && landlordCode) {
      console.log('[Firebase Register] Validating landlord:', landlordCode);

      const landlord = await userService.getUserById(landlordCode).catch(() => null);

      if (!landlord || landlord.role !== 'landlord') {
        console.warn('[Firebase Register] Invalid landlord code provided:', landlordCode);
        // Don't block registration - just don't assign landlord
        landlordId = null;
      } else {
        landlordId = landlordCode;
      }
    }

    // Check if user exists
    const existingUser = await userService.getUserById(firebaseUid).catch(() => null);

    if (!existingUser) {
      console.log('[Firebase Register] Creating new Firestore user');

      const userData = {
        uid: firebaseUid,
        email,
        displayName: username || first_name || email.split('@')[0],
        role: userRole,
        phoneNumber: phone || '',
        createdAt: new Date().toISOString()
      };

      if (userRole === 'tenant' && landlordId) {
        userData.landlordId = landlordId;
      }

      const newUser = await userService.createUser(firebaseUid, userData);

      console.log('✅ New user created:', newUser.uid);

      return res.status(201).json({
        status: 'success',
        data: newUser
      });
    }

    // User exists → Update profile
    console.log('[Firebase Register] User exists — updating...');

    const updateData = {
      displayName: username || existingUser.displayName,
      role: userRole,
      phoneNumber: phone || existingUser.phoneNumber
    };

    if (userRole === 'tenant' && landlordId) {
      updateData.landlordId = landlordId;
    }

    const updatedUser = await userService.updateUser(firebaseUid, updateData);

    console.log('✅ User updated:', updatedUser.uid);

    return res.json({
      status: 'success',
      data: updatedUser
    });

  } catch (error) {
    console.error('❌ [Firebase Register] Exception:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Server error during registration',
      details: error.message,
      errorName: error.name
    });
  }
});


// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Email and password are required'
            });
        }

        // Find user
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                console.error('DB error in /login:', err);
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error'
                });
            }

            if (!user) {
                console.warn('Login failed: user not found for email', email);
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid credentials'
                });
            }

            // Check password
            try {
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    console.warn('Login failed: incorrect password for', user.email);
                    return res.status(401).json({
                        status: 'error',
                        message: 'Invalid credentials'
                    });
                }
            } catch (bcryptError) {
                console.error('Bcrypt error during password comparison:', bcryptError);
                return res.status(500).json({
                    status: 'error',
                    message: 'Password check error'
                });
            }

            // Generate token with role
            const token = jwt.sign(
                { userId: user.id, username: user.username, role: user.role },
                config.jwtSecret,
                { expiresIn: '24h' }
            );

            res.json({
                status: 'success',
                data: {
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        phone: user.phone,
                        avatar_url: user.avatar_url
                    }
                }
            });
        });
    } catch (error) {
      console.error('Exception in /login:', error);
      res.status(500).json({
          status: 'error',
          message: 'Server error'
      });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userService = getUserService();
    const user = await userService.getUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    
    // Format response to match frontend expectations
    res.json({ 
      status: 'success', 
      data: {
        id: user.uid,
        username: user.displayName,
        email: user.email,
        role: user.role,
        first_name: user.displayName?.split(' ')[0] || '',
        last_name: user.displayName?.split(' ').slice(1).join(' ') || '',
        phone: user.phoneNumber,
        avatar_url: user.photoURL,
        created_at: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error in /me:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// Update user profile
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { username, first_name, last_name, phone, email } = req.body;
    
    const updateData = {};
    
    if (username || first_name || last_name) {
      updateData.displayName = username || `${first_name || ''} ${last_name || ''}`.trim();
    }
    if (phone) updateData.phoneNumber = phone;
    if (email) updateData.email = email;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No fields to update' });
    }
    
    const userService = getUserService();
    await userService.updateUser(req.user.userId, updateData);
    
    res.json({ status: 'success', message: 'Profile updated' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ status: 'error', message: 'Server error', detail: error.message });
  }
});

// POST /api/auth/avatar - upload profile picture
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }
    
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    const userService = getUserService();
    
    await userService.updateUser(req.user.userId, {
      photoURL: avatarPath
    });
    
    res.json({ status: 'success', avatar: avatarPath });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update avatar' });
  }
});

// PATCH /api/auth/update-role - Update user role (for fixing mismatched roles)
router.patch('/update-role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role || !['landlord', 'tenant', 'admin'].includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid role. Must be: landlord, tenant, or admin'
      });
    }
    
    const userService = getUserService();
    await userService.updateUser(req.user.userId, { role });
    
    console.log(`✅ Updated user ${req.user.email} role to ${role}`);
    res.json({
      status: 'success',
      message: `Role updated to ${role}`,
      data: { role }
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update role'
    });
  }
});

module.exports = router; 