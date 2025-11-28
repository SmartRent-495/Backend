const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { admin } = require('../config/firebase');

// GET /api/landlords/:landlordId/tenants - Get all tenants for a landlord
router.get('/:landlordId/tenants', authenticateToken, async (req, res) => {
  try {
    const { landlordId } = req.params;
    const currentUserId = req.user.userId;
    
    console.log('[GET /landlords/:id/tenants]', {
      requestedLandlordId: landlordId,
      currentUserId: currentUserId,
      userRole: req.user.role
    });
    
    // Make sure the requesting user is the landlord or admin
    if (currentUserId !== landlordId && req.user.role !== 'admin') {
      console.log('Unauthorized: User is not the landlord');
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to view these tenants'
      });
    }

    const db = admin.firestore();
    
    // Query users collection for tenants with this landlordId
    console.log('Querying Firestore for tenants with landlordId:', landlordId);
    
    const tenantsSnapshot = await db.collection('users')
      .where('role', '==', 'tenant')
      .where('landlordId', '==', landlordId)
      .get();
    
    if (tenantsSnapshot.empty) {
      console.log(`No tenants found for landlord: ${landlordId}`);
      return res.json({
        status: 'success',
        data: []
      });
    }

    const tenants = [];
    tenantsSnapshot.forEach(doc => {
      const tenantData = doc.data();
      console.log('Found tenant:', { id: doc.id, email: tenantData.email });
      
      tenants.push({
        id: doc.id,
        username: tenantData.displayName || tenantData.username || 'Unknown',
        email: tenantData.email,
        role: tenantData.role,
        first_name: tenantData.displayName?.split(' ')[0] || '',
        last_name: tenantData.displayName?.split(' ').slice(1).join(' ') || '',
        phone: tenantData.phoneNumber || tenantData.phone || '',
        avatar_url: tenantData.photoURL || '',
        created_at: tenantData.createdAt || new Date().toISOString(),
        name: tenantData.displayName || tenantData.username || 'Unknown'
      });
    });

    console.log(`✅ Returning ${tenants.length} tenants for landlord ${landlordId}`);

    res.json({
      status: 'success',
      data: tenants
    });
  } catch (error) {
    console.error('❌ Error fetching tenants for landlord:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch tenants',
      details: error.message
    });
  }
});

module.exports = router;