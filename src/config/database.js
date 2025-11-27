const sqlite3 = require('sqlite3').verbose();
const config = require('./config');

// DEPRECATED: This SQLite database is no longer used
// SmartRent now uses Firestore for all data storage
// This file is kept temporarily for backward compatibility only

const db = new sqlite3.Database(config.dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    // Removed: console.log('Connected to SQLite database for SmartRent');
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Create tables for SmartRent Property Management System
db.serialize(() => {
    // Users table (both landlords and tenants)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('landlord', 'tenant')) DEFAULT 'tenant',
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Properties table
    db.run(`CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        landlord_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT,
        zip_code TEXT,
        property_type TEXT NOT NULL CHECK(property_type IN ('apartment', 'house', 'condo', 'studio', 'commercial')),
        bedrooms INTEGER,
        bathrooms REAL,
        square_feet REAL,
        rent_amount REAL NOT NULL,
        security_deposit REAL,
        utilities_included BOOLEAN DEFAULT 0,
        pet_friendly BOOLEAN DEFAULT 0,
        parking_available BOOLEAN DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'maintenance', 'unavailable')),
        images TEXT,
        amenities TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Leases table (rental agreements)
    db.run(`CREATE TABLE IF NOT EXISTS leases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id INTEGER NOT NULL,
        tenant_id INTEGER NOT NULL,
        landlord_id INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        monthly_rent REAL NOT NULL,
        security_deposit REAL,
        utilities_cost REAL DEFAULT 0,
        payment_due_day INTEGER DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('pending', 'active', 'expired', 'terminated')),
        lease_document_url TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Payments table
    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lease_id INTEGER NOT NULL,
        tenant_id INTEGER NOT NULL,
        landlord_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        payment_type TEXT NOT NULL CHECK(payment_type IN ('rent', 'utilities', 'security_deposit', 'late_fee', 'other')),
        payment_method TEXT CHECK(payment_method IN ('stripe', 'bank_transfer', 'cash', 'check')),
        stripe_payment_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
        due_date TEXT NOT NULL,
        payment_date TEXT,
        description TEXT,
        receipt_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Maintenance Requests table
    db.run(`CREATE TABLE IF NOT EXISTS maintenance_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id INTEGER NOT NULL,
        tenant_id INTEGER NOT NULL,
        landlord_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT CHECK(category IN ('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest', 'other')),
        priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        images TEXT,
        assigned_to TEXT,
        estimated_cost REAL,
        actual_cost REAL,
        scheduled_date TEXT,
        completed_date TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Notifications table
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('payment_reminder', 'payment_received', 'maintenance_update', 'lease_expiring', 'general')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        related_id INTEGER,
        related_type TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Property Utilities table
    db.run(`CREATE TABLE IF NOT EXISTS utilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id INTEGER NOT NULL,
        utility_type TEXT NOT NULL CHECK(utility_type IN ('electricity', 'water', 'gas', 'internet', 'trash', 'other')),
        provider TEXT,
        account_number TEXT,
        monthly_cost REAL,
        is_included_in_rent BOOLEAN DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    )`);

    // Documents table
    db.run(`CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        related_id INTEGER,
        related_type TEXT,
        document_type TEXT NOT NULL CHECK(document_type IN ('lease', 'receipt', 'invoice', 'inspection', 'other')),
        title TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Messages table
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        property_id INTEGER,
        subject TEXT,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        read_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
    )`);
});

module.exports = db; 