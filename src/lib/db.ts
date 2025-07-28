
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

function initializeDatabase() {
  const dbName = 'tfl.db';
  let dbPath: string;

  if (process.env.VERCEL_ENV === 'production') {
    // On Vercel, the CWD is /var/task. The file will be in the root.
    const sourcePath = path.join(process.cwd(), dbName);
    dbPath = path.join('/tmp', dbName);
    
    // Copy the database from the read-only source to the writable /tmp directory
    // if it doesn't already exist there.
    if (!fs.existsSync(dbPath)) {
      fs.copyFileSync(sourcePath, dbPath);
    }
  } else {
    // In development, use the path relative to the project root.
    dbPath = path.join(process.cwd(), dbName);
  }

  // Initialize the database connection.
  const conn = new Database(dbPath, { readonly: true });
  return conn;
}

export function getDb() {
  if (!db) {
    db = initializeDatabase();
  }
  return db;
}
