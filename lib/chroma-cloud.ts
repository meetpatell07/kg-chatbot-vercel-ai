import { CloudClient } from 'chromadb';
import { google } from '@ai-sdk/google';
import { embed } from 'ai';

const CHROMA_COLLECTION_NAME = 'techcorp-faq';

// Initialize Chroma Cloud client
const client = new CloudClient({
  apiKey: process.env.CHROMA_API_KEY || 'ck-DEWJxQqjUsezXTnP7MWsNUfxJiNrv4H9EqUPifJXQpiZ',
  tenant: process.env.CHROMA_TENANT || '03ca1362-f9f5-4a27-80f3-d0928238a9e5',
  database: process.env.CHROMA_DATABASE || 'kg-chatbot',
});

let collection: any = null;

// Get or create collection
export async function getChromaCollection() {
  if (collection) {
    return collection;
  }

  try {
    // Try to get existing collection first
    try {
      collection = await client.getCollection({
        name: CHROMA_COLLECTION_NAME,
      });
      console.log('Connected to existing Chroma Cloud collection');
    } catch (error) {
      // Collection doesn't exist, create it
      // Chroma Cloud requires an embedding function, but we provide our own embeddings
      // The embedding function won't be used since we always pass embeddings directly
      const { DefaultEmbeddingFunction } = await import('@chroma-core/default-embed');
      const embeddingFunction = new DefaultEmbeddingFunction();
      
      collection = await client.createCollection({
        name: CHROMA_COLLECTION_NAME,
        embeddingFunction: embeddingFunction,
      });
      console.log('✅ Created new Chroma Cloud collection');
    }
  } catch (error) {
    console.error('Error getting Chroma collection:', error);
    throw error;
  }

  return collection;
}

// Add documents to Chroma Cloud
export async function addDocumentsToChroma(
  ids: string[],
  embeddings: number[][],
  documents: string[],
  metadatas: Record<string, any>[]
): Promise<void> {
  try {
    const collection = await getChromaCollection();

    // Clear existing data
    try {
      const existing = await collection.get();
      if (existing.ids && existing.ids.length > 0) {
        await collection.delete({ ids: existing.ids });
      }
    } catch (error) {
      // Collection might be empty, that's okay
    }

    // Add documents in batches
    const batchSize = 100;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);
      const batchEmbeddings = embeddings.slice(i, i + batchSize);
      const batchDocuments = documents.slice(i, i + batchSize);
      const batchMetadatas = metadatas.slice(i, i + batchSize);

      await collection.add({
        ids: batchIds,
        embeddings: batchEmbeddings,
        documents: batchDocuments,
        metadatas: batchMetadatas,
      });

      if ((i + batchSize) % 100 === 0) {
        console.log(`Added ${Math.min(i + batchSize, ids.length)}/${ids.length} documents to Chroma Cloud`);
      }
    }

    console.log(`✅ Added ${ids.length} documents to Chroma Cloud`);
  } catch (error) {
    console.error('Error adding documents to Chroma:', error);
    throw error;
  }
}

// Search for similar documents in Chroma Cloud
export async function searchChromaKnowledgeBase(
  queryEmbedding: number[],
  topK: number = 3
): Promise<Array<{ content: string; metadata: any; distance: number }>> {
  try {
    const collection = await getChromaCollection();

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
    });

    if (!results.documents || results.documents.length === 0 || !results.documents[0]) {
      return [];
    }

    const documents = results.documents[0];
    const metadatas = results.metadatas?.[0] || [];
    const distances = results.distances?.[0] || [];

    return documents.map((doc: string, index: number) => ({
      content: doc,
      metadata: metadatas[index] || {},
      distance: distances[index] || 0,
    }));
  } catch (error) {
    console.error('Error searching Chroma Cloud:', error);
    throw error;
  }
}

// Clear all documents from Chroma Cloud
export async function clearChromaDocuments(): Promise<void> {
  try {
    const collection = await getChromaCollection();
    const existing = await collection.get();
    if (existing.ids && existing.ids.length > 0) {
      await collection.delete({ ids: existing.ids });
    }
    console.log('✅ Cleared all documents from Chroma Cloud');
  } catch (error) {
    console.error('Error clearing Chroma documents:', error);
    throw error;
  }
}

