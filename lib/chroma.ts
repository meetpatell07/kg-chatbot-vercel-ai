import { ChromaClient, Collection } from 'chromadb';
import path from 'path';

const CHROMA_COLLECTION_NAME = 'techcorp-faq';

let client: ChromaClient | null = null;
let collection: Collection | null = null;

export async function getChromaCollection(): Promise<Collection> {
  if (collection) {
    return collection;
  }

  if (!client) {
    // Chroma 3.x uses default local storage
    client = new ChromaClient();
  }

  try {
    collection = await client.getOrCreateCollection({
      name: CHROMA_COLLECTION_NAME,
    });
  } catch (error) {
    console.error('Error getting Chroma collection:', error);
    throw error;
  }

  return collection;
}

export async function searchKnowledgeBase(
  queryEmbedding: number[],
  topK: number = 3
): Promise<Array<{ content: string; metadata: any; distance: number }>> {
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

  return documents.map((doc, index) => ({
    content: doc,
    metadata: metadatas[index] || {},
    distance: distances[index] || 0,
  }));
}

