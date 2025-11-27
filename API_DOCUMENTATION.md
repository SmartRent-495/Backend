# SmartRent Backend API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Authentication Routes

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "landlord",  // or "tenant"
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890"
}

Response: 201 Created
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "landlord",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1234567890"
    }
  }
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}

Response: 200 OK
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "landlord",
      ...
    }
  }
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "success",
  "data": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "landlord",
    ...
  }
}
```

### Update Profile
```http
PUT /api/auth/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "Johnny",
  "phone": "+1987654321"
}
```

---

## 🏠 Properties Routes

### Get All Properties
```http
GET /api/properties
Authorization: Bearer <token>

Query Parameters:
- city: Filter by city
- property_type: apartment, house, condo, studio, commercial
- min_rent: Minimum rent amount
- max_rent: Maximum rent amount
- status: available, occupied, maintenance, unavailable
- landlord_id: Filter by landlord

Response: 200 OK
[
  {
    "id": 1,
    "landlord_id": 1,
    "title": "Modern Downtown Apartment",
    "address": "123 Main St",
    "city": "New York",
    "property_type": "apartment",
    "bedrooms": 2,
    "bathrooms": 1.5,
    "rent_amount": 2500,
    "status": "available",
    "images": ["/uploads/properties/image1.jpg"],
    "landlord_name": "john_doe",
    ...
  }
]
```

### Get Property by ID
```http
GET /api/properties/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "id": 1,
  "title": "Modern Downtown Apartment",
  ...
}
```

### Create Property (Landlord Only)
```http
POST /api/properties
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- title: "Modern Downtown Apartment"
- description: "Beautiful 2BR apartment with city views"
- address: "123 Main St"
- city: "New York"
- state: "NY"
- zip_code: "10001"
- property_type: "apartment"
- bedrooms: 2
- bathrooms: 1.5
- square_feet: 1200
- rent_amount: 2500
- security_deposit: 2500
- utilities_included: false
- pet_friendly: true
- parking_available: true
- amenities: ["gym", "pool", "parking"]
- images: [File, File, ...]  // Max 10 images

Response: 201 Created
{
  "message": "Property created successfully",
  "propertyId": 1
}
```

### Update Property (Landlord Only)
```http
PUT /api/properties/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data

// Same fields as create, all optional
```

### Delete Property (Landlord Only)
```http
DELETE /api/properties/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Property deleted successfully"
}
```

---

## 📋 Leases Routes

### Get All Leases
```http
GET /api/leases
Authorization: Bearer <token>

Query Parameters:
- status: pending, active, expired, terminated
- property_id: Filter by property

Response: 200 OK
// Returns leases based on user role
// Landlords see their properties' leases
// Tenants see only their leases
```

### Get Lease by ID
```http
GET /api/leases/:id
Authorization: Bearer <token>
```

### Create Lease (Landlord Only)
```http
POST /api/leases
Authorization: Bearer <token>
Content-Type: application/json

{
  "property_id": 1,
  "tenant_id": 2,
  "start_date": "2025-01-01",
  "end_date": "2026-01-01",
  "monthly_rent": 2500,
  "security_deposit": 2500,
  "utilities_cost": 150,
  "payment_due_day": 1,
  "notes": "First month rent waived"
}

Response: 201 Created
{
  "message": "Lease created successfully",
  "leaseId": 1
}
```

### Update Lease (Landlord Only)
```http
PUT /api/leases/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "monthly_rent": 2600,
  "status": "active"
}
```

### Terminate Lease (Landlord Only)
```http
DELETE /api/leases/:id
Authorization: Bearer <token>

// Note: Doesn't delete, sets status to "terminated"
```

### Get Leases by Property
```http
GET /api/leases/property/:propertyId
Authorization: Bearer <token>  // Landlord only
```

### Get Leases by Tenant
```http
GET /api/leases/tenant/:tenantId
Authorization: Bearer <token>
```

---

## 🔧 Maintenance Routes

### Get All Maintenance Requests
```http
GET /api/maintenance
Authorization: Bearer <token>

Query Parameters:
- property_id: Filter by property
- status: pending, in_progress, completed, cancelled
- priority: low, medium, high, urgent

Response: 200 OK
// Landlords see requests for their properties
// Tenants see only their requests
```

### Get Maintenance Request by ID
```http
GET /api/maintenance/:id
Authorization: Bearer <token>
```

### Create Maintenance Request (Tenant Only)
```http
POST /api/maintenance
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- property_id: 1
- title: "Broken AC Unit"
- description: "AC not cooling properly"
- category: "hvac"  // plumbing, electrical, hvac, appliance, structural, pest, other
- priority: "high"  // low, medium, high, urgent
- images: [File, ...]  // Max 5 images

Response: 201 Created
{
  "message": "Maintenance request created successfully",
  "requestId": 1
}
```

### Update Maintenance Request
```http
PUT /api/maintenance/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data

// Tenants can update: title, description, category, priority (if status=pending)
// Landlords can update: status, assigned_to, estimated_cost, actual_cost, scheduled_date, completed_date, notes

Landlord Update Example:
{
  "status": "in_progress",
  "assigned_to": "ABC Repair Co.",
  "estimated_cost": 500,
  "scheduled_date": "2025-11-05"
}
```

### Delete Maintenance Request
```http
DELETE /api/maintenance/:id
Authorization: Bearer <token>

// Tenants can delete if status=pending
// Landlords can always delete
```

---

## 🔔 Notifications Routes

### Get All Notifications
```http
GET /api/notifications
Authorization: Bearer <token>

Query Parameters:
- is_read: true/false
- type: payment_reminder, payment_received, maintenance_update, lease_expiring, general
- limit: Number (default 50)

Response: 200 OK
[
  {
    "id": 1,
    "user_id": 2,
    "type": "maintenance_update",
    "title": "Maintenance Request Updated",
    "message": "Your maintenance request status changed to: in_progress",
    "related_id": 1,
    "related_type": "maintenance",
    "is_read": 0,
    "created_at": "2025-11-03 10:30:00"
  }
]
```

### Get Unread Count
```http
GET /api/notifications/unread/count
Authorization: Bearer <token>

Response: 200 OK
{
  "unreadCount": 5
}
```

### Mark Notification as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Notification marked as read"
}
```

### Mark All as Read
```http
PUT /api/notifications/mark-all/read
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "All notifications marked as read",
  "updatedCount": 5
}
```

### Delete Notification
```http
DELETE /api/notifications/:id
Authorization: Bearer <token>
```

### Clear Read Notifications
```http
DELETE /api/notifications/read/clear
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Read notifications cleared",
  "deletedCount": 10
}
```

---

## 💳 Payments Routes

_Note: Payment routes will be integrated with Stripe for processing rent and utility payments._

---

## 📝 Testing with cURL

### Register a Landlord
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "landlord1",
    "email": "landlord@test.com",
    "password": "password123",
    "role": "landlord",
    "first_name": "John",
    "last_name": "Smith"
  }'
```

### Register a Tenant
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tenant1",
    "email": "tenant@test.com",
    "password": "password123",
    "role": "tenant",
    "first_name": "Jane",
    "last_name": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "landlord@test.com",
    "password": "password123"
  }'
```

### Create Property (use token from login)
```bash
curl -X POST http://localhost:5000/api/properties \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Downtown Apartment",
    "address": "123 Main St",
    "city": "New York",
    "property_type": "apartment",
    "bedrooms": 2,
    "bathrooms": 1,
    "rent_amount": 2500
  }'
```

---

## 🧪 Testing Workflow

1. **Register a landlord** and save the token
2. **Create a property** as the landlord
3. **Register a tenant** and save their token
4. **Create a lease** as landlord (linking property to tenant)
5. **Submit maintenance request** as tenant
6. **Update maintenance status** as landlord
7. **Check notifications** for both users

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message description"
}
```

Common status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

**Backend Status**: ✅ Complete and Ready for Testing
**Last Updated**: November 3, 2025
