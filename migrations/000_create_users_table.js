/**
 * Migration: Create users table
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./smartrent.db');

console.log("Running migration: create users table");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
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
      console.error("Failed to create users table:", err);
    } else {
      console.log("Users table created successfully.");
    }
  });
});

db.close();
