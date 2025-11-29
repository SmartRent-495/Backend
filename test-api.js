/**
 * SmartRent Backend API Test Script
 * Tests all major endpoints with proper authentication flow
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4100/api';
let landlordToken = '';
let tenantToken = '';
let propertyId = '';
let leaseId = '';

// Test data
const landlordData = {
  username: 'landlord1',
  email: 'landlord@test.com',
  password: 'Test123!',
  first_name: 'Test',
  last_name: 'Landlord',
  role: 'landlord',
  phone: '555-0100'
};

const tenantData = {
  username: 'tenant1',
  email: 'tenant@test.com',
  password: 'Test123!',
  first_name: 'Test',
  last_name: 'Tenant',
  role: 'tenant',
  phone: '555-0200'
};

const propertyData = {
  title: 'Beautiful 2BR Apartment',
  description: 'Modern apartment in downtown',
  address: '123 Main St',
  city: 'Seattle',
  state: 'WA',
  zip_code: '98101',
  property_type: 'apartment',
  bedrooms: 2,
  bathrooms: 1.5,
  square_feet: 1200,
  rent_amount: 2500,
  deposit_amount: 2500,
  available_from: '2024-01-01',
  status: 'available',
  amenities: JSON.stringify(['parking', 'gym', 'pool'])
};

// Helper function to log results
function logResult(testName, success, data = null) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${success ? '✓' : '✗'} ${testName}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('='.repeat(60));
}

// Test functions
async function testRegisterLandlord() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, landlordData);
    landlordToken = response.data.data.token; // Save token from registration
    logResult('Register Landlord', true, response.data);
    return true;
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.response?.data || error.message || String(error);
    logResult('Register Landlord', false, errorMsg);
    console.log('Full error:', error.code, error.message);
    return false;
  }
}

async function testLoginLandlord() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: landlordData.email,
      password: landlordData.password
    });
    landlordToken = response.data.data.token;
    logResult('Login Landlord', true, { message: 'Login successful' });
    return true;
  } catch (error) {
    logResult('Login Landlord', false, error.response?.data || error.message);
    return false;
  }
}

async function testRegisterTenant() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, tenantData);
    tenantToken = response.data.data.token; // Save token from registration
    logResult('Register Tenant', true, response.data);
    return true;
  } catch (error) {
    logResult('Register Tenant', false, error.response?.data || error.message);
    return false;
  }
}

async function testLoginTenant() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: tenantData.email,
      password: tenantData.password
    });
    tenantToken = response.data.data.token;
    logResult('Login Tenant', true, { message: 'Login successful' });
    return true;
  } catch (error) {
    logResult('Login Tenant', false, error.response?.data || error.message);
    return false;
  }
}

async function testCreateProperty() {
  try {
    const response = await axios.post(`${BASE_URL}/properties`, propertyData, {
      headers: { Authorization: `Bearer ${landlordToken}` }
    });
    propertyId = response.data.propertyId;
    logResult('Create Property', true, response.data);
    return true;
  } catch (error) {
    logResult('Create Property', false, error.response?.data || error.message);
    return false;
  }
}

async function testGetProperties() {
  try {
    const response = await axios.get(`${BASE_URL}/properties`, {
      headers: { Authorization: `Bearer ${landlordToken}` }
    });
    logResult('Get All Properties', true, { count: response.data.length });
    return true;
  } catch (error) {
    logResult('Get All Properties', false, error.response?.data || error.message);
    return false;
  }
}

async function testGetPropertyById() {
  try {
    const response = await axios.get(`${BASE_URL}/properties/${propertyId}`, {
      headers: { Authorization: `Bearer ${landlordToken}` }
    });
    logResult('Get Property by ID', true, response.data);
    return true;
  } catch (error) {
    logResult('Get Property by ID', false, error.response?.data || error.message);
    return false;
  }
}

async function testCreateLease() {
  try {
    // First get the tenant ID
    const profileResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${tenantToken}` }
    });
    const tenantId = profileResponse.data.data.id;

    const leaseData = {
      property_id: propertyId,
      tenant_id: tenantId,
      start_date: '2024-02-01',
      end_date: '2025-02-01',
      monthly_rent: 2500,
      security_deposit: 2500,
      payment_due_day: 1
    };

    const response = await axios.post(`${BASE_URL}/leases`, leaseData, {
      headers: { Authorization: `Bearer ${landlordToken}` }
    });
    leaseId = response.data.leaseId;
    logResult('Create Lease', true, response.data);
    return true;
  } catch (error) {
    logResult('Create Lease', false, error.response?.data || error.message);
    console.log('Lease creation debug:', { propertyId, tenantToken: tenantToken?.substring(0, 10) });
    return false;
  }
}

async function testGetLeases() {
  try {
    const response = await axios.get(`${BASE_URL}/leases`, {
      headers: { Authorization: `Bearer ${landlordToken}` }
    });
    logResult('Get All Leases', true, { count: response.data.length });
    return true;
  } catch (error) {
    logResult('Get All Leases', false, error.response?.data || error.message);
    return false;
  }
}

async function testCreateMaintenanceRequest() {
  try {
    const maintenanceData = {
      property_id: propertyId, // Use property_id instead of lease_id
      title: 'Leaking Faucet',
      description: 'Kitchen faucet is dripping constantly',
      priority: 'medium',
      category: 'plumbing'
    };

    const response = await axios.post(`${BASE_URL}/maintenance`, maintenanceData, {
      headers: { Authorization: `Bearer ${tenantToken}` }
    });
    logResult('Create Maintenance Request', true, response.data);
    return true;
  } catch (error) {
    logResult('Create Maintenance Request', false, error.response?.data || error.message);
    return false;
  }
}

async function testGetMaintenanceRequests() {
  try {
    const response = await axios.get(`${BASE_URL}/maintenance`, {
      headers: { Authorization: `Bearer ${landlordToken}` }
    });
    logResult('Get Maintenance Requests', true, { count: response.data.length });
    return true;
  } catch (error) {
    logResult('Get Maintenance Requests', false, error.response?.data || error.message);
    return false;
  }
}

async function testGetNotifications() {
  try {
    const response = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${tenantToken}` }
    });
    logResult('Get Notifications', true, { count: response.data.length });
    return true;
  } catch (error) {
    logResult('Get Notifications', false, error.response?.data || error.message);
    return false;
  }
}

async function testGetProfile() {
  try {
    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${landlordToken}` }
    });
    logResult('Get Landlord Profile', true, response.data);
    return true;
  } catch (error) {
    logResult('Get Landlord Profile', false, error.response?.data || error.message);
    return false;
  }
}

// Clean database before tests
async function cleanDatabase() {
  try {
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, 'smartrent.db');
    
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('🗑️  Cleared old database for clean test run\n');
      // Wait for database to be recreated by server
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.log('ℹ️  No existing database to clear\n');
  }
}

// Run all tests
async function runTests() {
  console.log('\n🚀 Starting SmartRent Backend API Tests...\n');
  console.log('⏳ Preparing clean test environment...\n');
  
  // Clean database before starting
  await cleanDatabase();
  
  const tests = [
    { name: '1. Authentication', tests: [
      testRegisterLandlord,
      testLoginLandlord,
      testRegisterTenant,
      testLoginTenant,
      testGetProfile
    ]},
    { name: '2. Properties', tests: [
      testCreateProperty,
      testGetProperties,
      testGetPropertyById
    ]},
    { name: '3. Leases', tests: [
      testCreateLease,
      testGetLeases
    ]},
    { name: '4. Maintenance', tests: [
      testCreateMaintenanceRequest,
      testGetMaintenanceRequests
    ]},
    { name: '5. Notifications', tests: [
      testGetNotifications
    ]}
  ];

  let totalTests = 0;
  let passedTests = 0;

  for (const section of tests) {
    console.log(`\n\n${'*'.repeat(60)}`);
    console.log(`   ${section.name}`);
    console.log('*'.repeat(60));

    for (const test of section.tests) {
      totalTests++;
      const passed = await test();
      if (passed) passedTests++;
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
    }
  }

  console.log('\n\n' + '='.repeat(60));
  console.log(`   TEST SUMMARY`);
  console.log('='.repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
  console.log('='.repeat(60) + '\n');
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

// Run the tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
