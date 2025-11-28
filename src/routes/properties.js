const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getPropertyService } = require('../services/properties.service');
const { getUserService } = require('../services/users.service');
const multer = require('multer');
const path = require('path');

// Configure multer for property images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/properties/');
    },
    filename: (req, file, cb) => {
        cb(null, `property-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|webp/;
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// Get all properties (with filters)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { city, property_type, min_rent, max_rent, status, landlord_id } = req.query;
        const { role, userId } = req.user;
        
        console.log(`[GET /properties] User: ${userId}, Role: ${role}`);
        
        const propertyService = getPropertyService();
        const userService = getUserService();
        
        let properties;
        
        // SECURITY: Landlords can only see their own properties
        if (role === 'landlord') {
            console.log(`[GET /properties] Filtering properties for landlord: ${userId}`);
            properties = await propertyService.getPropertiesByLandlord(userId);
        } 
        // TENANTS: Only see properties from their assigned landlord
        else if (role === 'tenant') {
            // Get tenant's landlordId
            const tenant = await userService.getUserById(userId);
            if (tenant && tenant.landlordId) {
                console.log(`[GET /properties] Filtering properties for tenant's landlord: ${tenant.landlordId}`);
                properties = await propertyService.getPropertiesByLandlord(tenant.landlordId);
            } else {
                console.log(`[GET /properties] Tenant has no assigned landlord`);
                properties = [];
            }
        }
        // If landlord_id is provided in query (for admins), filter by that landlord
        else if (landlord_id) {
            console.log(`[GET /properties] Filtering by landlord_id query param: ${landlord_id}`);
            properties = await propertyService.getPropertiesByLandlord(landlord_id);
        } 
        // Admins can see all properties
        else {
            console.log(`[GET /properties] Returning all properties for role: ${role}`);
            properties = await propertyService.getAllProperties();
        }
        
        // Apply additional filters
        const filters = {};
        if (city) filters.city = city;
        if (property_type) filters.propertyType = property_type;
        if (min_rent) filters.minRent = min_rent;
        if (max_rent) filters.maxRent = max_rent;
        if (status) filters.status = status;
        
        if (Object.keys(filters).length > 0) {
            properties = await propertyService.searchProperties(filters);
        }
        
        // Enrich properties with landlord details
        const enrichedProperties = await Promise.all(
            properties.map(async (property) => {
                try {
                    const landlord = await userService.getUserById(property.landlordId);
                    return {
                        ...property,
                        landlord_name: landlord?.displayName || '',
                        landlord_email: landlord?.email || '',
                        landlord_phone: landlord?.phoneNumber || '',
                        landlord_first_name: landlord?.displayName?.split(' ')[0] || '',
                        landlord_last_name: landlord?.displayName?.split(' ').slice(1).join(' ') || ''
                    };
                } catch (error) {
                    console.error('Error fetching landlord details:', error);
                    return property;
                }
            })
        );
        
        res.json(enrichedProperties);
    } catch (error) {
        console.error('Error fetching properties:', error);
        res.status(500).json({ error: 'Failed to fetch properties', details: error.message });
    }
});

// Get property by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const propertyService = getPropertyService();
        const userService = getUserService();
        
        const property = await propertyService.getPropertyById(id);
        
        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }
        
        // Enrich with landlord details
        const landlord = await userService.getUserById(property.landlordId);
        
        const enrichedProperty = {
            ...property,
            landlord_name: landlord?.displayName || '',
            landlord_email: landlord?.email || '',
            landlord_phone: landlord?.phoneNumber || '',
            landlord_first_name: landlord?.displayName?.split(' ')[0] || '',
            landlord_last_name: landlord?.displayName?.split(' ').slice(1).join(' ') || ''
        };
        
        res.json(enrichedProperty);
    } catch (error) {
        console.error('Error fetching property:', error);
        res.status(500).json({ error: 'Failed to fetch property', details: error.message });
    }
});

// Create new property (landlord only)
router.post('/', authenticateToken, upload.array('images', 10), async (req, res) => {
    try {
        const { role, userId } = req.user;

        if (role !== 'landlord') {
            return res.status(403).json({ error: 'Only landlords can create properties' });
        }

        const {
            title, description, address, city, state, zipCode,
            propertyType, bedrooms, bathrooms, squareFeet,
            monthlyRent, securityDeposit, utilitiesIncluded,
            petPolicy, parkingSpaces, amenities
        } = req.body;

        // Validation
        if (!title || !address || !city || !propertyType || !monthlyRent) {
            return res.status(400).json({ error: 'Missing required fields: title, address, city, propertyType, monthlyRent' });
        }

        // Handle uploaded images
        const imageUrls = req.files ? req.files.map(file => `/uploads/properties/${file.filename}`) : [];

        const propertyData = {
            landlordId: userId,
            title,
            description: description || '',
            address,
            city,
            state: state || '',
            zipCode: zipCode || '',
            propertyType,
            bedrooms: parseInt(bedrooms) || 0,
            bathrooms: parseFloat(bathrooms) || 0,
            squareFeet: parseFloat(squareFeet) || 0,
            monthlyRent: parseFloat(monthlyRent),
            securityDeposit: parseFloat(securityDeposit) || 0,
            utilitiesIncluded: Array.isArray(utilitiesIncluded) ? utilitiesIncluded : [],
            petPolicy: petPolicy || 'no_pets',
            parkingSpaces: parseInt(parkingSpaces) || 0,
            images: imageUrls,
            amenities: Array.isArray(amenities) ? amenities : (amenities ? JSON.parse(amenities) : []),
            status: 'available'
        };

        const propertyService = getPropertyService();
        const newProperty = await propertyService.createProperty(propertyData);

        res.status(201).json({
            message: 'Property created successfully',
            propertyId: newProperty.id,
            property: newProperty
        });
    } catch (error) {
        console.error('Error creating property:', error);
        res.status(500).json({ error: 'Failed to create property', details: error.message });
    }
});

// Update property (landlord only)
router.put('/:id', authenticateToken, upload.array('images', 10), async (req, res) => {
    try {
        const { role, userId } = req.user;
        const { id } = req.params;

        if (role !== 'landlord') {
            return res.status(403).json({ error: 'Only landlords can update properties' });
        }

        const propertyService = getPropertyService();
        
        // Verify the property belongs to this landlord
        const property = await propertyService.getPropertyById(id);
        
        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }
        
        if (property.landlordId !== userId) {
            return res.status(403).json({ error: 'Unauthorized - property does not belong to you' });
        }

        const {
            title, description, address, city, state, zipCode,
            propertyType, bedrooms, bathrooms, squareFeet,
            monthlyRent, securityDeposit, utilitiesIncluded,
            petPolicy, parkingSpaces, status, amenities
        } = req.body;

        // Handle new images
        let imageUrls = property.images || [];
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => `/uploads/properties/${file.filename}`);
            imageUrls = [...imageUrls, ...newImages];
        }

        const updateData = {};
        
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (address !== undefined) updateData.address = address;
        if (city !== undefined) updateData.city = city;
        if (state !== undefined) updateData.state = state;
        if (zipCode !== undefined) updateData.zipCode = zipCode;
        if (propertyType !== undefined) updateData.propertyType = propertyType;
        if (bedrooms !== undefined) updateData.bedrooms = parseInt(bedrooms);
        if (bathrooms !== undefined) updateData.bathrooms = parseFloat(bathrooms);
        if (squareFeet !== undefined) updateData.squareFeet = parseFloat(squareFeet);
        if (monthlyRent !== undefined) updateData.monthlyRent = parseFloat(monthlyRent);
        if (securityDeposit !== undefined) updateData.securityDeposit = parseFloat(securityDeposit);
        if (utilitiesIncluded !== undefined) updateData.utilitiesIncluded = Array.isArray(utilitiesIncluded) ? utilitiesIncluded : [];
        if (petPolicy !== undefined) updateData.petPolicy = petPolicy;
        if (parkingSpaces !== undefined) updateData.parkingSpaces = parseInt(parkingSpaces);
        if (status !== undefined) updateData.status = status;
        if (amenities !== undefined) updateData.amenities = Array.isArray(amenities) ? amenities : (amenities ? JSON.parse(amenities) : []);
        
        updateData.images = imageUrls;

        const updatedProperty = await propertyService.updateProperty(id, updateData);

        res.json({ 
            message: 'Property updated successfully',
            property: updatedProperty
        });
    } catch (error) {
        console.error('Error updating property:', error);
        res.status(500).json({ error: 'Failed to update property', details: error.message });
    }
});

// Delete property (landlord only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { role, userId } = req.user;
        const { id } = req.params;

        if (role !== 'landlord') {
            return res.status(403).json({ error: 'Only landlords can delete properties' });
        }

        const propertyService = getPropertyService();
        
        // Verify the property belongs to this landlord
        const property = await propertyService.getPropertyById(id);
        
        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }
        
        if (property.landlordId !== userId) {
            return res.status(403).json({ error: 'Unauthorized - property does not belong to you' });
        }

        await propertyService.deleteProperty(id);

        res.json({ message: 'Property deleted successfully' });
    } catch (error) {
        console.error('Error deleting property:', error);
        res.status(500).json({ error: 'Failed to delete property', details: error.message });
    }
});

// Get properties by landlord
router.get('/landlord/:landlordId', authenticateToken, async (req, res) => {
    try {
        const { landlordId } = req.params;
        const { role, userId } = req.user;

        // Landlords can only see their own properties, tenants can see any landlord's properties
        if (role === 'landlord' && landlordId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const propertyService = getPropertyService();
        const properties = await propertyService.getPropertiesByLandlord(landlordId);

        res.json(properties);
    } catch (error) {
        console.error('Error fetching properties:', error);
        res.status(500).json({ error: 'Failed to fetch properties', details: error.message });
    }
});

module.exports = router;
