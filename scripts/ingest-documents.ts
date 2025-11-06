import { google } from '@ai-sdk/google';
import { embed } from 'ai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { initializeDatabase, addDocuments, clearDocuments } from '../lib/neon-db';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function ingestDocuments() {
  console.log('Starting document ingestion...');

  // Initialize database
  await initializeDatabase();

  // Read the FAQ document
  const faqPath = path.join(process.cwd(), 'data', 'faq.md');
  const document = fs.readFileSync(faqPath, 'utf-8');

  // Split document into chunks (simple approach: by sections)
  const chunks = splitDocumentIntoChunks(document);

  console.log(`Split document into ${chunks.length} chunks`);

  // Clear existing data
  await clearDocuments();

  // Generate embeddings and add to vector store
  const ids: string[] = [];
  const embeddings: number[][] = [];
  const documents: string[] = [];
  const metadatas: Array<{ source: string; chunkIndex: number }> = [];

  console.log('Generating embeddings...');

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Generate embedding using Google's embedding model
    const { embedding } = await embed({
      model: google.embedding('text-embedding-004'),
      value: chunk,
    });

    ids.push(`chunk-${i}`);
    embeddings.push(embedding);
    documents.push(chunk);
    metadatas.push({
      source: 'Internal Docs',
      chunkIndex: i,
    });

    if ((i + 1) % 10 === 0) {
      console.log(`Processed ${i + 1}/${chunks.length} chunks`);
    }
  }

  // Add to Neon database
  await addDocuments(ids, embeddings, documents, metadatas);

  console.log(`✅ Successfully ingested ${chunks.length} chunks into Neon database!`);
}

function splitDocumentIntoChunks(document: string, chunkSize: number = 500, overlap: number = 50): string[] {
  // Split by sections first (marked by ## or ###)
  const sections = document.split(/(?=^##? )/m).filter(s => s.trim());
  
  const chunks: string[] = [];
  
  for (const section of sections) {
    // If section is small enough, add it as-is
    if (section.length <= chunkSize) {
      chunks.push(section.trim());
    } else {
      // Split large sections into smaller chunks
      const words = section.split(/\s+/);
      let currentChunk = '';
      
      for (const word of words) {
        if ((currentChunk + ' ' + word).length > chunkSize && currentChunk) {
          chunks.push(currentChunk.trim());
          // Add overlap
          const wordsInChunk = currentChunk.split(/\s+/);
          currentChunk = wordsInChunk.slice(-overlap).join(' ') + ' ' + word;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + word;
        }
      }
      
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    }
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

// Run ingestion
ingestDocuments().catch(console.error);

