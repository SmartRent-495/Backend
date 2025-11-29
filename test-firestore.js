/**
 * Quick Firestore Test Script
 * 
 * Tests if Firestore service layer is working correctly
 */

// Load environment variables
require('dotenv').config();

const { getUserService } = require('./src/services/users.service');

async function testFirestore() {
    console.log('🧪 Testing Firestore Service Layer...\n');
    
    try {
        const userService = getUserService();
        
        // Test 1: Get all users
        console.log('Test 1: Getting all users from Firestore...');
        const allUsers = await userService.getAllUsers();
        console.log(`✅ Found ${allUsers.length} users in Firestore\n`);
        
        if (allUsers.length > 0) {
            console.log('Sample user:', JSON.stringify(allUsers[0], null, 2));
        }
        
        // Test 2: Get user by email (if any users exist)
        if (allUsers.length > 0) {
            const testEmail = allUsers[0].email;
            console.log(`\nTest 2: Getting user by email (${testEmail})...`);
            const userByEmail = await userService.getUserByEmail(testEmail);
            console.log('✅ User found:', userByEmail ? 'Yes' : 'No');
        }
        
        console.log('\n🎉 All Firestore tests passed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Firestore test failed:', error);
        process.exit(1);
    }
}

testFirestore();
