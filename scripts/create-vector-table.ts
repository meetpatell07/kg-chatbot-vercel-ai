import dotenv from 'dotenv';
import path from 'path';
import { prisma } from '../lib/prisma';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function createVectorTable() {
  try {
    console.log('Creating documents table with vector support...');

    // Enable pgvector extension
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector;`;

    // Check if table already exists
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documents'
      );
    `;

    if (tableExists[0]?.exists) {
      console.log('⚠️  Documents table already exists. Skipping creation.');
      return;
    }

    // Create documents table with vector column
    await prisma.$executeRaw`
      CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding vector(768),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Create index for vector similarity search
    await prisma.$executeRaw`
      CREATE INDEX documents_embedding_idx 
      ON documents 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `;

    console.log('✅ Documents table created successfully with vector support!');
  } catch (error) {
    console.error('Error creating vector table:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createVectorTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

