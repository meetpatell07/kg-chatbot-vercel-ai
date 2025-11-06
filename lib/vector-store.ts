import fs from 'fs';
import path from 'path';

interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
}

// Simple cosine similarity calculation
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// Convert cosine similarity to distance (1 - similarity)
function similarityToDistance(similarity: number): number {
  return 1 - similarity;
}

class SimpleVectorStore {
  private documents: VectorDocument[] = [];
  private storagePath: string;

  constructor(collectionName: string = 'techcorp-faq') {
    const storageDir = path.join(process.cwd(), '.vector-store');
    this.storagePath = path.join(storageDir, `${collectionName}.json`);

    // Create storage directory if it doesn't exist
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    // Load existing data if available
    this.load();
  }

  private load(): void {
    if (fs.existsSync(this.storagePath)) {
      try {
        const data = fs.readFileSync(this.storagePath, 'utf-8');
        this.documents = JSON.parse(data);
      } catch (error) {
        console.error('Error loading vector store:', error);
        this.documents = [];
      }
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(this.documents, null, 2));
    } catch (error) {
      console.error('Error saving vector store:', error);
    }
  }

  async add(
    ids: string[],
    embeddings: number[][],
    documents: string[],
    metadatas: Record<string, any>[]
  ): Promise<void> {
    // Clear existing documents
    this.documents = [];

    // Add new documents
    for (let i = 0; i < ids.length; i++) {
      this.documents.push({
        id: ids[i],
        content: documents[i],
        embedding: embeddings[i],
        metadata: metadatas[i] || {},
      });
    }

    this.save();
  }

  async query(
    queryEmbedding: number[],
    topK: number = 3
  ): Promise<Array<{ content: string; metadata: any; distance: number }>> {
    // Calculate similarity for all documents
    const results = this.documents.map((doc) => {
      const similarity = cosineSimilarity(queryEmbedding, doc.embedding);
      const distance = similarityToDistance(similarity);
      return {
        content: doc.content,
        metadata: doc.metadata,
        distance,
        similarity,
      };
    });

    // Sort by similarity (highest first) and take top K
    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, topK).map(({ similarity, ...rest }) => rest);
  }

  async delete(ids?: string[]): Promise<void> {
    if (ids) {
      this.documents = this.documents.filter((doc) => !ids.includes(doc.id));
    } else {
      this.documents = [];
    }
    this.save();
  }

  async get(): Promise<{ ids: string[] }> {
    return {
      ids: this.documents.map((doc) => doc.id),
    };
  }
}

const store = new SimpleVectorStore('techcorp-faq');

export async function searchKnowledgeBase(
  queryEmbedding: number[],
  topK: number = 3
): Promise<Array<{ content: string; metadata: any; distance: number }>> {
  return store.query(queryEmbedding, topK);
}

export async function addToVectorStore(
  ids: string[],
  embeddings: number[][],
  documents: string[],
  metadatas: Record<string, any>[]
): Promise<void> {
  return store.add(ids, embeddings, documents, metadatas);
}

export async function clearVectorStore(ids?: string[]): Promise<void> {
  return store.delete(ids);
}

export async function getVectorStoreIds(): Promise<string[]> {
  const result = await store.get();
  return result.ids;
}

