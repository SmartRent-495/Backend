const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getApplicationService } = require('../services/applications.service');
const { getLeaseService } = require('../services/leases.service');
const { getPropertyService } = require('../services/properties.service');
const { getUserService } = require('../services/users.service');
const { getNotificationService } = require('../services/notifications.service');

// TENANT: Create new application
router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.userId;
    const { propertyId, message } = req.body;

    if (!propertyId) {
      return res.status(400).json({ error: 'Property ID is required' });
    }

    const applicationService = getApplicationService();
    const propertyService = getPropertyService();
    const userService = getUserService();

    // Check if property exists
    const property = await propertyService.getPropertyById(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Check if property is available
    if (property.status !== 'available') {
      return res.status(400).json({ error: 'Property is not available for rent' });
    }

    // Check if tenant already applied
    const hasExisting = await applicationService.hasExistingApplication(tenantId, propertyId);
    if (hasExisting) {
      return res.status(400).json({ error: 'You already have a pending or approved application for this property' });
    }

    // Get tenant info
    const tenant = await userService.getUserById(tenantId);

    // Create application
    const application = await applicationService.create({
      tenantId,
      landlordId: property.landlordId,
      propertyId,
      message: message || '',
      tenantName: tenant.displayName || tenant.email,
      tenantEmail: tenant.email || '',
      tenantPhone: tenant.phoneNumber || '',
      propertyTitle: property.title || property.address,
      propertyAddress: property.address || ''
    });

    try {
      const notificationService = getNotificationService();
      await notificationService.create({
        userId: property.landlordId,
        type: 'application',
        title: 'New Rental Application',
        message: `${tenant.displayName || tenant.email} applied to rent ${property.title || property.address}`,
        relatedId: application.id,
        relatedType: 'application'
      });
    } catch (notifErr) {
      console.error('Failed to send application notification:', notifErr.message);
    }

    console.log(`✅ Application created: ${application.id} for property ${propertyId}`);

    res.status(201).json({ application });
  } catch (err) {
    console.error('❌ Create application error:', err);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// TENANT: Get their applications
router.get('/tenant', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.userId;
    const applicationService = getApplicationService();

    const applications = await applicationService.getByTenant(tenantId);

    res.json({ applications });
  } catch (err) {
    console.error('❌ Get tenant applications error:', err);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

// LANDLORD: Get applications for their properties
router.get('/landlord', authenticateToken, async (req, res) => {
  try {
    const landlordId = req.user.userId;
    console.log(`📋 [GET /applications/landlord] Landlord ID: ${landlordId}`);
    
    const applicationService = getApplicationService();

    const applications = await applicationService.getByLandlord(landlordId);
    
    console.log(`📋 [GET /applications/landlord] Found ${applications.length} applications`);
    if (applications.length > 0) {
      console.log(`📋 First application:`, JSON.stringify(applications[0], null, 2));
    }

    res.json({ applications });
  } catch (err) {
    console.error('❌ Get landlord applications error:', err);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

// LANDLORD: Approve application (creates lease automatically)
router.post('/:applicationId/approve', authenticateToken, async (req, res) => {
  try {
    const landlordId = req.user.userId;
    const { applicationId } = req.params;
    const { startDate, endDate, monthlyRent, depositAmount, terms } = req.body;

    if (!startDate || !endDate || !monthlyRent) {
      return res.status(400).json({ error: 'Start date, end date, and monthly rent are required' });
    }

    const applicationService = getApplicationService();
    const leaseService = getLeaseService();
    const notificationService = getNotificationService();

    // Get application
    const application = await applicationService.getById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Verify landlord owns this application
    if (application.landlordId !== landlordId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if already processed
    if (application.status !== 'pending') {
      return res.status(400).json({ error: `Application already ${application.status}` });
    }

    // Create lease
    const lease = await leaseService.createLease({
      tenantId: application.tenantId,
      landlordId: application.landlordId,
      propertyId: application.propertyId,
      startDate,
      endDate,
      monthlyRent: parseFloat(monthlyRent),
      depositAmount: parseFloat(depositAmount || 0),
      status: 'active',
      terms: terms || '',
      tenantName: application.tenantName,
      propertyTitle: application.propertyTitle,
      propertyAddress: application.propertyAddress
    });

    // Update application status
    await applicationService.updateStatus(applicationId, 'approved', {
      leaseId: lease.id
    });

    // Notify tenant
    await notificationService.create({
      userId: application.tenantId,
      type: 'application',
      title: 'Application Approved! 🎉',
      message: `Your application for ${application.propertyTitle} has been approved! Your lease is now active.`,
      relatedId: lease.id,
      relatedType: 'lease'
    });

    console.log(`✅ Application ${applicationId} approved, lease ${lease.id} created`);

    res.json({ 
      message: 'Application approved and lease created',
      application: { ...application, status: 'approved', leaseId: lease.id },
      lease 
    });
  } catch (err) {
    console.error('❌ Approve application error:', err);
    res.status(500).json({ error: 'Failed to approve application' });
  }
});

// LANDLORD: Reject application
router.post('/:applicationId/reject', authenticateToken, async (req, res) => {
  try {
    const landlordId = req.user.userId;
    const { applicationId } = req.params;
    const { reason } = req.body;

    const applicationService = getApplicationService();
    const notificationService = getNotificationService();

    // Get application
    const application = await applicationService.getById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Verify landlord owns this application
    if (application.landlordId !== landlordId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if already processed
    if (application.status !== 'pending') {
      return res.status(400).json({ error: `Application already ${application.status}` });
    }

    // Update application status
    await applicationService.updateStatus(applicationId, 'rejected', {
      rejectionReason: reason || ''
    });

    // Notify tenant
    await notificationService.create({
      userId: application.tenantId,
      type: 'application',
      title: 'Application Update',
      message: `Your application for ${application.propertyTitle} has been reviewed.`,
      relatedId: applicationId,
      relatedType: 'application'
    });

    console.log(`✅ Application ${applicationId} rejected`);

    res.json({ message: 'Application rejected' });
  } catch (err) {
    console.error('❌ Reject application error:', err);
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

// Get single application (tenant or landlord)
router.get('/:applicationId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { applicationId } = req.params;

    const applicationService = getApplicationService();
    const application = await applicationService.getById(applicationId);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Verify user is tenant or landlord
    if (application.tenantId !== userId && application.landlordId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ application });
  } catch (err) {
    console.error('❌ Get application error:', err);
    res.status(500).json({ error: 'Failed to get application' });
  }
});

module.exports = router;
