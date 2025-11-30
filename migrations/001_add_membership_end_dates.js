const sqlite3 = require('sqlite3').verbose();
const config = require('../src/config/config');
const path = require('path');

// Connect to the database
const dbPath = path.resolve(process.cwd(), config.dbPath);
const db = new sqlite3.Database(dbPath);

// Enable foreign keys
db.serialize(() => {
  // Add end_date column if it doesn't exist
  db.run(`PRAGMA foreign_keys = OFF;`);
  
  // Add end_date column if it doesn't exist
  db.get(
    "PRAGMA table_info(memberships)", 
    [], 
    function(err, result) {
      if (err) {
        console.error('Error checking table structure:', err);
        process.exit(1);
      }
      
      const hasEndDate = result.some(col => col.name === 'end_date');
      
      if (!hasEndDate) {
        console.log('Adding end_date column to memberships table...');
        db.run(
          'ALTER TABLE memberships ADD COLUMN end_date TEXT',
          function(err) {
            if (err) {
              console.error('Error adding end_date column:', err);
            } else {
              console.log('Successfully added end_date column');
              updateExistingMemberships();
            }
          }
        );
      } else {
        console.log('end_date column already exists');
        updateExistingMemberships();
      }
    }
  );
  
  function updateExistingMemberships() {
    // Update existing memberships with calculated end dates
    console.log('Updating existing memberships with end dates...');
    
    // First, get all memberships without end dates
    db.all(
      `SELECT id, user_id, plan_key, start_date, status 
       FROM memberships 
       WHERE end_date IS NULL 
       ORDER BY user_id, start_date`,
      [],
      function(err, memberships) {
        if (err) {
          console.error('Error fetching memberships:', err);
          process.exit(1);
        }
        
        if (memberships.length === 0) {
          console.log('No memberships need updating');
          db.run(`PRAGMA foreign_keys = ON;`);
          db.close();
          return;
        }
        
        console.log(`Found ${memberships.length} memberships to update`);
        
        // Process memberships one by one
        let processed = 0;
        const total = memberships.length;
        
        memberships.forEach((membership, index) => {
          // Calculate end date based on plan_key and start_date
          const startDate = new Date(membership.start_date);
          let endDate = new Date(startDate);
          
          // Set end date based on plan type
          if (membership.plan_key === '1week') {
            endDate.setDate(startDate.getDate() + 7);
          } else if (membership.plan_key === '2weeks') {
            endDate.setDate(startDate.getDate() + 14);
          } else if (membership.plan_key === '1month') {
            endDate.setMonth(startDate.getMonth() + 1);
          } else {
            // Default to 1 month if plan_key is unknown
            endDate.setMonth(startDate.getMonth() + 1);
          }
          
          // Format date as YYYY-MM-DD
          const endDateStr = endDate.toISOString().split('T')[0];
          
          // Update the membership with the calculated end date
          db.run(
            'UPDATE memberships SET end_date = ? WHERE id = ?',
            [endDateStr, membership.id],
            function(updateErr) {
              if (updateErr) {
                console.error(`Error updating membership ${membership.id}:`, updateErr);
              } else {
                console.log(`Updated membership ${membership.id} with end date ${endDateStr}`);
              }
              
              processed++;
              if (processed === total) {
                console.log('All memberships have been updated');
                db.run(`PRAGMA foreign_keys = ON;`);
                db.close();
              }
            }
          );
        });
      }
    );
  }
});

// Handle errors
db.on('error', (err) => {
  console.error('Database error:', err);
  process.exit(1);
});
