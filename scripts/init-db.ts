import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase } from '../lib/neon-db';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function initDatabase() {
  console.log('Initializing database schema...');
  await initializeDatabase();
  console.log('✅ Database schema initialized successfully!');
  process.exit(0);
}

initDatabase().catch((error) => {
  console.error('Error initializing database:', error);
  process.exit(1);
});

