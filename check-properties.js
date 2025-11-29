const { initializeFirebase, admin } = require('./src/config/firebase');

async function checkProperties() {
    try {
        initializeFirebase();
        const db = admin.firestore();
        
        console.log('Fetching all properties from Firestore...\n');
        
        const snapshot = await db.collection('properties').get();
        
        console.log(`Total properties: ${snapshot.size}\n`);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`Property ID: ${doc.id}`);
            console.log(`Title: ${data.title}`);
            console.log(`Address: ${data.address}`);
            console.log(`LandlordId: ${data.landlordId}`);
            console.log(`Created: ${data.createdAt}`);
            console.log('-------------------\n');
        });
        
        // Also check users
        console.log('\nFetching all users from Firestore...\n');
        const usersSnapshot = await db.collection('users').get();
        
        console.log(`Total users: ${usersSnapshot.size}\n`);
        
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`User ID: ${doc.id}`);
            console.log(`Email: ${data.email}`);
            console.log(`Role: ${data.role}`);
            console.log('-------------------\n');
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkProperties();
