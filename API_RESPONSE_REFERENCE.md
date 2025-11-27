# SmartRent API Response Reference

Quick reference for frontend developers working with the SmartRent backend API.

## Base URL
```
Development: http://localhost:4100/api
Production: TBD (Firebase Cloud Functions)
```

## Authentication

All protected endpoints require JWT token in header:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
}
```

---

## Response Structures

### 1. Authentication Endpoints

#### POST `/auth/register`
**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "landlord",  // or "tenant"
  "first_name": "John",
  "last_name": "Doe",
  "phone": "555-0100"
}
```

**Response (Success - 201):**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com",
      "role": "landlord",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "555-0100"
    }
  }
}
```

#### POST `/auth/login`
**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (Success - 200):**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com",
      "role": "landlord",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "555-0100",
      "avatar_url": null
    }
  }
}
```

#### GET `/auth/me` 🔒
**Response (Success - 200):**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "landlord",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "555-0100",
    "avatar_url": null,
    "created_at": "2025-11-03 19:54:42"
  }
}
```

---

### 2. Properties Endpoints

#### GET `/properties` 🔒
**Query Parameters:**
- `city` - Filter by city
- `property_type` - apartment, house, condo, etc.
- `min_rent` - Minimum rent amount
- `max_rent` - Maximum rent amount
- `status` - available, occupied, maintenance, unavailable
- `landlord_id` - Filter by specific landlord

**Response (Success - 200):**
```json
[
  {
    "id": 1,
    "landlord_id": 1,
    "title": "Beautiful 2BR Apartment",
    "description": "Modern apartment in downtown",
    "address": "123 Main St",
    "city": "Seattle",
    "state": "WA",
    "zip_code": "98101",
    "property_type": "apartment",
    "bedrooms": 2,
    "bathrooms": 1.5,
    "square_feet": 1200,
    "rent_amount": 2500,
    "security_deposit": 2500,
    "utilities_included": 0,
    "pet_friendly": 0,
    "parking_available": 0,
    "status": "available",
    "images": [],
    "amenities": "[\"parking\",\"gym\",\"pool\"]",  // NOTE: String, needs JSON.parse()
    "created_at": "2025-11-03 19:58:00",
    "updated_at": "2025-11-03 19:58:00",
    "landlord_name": "johndoe",
    "landlord_email": "john@example.com",
    "landlord_phone": "555-0100",
    "landlord_first_name": "John",
    "landlord_last_name": "Doe"
  }
]
```

#### GET `/properties/:id` 🔒
**Response:** Same as single item from array above

#### POST `/properties` 🔒 (Landlord only)
**Request:**
```json
{
  "title": "Beautiful 2BR Apartment",
  "description": "Modern apartment in downtown",
  "address": "123 Main St",
  "city": "Seattle",
  "state": "WA",
  "zip_code": "98101",
  "property_type": "apartment",
  "bedrooms": 2,
  "bathrooms": 1.5,
  "square_feet": 1200,
  "rent_amount": 2500,
  "security_deposit": 2500,
  "utilities_included": false,
  "pet_friendly": false,
  "parking_available": true,
  "amenities": ["parking", "gym", "pool"]
}
```

**Response (Success - 201):**
```json
{
  "message": "Property created successfully",
  "propertyId": 1
}
```

**For file uploads (FormData):**
```javascript
const formData = new FormData();
formData.append('title', 'Beautiful Apartment');
formData.append('address', '123 Main St');
// ... other fields ...
formData.append('images', file1);
formData.append('images', file2);  // Up to 10 images

axios.post('/api/properties', formData, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data'
  }
});
```

---

### 3. Leases Endpoints

#### GET `/leases` 🔒
**Query Parameters:**
- `property_id` - Filter by property
- `tenant_id` - Filter by tenant
- `status` - pending, active, expired, terminated

**Response (Success - 200):**
```json
[
  {
    "id": 1,
    "property_id": 1,
    "tenant_id": 2,
    "landlord_id": 1,
    "start_date": "2024-02-01",
    "end_date": "2025-02-01",
    "monthly_rent": 2500,
    "security_deposit": 2500,
    "utilities_cost": 0,
    "payment_due_day": 1,
    "status": "active",
    "lease_document_url": null,
    "notes": null,
    "created_at": "2025-11-03 19:58:48",
    "updated_at": "2025-11-03 19:58:48",
    "property_title": "Beautiful 2BR Apartment",
    "property_address": "123 Main St",
    "property_city": "Seattle",
    "tenant_name": "janedoe",
    "tenant_email": "jane@example.com",
    "tenant_phone": "555-0200",
    "tenant_first_name": "Jane",
    "tenant_last_name": "Doe",
    "landlord_name": "johndoe",
    "landlord_email": "john@example.com"
  }
]
```

#### POST `/leases` 🔒 (Landlord only)
**Request:**
```json
{
  "property_id": 1,
  "tenant_id": 2,
  "start_date": "2024-02-01",
  "end_date": "2025-02-01",
  "monthly_rent": 2500,
  "security_deposit": 2500,
  "utilities_cost": 150,
  "payment_due_day": 1,
  "notes": "First and last month required"
}
```

**Response (Success - 201):**
```json
{
  "message": "Lease created successfully",
  "leaseId": 1
}
```

**Side Effects:**
- Property status updated to "occupied"
- Notification sent to tenant
- Property availability updated

---

### 4. Maintenance Endpoints

#### GET `/maintenance` 🔒
**Query Parameters:**
- `property_id` - Filter by property
- `status` - pending, in_progress, completed, cancelled
- `priority` - low, medium, high, urgent

**Auto-filtering by role:**
- Tenants: See only their requests
- Landlords: See requests for their properties

**Response (Success - 200):**
```json
[
  {
    "id": 1,
    "property_id": 1,
    "tenant_id": 2,
    "landlord_id": 1,
    "title": "Leaking Faucet",
    "description": "Kitchen faucet is dripping constantly",
    "category": "plumbing",
    "priority": "medium",
    "status": "pending",
    "contractor_name": null,
    "contractor_contact": null,
    "estimated_cost": null,
    "actual_cost": null,
    "images": [],
    "notes": null,
    "created_at": "2025-11-03 19:58:49",
    "updated_at": "2025-11-03 19:58:49",
    "property_title": "Beautiful 2BR Apartment",
    "property_address": "123 Main St",
    "tenant_name": "janedoe",
    "tenant_email": "jane@example.com",
    "tenant_phone": "555-0200",
    "landlord_name": "johndoe",
    "landlord_email": "john@example.com",
    "landlord_phone": "555-0100"
  }
]
```

#### POST `/maintenance` 🔒 (Tenant only)
**Request:**
```json
{
  "property_id": 1,
  "title": "Leaking Faucet",
  "description": "Kitchen faucet is dripping constantly",
  "category": "plumbing",
  "priority": "medium"
}
```

**Response (Success - 201):**
```json
{
  "message": "Maintenance request created successfully",
  "requestId": 1
}
```

**Categories:** plumbing, electrical, hvac, appliance, structural, other

**Side Effects:**
- Notification sent to landlord

---

### 5. Notifications Endpoints

#### GET `/notifications` 🔒
**Query Parameters:**
- `unread` - true/false (filter unread only)
- `type` - payment_reminder, payment_received, maintenance_update, lease_expiring, general

**Response (Success - 200):**
```json
[
  {
    "id": 1,
    "user_id": 2,
    "type": "lease_expiring",
    "title": "New Lease Created",
    "message": "You have been added to a new lease for Beautiful 2BR Apartment",
    "related_id": 1,
    "is_read": 0,
    "created_at": "2025-11-03 19:58:48"
  },
  {
    "id": 2,
    "user_id": 1,
    "type": "maintenance_update",
    "title": "New Maintenance Request",
    "message": "janedoe submitted a maintenance request: Leaking Faucet",
    "related_id": 1,
    "is_read": 0,
    "created_at": "2025-11-03 19:58:49"
  }
]
```

#### PUT `/notifications/:id/read` 🔒
**Response (Success - 200):**
```json
{
  "message": "Notification marked as read"
}
```

---

## Error Response Format

All errors follow this structure:

```json
{
  "status": "error",
  "message": "Descriptive error message"
}
```

Or (for some routes):

```json
{
  "error": "Descriptive error message"
}
```

### Common HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET/PUT request |
| 201 | Created | Successful POST request |
| 400 | Bad Request | Validation error, missing fields |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Database or internal error |

---

## Frontend Integration Examples

### React/Next.js with Axios

```typescript
// lib/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/auth/sign-in';
    }
    return Promise.reject(error);
  }
);

// Authentication
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
};

// Properties
export const propertiesApi = {
  getAll: (params?) => api.get('/properties', { params }),
  getById: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
};

// Leases
export const leasesApi = {
  getAll: (params?) => api.get('/leases', { params }),
  getById: (id) => api.get(`/leases/${id}`),
  create: (data) => api.post('/leases', data),
  update: (id, data) => api.put(`/leases/${id}`, data),
  terminate: (id) => api.delete(`/leases/${id}`),
};

// Maintenance
export const maintenanceApi = {
  getAll: (params?) => api.get('/maintenance', { params }),
  getById: (id) => api.get(`/maintenance/${id}`),
  create: (data) => api.post('/maintenance', data),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
};

// Notifications
export const notificationsApi = {
  getAll: (params?) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markUnread: (id) => api.put(`/notifications/${id}/unread`),
  delete: (id) => api.delete(`/notifications/${id}`),
};
```

### Usage in Components

```tsx
// Example: Login Component
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

export function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.login(formData);
      const { token, user } = response.data.data;
      
      // Store token and user data
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Redirect based on role
      if (user.role === 'landlord') {
        router.push('/dashboard/properties');
      } else {
        router.push('/dashboard/maintenance');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

```tsx
// Example: Properties List
'use client';

import { useEffect, useState } from 'react';
import { propertiesApi } from '@/lib/api';

export function PropertiesList() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ city: '', property_type: '' });

  useEffect(() => {
    fetchProperties();
  }, [filters]);

  const fetchProperties = async () => {
    try {
      const response = await propertiesApi.getAll(filters);
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Filters and property cards */}
    </div>
  );
}
```

---

## Important Notes

### 1. Amenities Field
The `amenities` field in properties is returned as a **JSON string**, not an array.  
**Frontend must parse it:**
```javascript
const amenities = JSON.parse(property.amenities);
```

### 2. Boolean Fields
SQLite returns booleans as integers (0/1):
- `utilities_included: 0` = false
- `pet_friendly: 1` = true

**Convert in frontend:**
```javascript
const isPetFriendly = Boolean(property.pet_friendly);
```

### 3. Dates
All dates are in format: `"YYYY-MM-DD HH:MM:SS"`  
**Parse for display:**
```javascript
const formattedDate = new Date(property.created_at).toLocaleDateString();
```

### 4. Image URLs
Image URLs are relative paths starting with `/uploads/`  
**Full URL construction:**
```javascript
const imageUrl = `${API_BASE_URL}${property.images[0]}`;
```

### 5. File Uploads
Use `FormData` for multipart uploads:
```javascript
const formData = new FormData();
formData.append('title', 'Property Title');
formData.append('images', fileInput.files[0]);
```

---

## TypeScript Type Definitions

```typescript
// types/api.ts

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'landlord' | 'tenant';
  first_name: string;
  last_name: string;
  phone: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Property {
  id: number;
  landlord_id: number;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: 'apartment' | 'house' | 'condo' | 'townhouse';
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  rent_amount: number;
  security_deposit: number | null;
  utilities_included: 0 | 1;
  pet_friendly: 0 | 1;
  parking_available: 0 | 1;
  status: 'available' | 'occupied' | 'maintenance' | 'unavailable';
  images: string[];
  amenities: string; // JSON string - needs parsing
  created_at: string;
  updated_at: string;
  // Joined fields
  landlord_name?: string;
  landlord_email?: string;
  landlord_phone?: string;
  landlord_first_name?: string;
  landlord_last_name?: string;
}

export interface Lease {
  id: number;
  property_id: number;
  tenant_id: number;
  landlord_id: number;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  utilities_cost: number;
  payment_due_day: number;
  status: 'pending' | 'active' | 'expired' | 'terminated';
  lease_document_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  property_title?: string;
  property_address?: string;
  property_city?: string;
  tenant_name?: string;
  tenant_email?: string;
  tenant_phone?: string;
  tenant_first_name?: string;
  tenant_last_name?: string;
  landlord_name?: string;
  landlord_email?: string;
}

export interface MaintenanceRequest {
  id: number;
  property_id: number;
  tenant_id: number;
  landlord_id: number;
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  contractor_name: string | null;
  contractor_contact: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  images: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  property_title?: string;
  property_address?: string;
  tenant_name?: string;
  tenant_email?: string;
  tenant_phone?: string;
  landlord_name?: string;
  landlord_email?: string;
  landlord_phone?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: 'payment_reminder' | 'payment_received' | 'maintenance_update' | 'lease_expiring' | 'general';
  title: string;
  message: string;
  related_id: number | null;
  is_read: 0 | 1;
  created_at: string;
}

// API Response Types
export interface AuthResponse {
  status: 'success' | 'error';
  data?: {
    token: string;
    user: User;
  };
  message?: string;
}

export interface ApiError {
  status: 'error';
  message: string;
}
```

---

**Last Updated:** November 3, 2025  
**Backend Version:** 1.0.0  
**Tested:** ✅ All endpoints verified
