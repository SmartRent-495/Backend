const express = require('express');
const router = express.Router();
const { authenticateToken, requireLandlord } = require('../middleware/auth');
const { admin } = require('../config/firebase');

// GET /api/leases/tenant - Get tenant's leases (convenience endpoint)
router.get('/tenant', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const db = admin.firestore();
    
    console.log(`[GET /leases/tenant] User: ${userId}`);
    
    const snapshot = await db.collection('leases')
      .where('tenantId', '==', userId)
      .get();
    
    if (snapshot.empty) {
      return res.json({ leases: [] });
    }
    
    const leases = [];
    
    for (const doc of snapshot.docs) {
      const leaseData = doc.data();
      
      // Get property details
      let propertyData = null;
      try {
        const propertyDoc = await db.collection('properties').doc(leaseData.propertyId).get();
        if (propertyDoc.exists) {
          propertyData = propertyDoc.data();
        }
      } catch (err) {
        console.error('Error fetching property:', err);
      }
      
      leases.push({
        id: doc.id,
        ...leaseData,
        propertyTitle: propertyData?.title,
        propertyAddress: propertyData?.address,
        propertyCity: propertyData?.city,
      });
    }
    
    res.json({ leases });
  } catch (error) {
    console.error('[GET /leases/tenant] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch leases',
      details: error.message
    });
  }
});

// GET /api/leases - Get all leases for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const db = admin.firestore();
    
    console.log(`[GET /leases] User: ${userId}, Role: ${role}`);
    
    let leasesQuery;
    
    // Landlords see their own leases
    if (role === 'landlord') {
      leasesQuery = db.collection('leases').where('landlordId', '==', userId);
    } 
    // Tenants see only their leases
    else if (role === 'tenant') {
      leasesQuery = db.collection('leases').where('tenantId', '==', userId);
    }
    // Admins see all
    else {
      leasesQuery = db.collection('leases');
    }
    
    const snapshot = await leasesQuery.get();
    
    if (snapshot.empty) {
      return res.json({
        status: 'success',
        data: []
      });
    }
    
    const leases = [];
    
    // Enrich leases with property and tenant data
    for (const doc of snapshot.docs) {
      const leaseData = doc.data();
      
      // Get property details
      let propertyData = null;
      try {
        const propertyDoc = await db.collection('properties').doc(leaseData.propertyId).get();
        if (propertyDoc.exists) {
          propertyData = propertyDoc.data();
        }
      } catch (err) {
        console.error('Error fetching property:', err);
      }
      
      // Get tenant details
      let tenantData = null;
      try {
        const tenantDoc = await db.collection('users').doc(leaseData.tenantId).get();
        if (tenantDoc.exists) {
          tenantData = tenantDoc.data();
        }
      } catch (err) {
        console.error('Error fetching tenant:', err);
      }
      
      leases.push({
        id: doc.id,
        ...leaseData,
        // Property details
        propertyTitle: propertyData?.title,
        propertyAddress: propertyData?.address,
        propertyCity: propertyData?.city,
        // Tenant details
        tenantName: tenantData?.displayName,
        tenantEmail: tenantData?.email,
        tenantPhone: tenantData?.phoneNumber
      });
    }
    
    res.json({
      status: 'success',
      data: leases
    });
  } catch (error) {
    console.error('[GET /leases] Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch leases',
      details: error.message
    });
  }
});

// POST /api/leases - Create new lease
router.post('/', authenticateToken, requireLandlord, async (req, res) => {
  try {
    const landlordId = req.user.userId;
    const {
      property_id,
      tenant_id,
      start_date,
      end_date,
      monthly_rent,
      security_deposit,
      utilities_cost,
      payment_due_day,
      status,
      notes
    } = req.body;

    console.log('[POST /leases] Creating lease:', {
      landlordId,
      property_id,
      property_id_type: typeof property_id,
      tenant_id,
      start_date,
      end_date
    });

    // Validate property_id is not empty
    if (!property_id || property_id === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Property ID is required'
      });
    }

    const db = admin.firestore();

    // Convert to string if needed
    const propertyIdString = String(property_id);
    
    console.log('[POST /leases] Looking for property with ID:', propertyIdString);

    // Verify property exists and belongs to landlord in Firestore
    const propertyDoc = await db.collection('properties').doc(propertyIdString).get();
    
    if (!propertyDoc.exists) {
      console.error('[POST /leases] Property not found in Firestore with ID:', propertyIdString);
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }

    const propertyData = propertyDoc.data();
    
    if (propertyData.landlordId !== landlordId) {
      console.error('[POST /leases] Property does not belong to landlord');
      return res.status(403).json({
        status: 'error',
        message: 'You do not own this property'
      });
    }

    // Verify tenant exists in Firestore
    const tenantDoc = await db.collection('users').doc(tenant_id).get();
    
    if (!tenantDoc.exists) {
      console.error('[POST /leases] Tenant not found');
      return res.status(404).json({
        status: 'error',
        message: 'Tenant not found'
      });
    }

    const tenantData = tenantDoc.data();
    
    if (tenantData.role !== 'tenant') {
      console.error('[POST /leases] User is not a tenant');
      return res.status(400).json({
        status: 'error',
        message: 'Selected user is not a tenant'
      });
    }

    // Verify tenant belongs to this landlord
    if (tenantData.landlordId !== landlordId) {
      console.error('[POST /leases] Tenant does not belong to this landlord');
      return res.status(403).json({
        status: 'error',
        message: 'This tenant is not registered with you'
      });
    }

    // Create the lease in Firestore
    const leaseData = {
      propertyId: propertyIdString,
      tenantId: tenant_id,
      landlordId: landlordId,
      startDate: start_date,
      endDate: end_date,
      monthlyRent: parseFloat(monthly_rent),
      securityDeposit: parseFloat(security_deposit),
      utilitiesCost: parseFloat(utilities_cost) || 0,
      paymentDueDay: parseInt(payment_due_day),
      status: status || 'pending',
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const leaseRef = await db.collection('leases').add(leaseData);
    
    console.log('[POST /leases] ✅ Lease created with ID:', leaseRef.id);

    // Return the created lease with enriched data
    res.status(201).json({
      status: 'success',
      message: 'Lease created successfully',
      data: {
        id: leaseRef.id,
        ...leaseData,
        // Add property details
        propertyTitle: propertyData.title,
        propertyAddress: propertyData.address,
        // Add tenant details
        tenantName: tenantData.displayName,
        tenantEmail: tenantData.email
      }
    });
  } catch (error) {
    console.error('[POST /leases] ❌ Error creating lease:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create lease',
      details: error.message
    });
  }
});

// GET /api/leases/:id - Get a specific lease by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    const db = admin.firestore();
    
    console.log(`[GET /leases/:id] User: ${userId}, Role: ${role}, Lease ID: ${id}`);
    
    const leaseDoc = await db.collection('leases').doc(id).get();
    
    if (!leaseDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Lease not found'
      });
    }
    
    const leaseData = leaseDoc.data();
    
    // Check authorization - user must be tenant, landlord, or admin
    const isAuthorized = 
      role === 'admin' ||
      leaseData.tenantId === userId ||
      leaseData.landlordId === userId;
    
    if (!isAuthorized) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }
    
    // Get property details
    let propertyData = null;
    try {
      const propertyDoc = await db.collection('properties').doc(leaseData.propertyId).get();
      if (propertyDoc.exists) {
        propertyData = propertyDoc.data();
      }
    } catch (err) {
      console.error('Error fetching property:', err);
    }
    
    // Get tenant details
    let tenantData = null;
    try {
      const tenantDoc = await db.collection('users').doc(leaseData.tenantId).get();
      if (tenantDoc.exists) {
        tenantData = tenantDoc.data();
      }
    } catch (err) {
      console.error('Error fetching tenant:', err);
    }
    
    res.json({
      status: 'success',
      data: {
        id: leaseDoc.id,
        ...leaseData,
        // Property details
        propertyTitle: propertyData?.title,
        propertyAddress: propertyData?.address,
        propertyCity: propertyData?.city,
        // Tenant details
        tenantName: tenantData?.displayName,
        tenantEmail: tenantData?.email,
        tenantPhone: tenantData?.phoneNumber
      }
    });
  } catch (error) {
    console.error('[GET /leases/:id] Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch lease',
      details: error.message
    });
  }
});

// PATCH /api/leases/:id/status - Update lease status (tenant accepts/rejects)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { userId, role } = req.user;
    
    console.log(`[PATCH /leases/:id/status] User ${userId} updating lease ${id} to ${status}`);
    
    if (!status || !['active', 'terminated'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status. Must be "active" or "terminated"'
      });
    }
    
    const db = admin.firestore();
    const leaseDoc = await db.collection('leases').doc(id).get();
    
    if (!leaseDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Lease not found'
      });
    }
    
    const leaseData = leaseDoc.data();
    
    // Tenants can only update their own leases
    if (role === 'tenant' && leaseData.tenantId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }
    
    // Landlords can only update their own leases
    if (role === 'landlord' && leaseData.landlordId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }
    
    // Update the lease status
    await db.collection('leases').doc(id).update({
      status: status,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`[PATCH /leases/:id/status] ✅ Lease ${id} status updated to ${status}`);
    
    // Get updated lease
    const updatedDoc = await db.collection('leases').doc(id).get();
    
    res.json({
      status: 'success',
      message: `Lease ${status === 'active' ? 'accepted' : 'terminated'} successfully`,
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('[PATCH /leases/:id/status] Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update lease status',
      details: error.message
    });
  }
});

module.exports = router;