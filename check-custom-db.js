const Database = require('better-sqlite3');
const path = require('path');

const dbPath = 'd:/catatan upload ke github/custom.db';

try {
  console.log(`\n🔍 Checking custom.db at: ${dbPath}\n`);
  
  const db = new Database(dbPath, { readonly: true });
  
  // Get list of tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  
  console.log('📋 Tables found in custom.db:');
  console.log('===============================');
  
  for (const table of tables) {
    if (table.name.startsWith('sqlite_')) continue;
    
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`${table.name}: ${count.count} records`);
  }
  
  // Show sample data from User table if exists
  try {
    const users = db.prepare('SELECT id, name, email, role FROM User LIMIT 3').all();
    if (users.length > 0) {
      console.log('\n👤 Sample Users from custom.db:');
      console.log('--------------------------------');
      users.forEach(u => {
        console.log(`  - ${u.name} (${u.email}) - ${u.role}`);
      });
    }
  } catch (e) {
    console.log('\n⚠️  Could not read User table');
  }
  
  db.close();
  console.log('\n✅ custom.db is accessible and has data!\n');
  
} catch (error) {
  console.error('\n❌ ERROR accessing custom.db:');
  console.error(error.message);
  console.log('\nPlease verify:');
  console.log('1. File exists at: d:/catatan upload ke github/custom.db');
  console.log('2. File is not corrupted');
  console.log('3. Path is correct\n');
}
