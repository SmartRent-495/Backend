const express = require('express');
const router = express.Router();
const { authenticateToken, requireLandlord } = require('../middleware/auth');
const { admin } = require('../config/firebase');
const { getMaintenanceService } = require('../services/maintenance.service');
const maintenanceService = getMaintenanceService();

// GET /api/maintenance - Get all maintenance requests
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { property_id, status, priority } = req.query;
    
    console.log(`[GET /maintenance] User: ${userId}, Role: ${role}`);
    
    const db = admin.firestore();
    let query = db.collection('maintenance');
    
    // Filter by role
    if (role === 'landlord') {
      query = query.where('landlordId', '==', userId);
    } else if (role === 'tenant') {
      query = query.where('tenantId', '==', userId);
    }
    
    // Apply additional filters
    if (status) {
      query = query.where('status', '==', status);
    }
    if (priority) {
      query = query.where('priority', '==', priority);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      console.log(`[GET /maintenance] No requests found for user ${userId}`);
      return res.json({
        status: 'success',
        data: []
      });
    }
    
    const requests = [];
    
    // Enrich with property and tenant data
    for (const doc of snapshot.docs) {
      const requestData = doc.data();
      
      // Get property details
      let propertyData = null;
      if (requestData.propertyId) {
        try {
          const propertyDoc = await db.collection('properties').doc(requestData.propertyId).get();
          if (propertyDoc.exists) {
            propertyData = propertyDoc.data();
          }
        } catch (err) {
          console.error('Error fetching property:', err);
        }
      }
      
      // Get tenant details
      let tenantData = null;
      if (requestData.tenantId) {
        try {
          const tenantDoc = await db.collection('users').doc(requestData.tenantId).get();
          if (tenantDoc.exists) {
            tenantData = tenantDoc.data();
          }
        } catch (err) {
          console.error('Error fetching tenant:', err);
        }
      }
      
      requests.push({
        id: doc.id,
        ...requestData,
        property_title: propertyData?.title,
        property_address: propertyData?.address,
        tenant_name: tenantData?.displayName,
        tenant_email: tenantData?.email,
        tenant_phone: tenantData?.phoneNumber
      });
    }
    
    // Sort in JavaScript instead of Firestore
    requests.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
    
    // Filter by property_id client-side if needed
    let filteredRequests = requests;
    if (property_id) {
      filteredRequests = requests.filter(r => r.propertyId === property_id);
    }
    
    console.log(`[GET /maintenance] ✅ Returning ${filteredRequests.length} requests`);
    
    res.json({
      status: 'success',
      data: filteredRequests
    });
  } catch (error) {
    console.error('[GET /maintenance] Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch maintenance requests',
      details: error.message
    });
  }
});

// POST /api/maintenance - Create new maintenance request (tenant only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId, role } = req.user;
    
    if (role !== 'tenant') {
      return res.status(403).json({
        status: 'error',
        message: 'Only tenants can create maintenance requests'
      });
    }

    const {
      property_id,
      title,
      description,
      category,
      priority
    } = req.body;

    console.log('[POST /maintenance] Creating request:', {
      tenantId: userId,
      property_id,
      title
    });

    if (!property_id || !title || !description) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: property_id, title, description'
      });
    }

    // Get property to retrieve landlordId
    const db = admin.firestore();
    const propertyDoc = await db.collection('properties').doc(property_id).get();
    
    if (!propertyDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }
    
    const propertyData = propertyDoc.data();

    const requestData = {
      propertyId: property_id,
      tenantId: userId,
      landlordId: propertyData.landlordId,
      title,
      description,
      category: category || 'other',
      priority: priority || 'medium'
    };

    const request = await maintenanceService.createMaintenanceRequest(requestData);
    
    console.log('[POST /maintenance] ✅ Request created:', request.id);

    res.status(201).json({
      status: 'success',
      message: 'Maintenance request created successfully',
      data: request
    });
  } catch (error) {
    console.error('[POST /maintenance] ❌ Error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error.message.includes('do not have an active lease')) {
      return res.status(403).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error.message.includes('already have an open')) {
      return res.status(409).json({
        status: 'error',
        message: error.message
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to create maintenance request',
      details: error.message
    });
  }
});

// GET /api/maintenance/:id - Get maintenance request by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    
    const db = admin.firestore();
    const doc = await db.collection('maintenance').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Maintenance request not found'
      });
    }
    
    const requestData = doc.data();
    
    if (role === 'tenant' && requestData.tenantId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }
    if (role === 'landlord' && requestData.landlordId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }
    
    let propertyData = null;
    if (requestData.propertyId) {
      const propertyDoc = await db.collection('properties').doc(requestData.propertyId).get();
      if (propertyDoc.exists) {
        propertyData = propertyDoc.data();
      }
    }
    
    let tenantData = null;
    if (requestData.tenantId) {
      const tenantDoc = await db.collection('users').doc(requestData.tenantId).get();
      if (tenantDoc.exists) {
        tenantData = tenantDoc.data();
      }
    }
    
    res.json({
      status: 'success',
      data: {
        id: doc.id,
        ...requestData,
        property_title: propertyData?.title,
        property_address: propertyData?.address,
        tenant_name: tenantData?.displayName,
        tenant_email: tenantData?.email,
        tenant_phone: tenantData?.phoneNumber
      }
    });
  } catch (error) {
    console.error('[GET /maintenance/:id] Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch maintenance request',
      details: error.message
    });
  }
});

// PUT /api/maintenance/:id - Update maintenance request
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    const {
      status,
      contractor_name,
      contractor_contact,
      estimated_cost,
      actual_cost,
      notes,
      priority
    } = req.body;
    
    const db = admin.firestore();
    const docRef = db.collection('maintenance').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Maintenance request not found'
      });
    }
    
    const requestData = doc.data();
    
    if (role === 'landlord' && requestData.landlordId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }
    
    const updateData = {};
    
    if (status !== undefined) updateData.status = status;
    if (contractor_name !== undefined) updateData.contractorName = contractor_name;
    if (contractor_contact !== undefined) updateData.contractorContact = contractor_contact;
    if (estimated_cost !== undefined) updateData.estimatedCost = parseFloat(estimated_cost);
    if (actual_cost !== undefined) updateData.actualCost = parseFloat(actual_cost);
    if (notes !== undefined) updateData.notes = notes;
    if (priority !== undefined) updateData.priority = priority;
    
    const updatedRequest = await maintenanceService.updateMaintenanceRequest(id, updateData);
    
    console.log(`[PUT /maintenance/:id] ✅ Updated maintenance request: ${id}`);
    
    res.json({
      status: 'success',
      message: 'Maintenance request updated successfully',
      data: updatedRequest
    });
  } catch (error) {
    console.error('[PUT /maintenance/:id] Error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update maintenance request',
      details: error.message
    });
  }
});

module.exports = router;