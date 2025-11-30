const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'smartrent.db');
const db = new sqlite3.Database(dbPath);

console.log('Starting migration: Initial Property Management Schema');

try {
  // Drop old fitness-related tables
  console.log('Removing old fitness-related tables...');
  const oldTables = [
    'workouts', 'exercises', 'progress', 'food_entries',
    'progress_entries', 'goals', 'health_metrics',
    'bookings', 'memberships', 'membership_plans'
  ];

  db.serialize(() => {
    oldTables.forEach(table => {
      db.run(DROP TABLE IF EXISTS ${table}, (err) => {
        if (err) {
          console.log(Could not drop ${table}:, err.message);
        } else {
          console.log(Dropped table: ${table});
        }
      });
    });

    // Create users table from scratch
    console.log('Creating users table...');
    db.exec(`
      DROP TABLE IF EXISTS users;
      
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'tenant',
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `, (err) => {
      if (err) {
        console.error('❌ Error creating users table:', err);
        throw err;
      }
      console.log('Users table created successfully');
    });

    // Create properties table
    console.log('Creating properties table...');
    db.exec(`
      DROP TABLE IF EXISTS properties;
      
      CREATE TABLE properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        zip_code TEXT NOT NULL,
        property_type TEXT NOT NULL,
        bedrooms INTEGER,
        bathrooms INTEGER,
        square_feet INTEGER,
        rent_amount DECIMAL(10,2),
        status TEXT DEFAULT 'available',
        description TEXT,
        image_url TEXT,
        landlord_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (landlord_id) REFERENCES users(id)
      );
    `, (err) => {
      if (err) {
        console.error('❌ Error creating properties table:', err);
        throw err;
      }
      console.log('Properties table created successfully');
    });

    // Create leases table
    console.log('Creating leases table...');
    db.exec(`
      DROP TABLE IF EXISTS leases;
      
      CREATE TABLE leases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id INTEGER NOT NULL,
        tenant_id INTEGER NOT NULL,
        landlord_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        rent_amount DECIMAL(10,2) NOT NULL,
        security_deposit DECIMAL(10,2),
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id),
        FOREIGN KEY (tenant_id) REFERENCES users(id),
        FOREIGN KEY (landlord_id) REFERENCES users(id)
      );
    `, (err) => {
      if (err) {
        console.error('❌ Error creating leases table:', err);
        throw err;
      }
      console.log('Leases table created successfully');
    });

    // Create maintenance_requests table
    console.log('Creating maintenance_requests table...');
    db.exec(`
      DROP TABLE IF EXISTS maintenance_requests;
      
      CREATE TABLE maintenance_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id INTEGER NOT NULL,
        tenant_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        category TEXT,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id),
        FOREIGN KEY (tenant_id) REFERENCES users(id)
      );
    `, (err) => {
      if (err) {
        console.error('❌ Error creating maintenance_requests table:', err);
        throw err;
      }
      console.log('Maintenance requests table created successfully');
    });

    // Create payments table
    console.log('Creating payments table...');
    db.exec(`
      DROP TABLE IF EXISTS payments;
      
      CREATE TABLE payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lease_id INTEGER NOT NULL,
        tenant_id INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method TEXT,
        status TEXT DEFAULT 'pending',
        transaction_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lease_id) REFERENCES leases(id),
        FOREIGN KEY (tenant_id) REFERENCES users(id)
      );
    `, (err) => {
      if (err) {
        console.error('❌ Error creating payments table:', err);
        throw err;
      }
      console.log('Payments table created successfully');
    });

    // Create messages table
    console.log('Creating messages table...');
    db.exec(`
      DROP TABLE IF EXISTS messages;
      
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        property_id INTEGER,
        subject TEXT,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id),
        FOREIGN KEY (property_id) REFERENCES properties(id)
      );
    `, (err) => {
      if (err) {
        console.error('❌ Error creating messages table:', err);
        throw err;
      }
      console.log('Messages table created successfully');
      
      // Close database after all tables are created
      setTimeout(() => {
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('\n✅ Migration completed successfully!');
            console.log('SmartRent database schema is ready.\n');
            console.log('Database connection closed.');
          }
          process.exit(0);
        });
      }, 1000);
    });
  });

} catch (error) {
  console.error('❌ Migration failed:', error);
  db.close();
  process.exit(1);
}