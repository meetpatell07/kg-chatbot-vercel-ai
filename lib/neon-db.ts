import { prisma } from './prisma';

// Initialize database schema
export async function initializeDatabase() {
  try {
    // Enable pgvector extension using raw SQL
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector;`;
    
    // Drop existing tables if they exist (in correct order due to foreign keys)
    await prisma.$executeRaw`DROP TABLE IF EXISTS messages CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS sessions CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS users CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS documents CASCADE;`;
    
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
    
    // Create users table
    await prisma.$executeRaw`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE,
        name TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    // Create sessions table
    await prisma.$executeRaw`
      CREATE TABLE sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    // Create messages table
    await prisma.$executeRaw`
      CREATE TABLE messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX documents_embedding_idx 
      ON documents 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `;
    
    await prisma.$executeRaw`CREATE INDEX messages_session_id_idx ON messages(session_id);`;
    await prisma.$executeRaw`CREATE INDEX sessions_user_id_idx ON sessions(user_id);`;
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Add documents to database
export async function addDocuments(
  ids: string[],
  embeddings: number[][],
  documents: string[],
  metadatas: Record<string, any>[]
): Promise<void> {
  try {
    // Delete existing documents using Prisma
    await prisma.document.deleteMany({});
    
    // Insert new documents in batches
    const batchSize = 10;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        const idx = i + j;
        // Convert embedding array to PostgreSQL vector format: [0.1,0.2,0.3]
        const embeddingStr = '[' + embeddings[idx].join(',') + ']';
        
        // Use raw SQL for vector insertion since Prisma doesn't support vector type directly
        await prisma.$executeRawUnsafe(
          `INSERT INTO documents (id, content, embedding, metadata)
           VALUES ($1, $2, $3::vector, $4::jsonb)`,
          ids[idx],
          documents[idx],
          embeddingStr,
          JSON.stringify(metadatas[idx] || {})
        );
      }
      
      if ((i + batchSize) % 50 === 0) {
        console.log(`Inserted ${Math.min(i + batchSize, ids.length)}/${ids.length} documents`);
      }
    }
    
    console.log(`✅ Added ${ids.length} documents to database`);
  } catch (error) {
    console.error('Error adding documents:', error);
    throw error;
  }
}

// Search for similar documents
export async function searchKnowledgeBase(
  queryEmbedding: number[],
  topK: number = 3
): Promise<Array<{ content: string; metadata: any; distance: number }>> {
  try {
    // Convert embedding array to PostgreSQL vector format: [0.1,0.2,0.3]
    const embeddingStr = '[' + queryEmbedding.join(',') + ']';
    
    // Use cosine distance (<=>) for similarity search
    // <=> returns cosine distance (0 = identical, 2 = opposite)
    const results = await prisma.$queryRawUnsafe<
      Array<{
        content: string;
        metadata: any;
        distance: number;
      }>
    >(
      `SELECT 
        content,
        metadata,
        embedding <=> $1::vector as distance
      FROM documents
      ORDER BY embedding <=> $1::vector
      LIMIT $2`,
      embeddingStr,
      topK
    );
    
    return results.map((row: { content: string; metadata: any; distance: number | string }) => ({
      content: row.content,
      metadata: row.metadata || {},
      distance: typeof row.distance === 'number' ? row.distance : parseFloat(String(row.distance)) || 1.0,
    }));
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    throw error;
  }
}

// Clear all documents
export async function clearDocuments(): Promise<void> {
  try {
    await prisma.document.deleteMany({});
    console.log('✅ Cleared all documents');
  } catch (error) {
    console.error('Error clearing documents:', error);
    throw error;
  }
}

// Get all document IDs
export async function getDocumentIds(): Promise<string[]> {
  try {
    const documents = await prisma.document.findMany({
      select: { id: true },
    });
    return documents.map((doc: { id: string }) => doc.id);
  } catch (error) {
    console.error('Error getting document IDs:', error);
    return [];
  }
}
