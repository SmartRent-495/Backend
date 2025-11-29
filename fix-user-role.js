/**
 * Quick script to fix user roles in the database
 * Usage: node fix-user-role.js <email> <role>
 * Example: node fix-user-role.js test3@gmail.com landlord
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'smartrent.db');
const db = new sqlite3.Database(dbPath);

const email = process.argv[2];
const role = process.argv[3];

if (!email || !role) {
    console.error('Usage: node fix-user-role.js <email> <role>');
    console.error('Example: node fix-user-role.js test3@gmail.com landlord');
    process.exit(1);
}

if (!['landlord', 'tenant', 'admin'].includes(role)) {
    console.error('Role must be: landlord, tenant, or admin');
    process.exit(1);
}

// First, check if user exists
db.get('SELECT id, username, email, role FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
        console.error('Database error:', err);
        db.close();
        process.exit(1);
    }
    
    if (!user) {
        console.error(`❌ User with email "${email}" not found in database`);
        db.close();
        process.exit(1);
    }
    
    console.log(`\n📋 Current user data:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Role: ${user.role}`);
    
    if (user.role === role) {
        console.log(`\n✅ User already has role "${role}". No changes needed.`);
        db.close();
        return;
    }
    
    // Update the role
    db.run('UPDATE users SET role = ? WHERE email = ?', [role, email], function(updateErr) {
        if (updateErr) {
            console.error('❌ Error updating role:', updateErr);
            db.close();
            process.exit(1);
        }
        
        console.log(`\n✅ Successfully updated role from "${user.role}" to "${role}"`);
        console.log(`   Rows affected: ${this.changes}`);
        
        // Verify the update
        db.get('SELECT id, username, email, role FROM users WHERE email = ?', [email], (verifyErr, updatedUser) => {
            if (verifyErr) {
                console.error('Error verifying update:', verifyErr);
            } else {
                console.log(`\n📋 Updated user data:`);
                console.log(`   ID: ${updatedUser.id}`);
                console.log(`   Username: ${updatedUser.username}`);
                console.log(`   Email: ${updatedUser.email}`);
                console.log(`   New Role: ${updatedUser.role}`);
            }
            
            db.close();
            console.log('\n✨ Done! Please log out and log back in for changes to take effect.\n');
        });
    });
});
