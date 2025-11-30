/**
 * Migration to make password field nullable for Firebase users
 * Run this with: node migrations/002_make_password_nullable.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../smartrent.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Running migration: Make password nullable for Firebase users...\n');

db.serialize(() => {
    // SQLite doesn't support ALTER COLUMN, so we need to:
    // 1. Create new table with nullable password
    // 2. Copy data
    // 3. Drop old table
    // 4. Rename new table

    console.log('Step 1: Creating new users table with nullable password...');
    db.run(`CREATE TABLE IF NOT EXISTS users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        role TEXT NOT NULL CHECK(role IN ('landlord', 'tenant', 'admin')) DEFAULT 'tenant',
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('❌ Error creating new table:', err);
            process.exit(1);
        }
        console.log('✅ New table created');

        console.log('\nStep 2: Copying data from old table...');
        db.run(`INSERT INTO users_new (id, username, email, password, role, first_name, last_name, phone, avatar_url, created_at, updated_at)
                SELECT id, username, email, password, role, first_name, last_name, phone, avatar_url, created_at, updated_at
                FROM users`, (err) => {
            if (err) {
                console.error('❌ Error copying data:', err);
                process.exit(1);
            }
            console.log('✅ Data copied successfully');

            console.log('\nStep 3: Dropping old table...');
            db.run(`DROP TABLE users`, (err) => {
                if (err) {
                    console.error('❌ Error dropping old table:', err);
                    process.exit(1);
                }
                console.log('✅ Old table dropped');

                console.log('\nStep 4: Renaming new table...');
                db.run(`ALTER TABLE users_new RENAME TO users`, (err) => {
                    if (err) {
                        console.error('❌ Error renaming table:', err);
                        process.exit(1);
                    }
                    console.log('✅ Table renamed');

                    console.log('\n✨ Migration completed successfully!');
                    console.log('📋 Password field is now nullable for Firebase users\n');
                    
                    db.close();
                });
            });
        });
    });
});
