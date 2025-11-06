import { neon } from '@neondatabase/serverless';

// Parse connection string
const connectionString = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_MRXayem8oG6Z@ep-odd-union-ahyd8s3l-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(connectionString);

// Initialize database schema
export async function initializeDatabase() {
  try {
    // Enable pgvector extension
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
    
    // Drop table if exists to recreate with correct schema
    await sql`DROP TABLE IF EXISTS documents;`;
    
    // Create documents table with vector column (using dynamic dimension)
    // Google text-embedding-004 produces 768-dimensional vectors
    await sql`
      CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding vector(768),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    // Create index for vector similarity search (HNSW is better for production, but ivfflat works too)
    await sql`
      CREATE INDEX documents_embedding_idx 
      ON documents 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `;
    
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
    // Delete existing documents
    await sql`DELETE FROM documents;`;
    
    // Insert new documents in batches for better performance
    const batchSize = 10;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        const idx = i + j;
        // Convert embedding array to PostgreSQL vector format: [0.1,0.2,0.3]
        const embeddingStr = '[' + embeddings[idx].join(',') + ']';
        
        await sql`
          INSERT INTO documents (id, content, embedding, metadata)
          VALUES (
            ${ids[idx]}, 
            ${documents[idx]}, 
            ${embeddingStr}::vector, 
            ${JSON.stringify(metadatas[idx] || {})}::jsonb
          )
        `;
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
    const results = await sql`
      SELECT 
        content,
        metadata,
        embedding <=> ${embeddingStr}::vector as distance
      FROM documents
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${topK}
    `;
    
    return results.map((row: any) => ({
      content: row.content,
      metadata: row.metadata || {},
      distance: parseFloat(row.distance) || 1.0, // Cosine distance
    }));
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    throw error;
  }
}

// Clear all documents
export async function clearDocuments(): Promise<void> {
  try {
    await sql`DELETE FROM documents;`;
    console.log('✅ Cleared all documents');
  } catch (error) {
    console.error('Error clearing documents:', error);
    throw error;
  }
}

// Get all document IDs
export async function getDocumentIds(): Promise<string[]> {
  try {
    const results = await sql`SELECT id FROM documents;`;
    return results.map((row: any) => row.id);
  } catch (error) {
    console.error('Error getting document IDs:', error);
    return [];
  }
}

