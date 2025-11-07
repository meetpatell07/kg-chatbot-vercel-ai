# Architecture Documentation

## System Overview

The Knowledge-Grounded Chatbot System is a hybrid RAG (Retrieval-Augmented Generation) application that combines internal document knowledge with general LLM capabilities. The system uses a dual-database architecture to optimize for both relational data management and vector similarity search.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │              Next.js Frontend (React)                         │     │
│  │  - Chat Interface                                             │     │
│  │  - Session Management                                         │     │
│  │  - Toggle Switch (KB Only / LLM + KB)                        │     │
│  └──────────────────────┬───────────────────────────────────────┘     │
└──────────────────────────┼─────────────────────────────────────────────┘
                           │ HTTP/REST API
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │              Next.js API Routes                                │     │
│  │  - /api/chat          → Main chat endpoint                     │     │
│  │  - /api/sessions      → Session management                     │     │
│  │  - /api/sessions/[id] → Session operations                    │     │
│  └──────────────────────┬───────────────────────────────────────┘     │
└──────────────────────────┼─────────────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────────────┐          ┌──────────────────────────────┐
│   BUSINESS LOGIC     │          │     VERCEL AI SDK            │
│                      │          │                              │
│  - Query Processing  │          │  - generateText()            │
│  - Response Routing  │          │  - embed()                    │
│  - Session Management│          │  - Google Gemini 2.5 Flash   │
│  - Source Tracking   │          │  - text-embedding-004        │
└──────────┬───────────┘          └──────────────┬───────────────┘
           │                                      │
           │                                      │
           ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                     │
│                                                                          │
│  ┌──────────────────────────┐    ┌──────────────────────────────┐     │
│  │   Neon PostgreSQL        │    │      Chroma Cloud            │     │
│  │   (Relational Data)      │    │      (Vector Data)           │     │
│  │                          │    │                              │     │
│  │  ┌──────────────────┐   │    │  ┌──────────────────────┐   │     │
│  │  │  Users Table     │   │    │  │  Document Embeddings │   │     │
│  │  └──────────────────┘   │    │  │  - Chunk Vectors    │   │     │
│  │                          │    │  │  - Metadata         │   │     │
│  │  ┌──────────────────┐   │    │  │  - Similarity Search │   │     │
│  │  │  Sessions Table   │   │    │  └──────────────────────┘   │     │
│  │  └──────────────────┘   │    │                              │     │
│  │                          │    │  Managed via:                │     │
│  │  ┌──────────────────┐   │    │  - CloudClient API          │     │
│  │  │  Messages Table  │   │    │  - Cosine Distance Search   │     │
│  │  │  - content       │   │    │                              │     │
│  │  │  - source        │   │    │                              │     │
│  │  │  - role          │   │    │                              │     │
│  │  └──────────────────┘   │    │                              │     │
│  │                          │    │                              │     │
│  │  Managed via:            │    │                              │     │
│  │  - Prisma ORM            │    │                              │     │
│  │  - ACID Transactions     │    │                              │     │
│  └──────────────────────────┘    └──────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      INGESTION PIPELINE                                 │
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│  │  FAQ.md     │───▶│  Chunking    │───▶│  Embedding   │             │
│  │  Document   │    │  (500 chars) │    │  Generation  │             │
│  └──────────────┘    └──────────────┘    └──────┬───────┘             │
│                                                  │                      │
│                                                  ▼                      │
│                                         ┌──────────────────┐           │
│                                         │  Chroma Cloud    │           │
│                                         │  Storage         │           │
│                                         └──────────────────┘           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Technology Justifications

### Programming Language: TypeScript

**Why TypeScript?**
- **Type Safety**: Catches errors at compile-time, reducing runtime bugs
- **Better IDE Support**: Enhanced autocomplete, refactoring, and navigation
- **Next.js Native Support**: Next.js is built with TypeScript in mind
- **Team Collaboration**: Self-documenting code through type definitions
- **Gradual Adoption**: Can mix JavaScript and TypeScript if needed

### Framework: Next.js 16 (App Router)

**Why Next.js?**
- **Full-Stack Framework**: Unified solution for frontend and API routes
- **Server-Side Rendering**: Better SEO and initial load performance
- **API Routes**: Built-in API endpoints without separate backend server
- **File-Based Routing**: Intuitive routing structure
- **Vercel Integration**: Seamless deployment and optimization
- **React Ecosystem**: Leverages React's component model
- **Turbopack**: Fast build times with Next.js 16's new bundler

### Vector Database: Chroma Cloud

**Why Chroma Cloud?**
- **Managed Service**: No infrastructure management required
- **Optimized for Vectors**: Built specifically for embedding storage and search
- **Scalability**: Handles large-scale vector operations efficiently
- **Simple API**: Easy integration with existing codebase
- **Cloud-Native**: Works seamlessly with serverless deployments
- **Cost-Effective**: Pay-as-you-go pricing model
- **Separation of Concerns**: Keeps vector operations separate from relational data

**Alternative Considered**: Neon PostgreSQL with pgvector
- **Rejected Because**: Prisma doesn't natively support vector types, requiring raw SQL queries
- **Hybrid Approach**: Use Chroma for vectors, Neon for relational data (best of both worlds)

### Relational Database: Neon PostgreSQL

**Why Neon PostgreSQL?**
- **Serverless Architecture**: Auto-scaling, pay-per-use model
- **PostgreSQL Compatibility**: Full SQL support with modern features
- **Prisma Integration**: Excellent ORM support with type-safe queries
- **ACID Compliance**: Ensures data integrity for critical operations
- **Connection Pooling**: Built-in connection management
- **Branching**: Database branching for development workflows
- **Cost-Effective**: Free tier available for development

### ORM: Prisma

**Why Prisma?**
- **Type Safety**: Auto-generated TypeScript types from schema
- **Migration System**: Version-controlled database changes
- **Developer Experience**: Intuitive query API, excellent tooling
- **Performance**: Query optimization and connection pooling
- **Schema Management**: Single source of truth for database structure
- **Studio**: Visual database browser and editor

### LLM Provider: Google Gemini 2.5 Flash

**Why Gemini 2.5 Flash?**
- **Cost-Effective**: Lower cost per token compared to other models
- **Fast Response Times**: Optimized for speed
- **Good Quality**: Competitive performance for general tasks
- **Vercel AI SDK Support**: Native integration via `@ai-sdk/google`
- **Embedding Model**: Unified provider for both embeddings and generation

### Embedding Model: Google text-embedding-004

**Why text-embedding-004?**
- **Consistency**: Same provider as LLM (simplifies architecture)
- **Quality**: High-quality embeddings for semantic search
- **768 Dimensions**: Optimal balance between accuracy and storage
- **Cost**: Competitive pricing for embedding generation
- **Integration**: Seamless integration with Vercel AI SDK

### AI SDK: Vercel AI SDK

**Why Vercel AI SDK?**
- **Unified Interface**: Consistent API for different LLM providers
- **Streaming Support**: Built-in support for streaming responses
- **Type Safety**: TypeScript-first design
- **Framework Integration**: Designed for Next.js and React
- **Embedding Support**: Unified API for both text generation and embeddings

## Response Pathway Logic

The system implements a dual-mode response generation strategy based on user preference and knowledge base match quality.

### Decision Flow

```
User Query
    │
    ├─▶ Generate Query Embedding (text-embedding-004)
    │
    ├─▶ Search Chroma Cloud (Top 3 results)
    │
    ├─▶ Calculate Cosine Distance
    │
    └─▶ Evaluate Match Quality
            │
            ├─▶ Distance < 1.0? ──▶ Good Match
            │                      │
            └─▶ Distance ≥ 1.0? ──▶ Poor/No Match
```

### Mode 1: Knowledge Base Only (useLLM = false)

**Logic:**
```
IF (hasGoodMatch) {
    // Use RAG with strict KB context
    response = generateText({
        system: "Answer ONLY from provided context",
        prompt: KB_Context + User_Question
    })
    source = "Internal Docs"
} ELSE {
    // No good match found
    response = "I don't have enough information in the knowledge base..."
    source = "None"
}
```

**Characteristics:**
- **Strict**: Only uses information from knowledge base
- **No Hallucination**: Cannot make up answers
- **Transparent**: Clearly states when information is unavailable
- **Use Case**: When accuracy and source verification are critical

### Mode 2: LLM + Knowledge Base (useLLM = true)

**Logic:**
```
IF (hasGoodMatch) {
    // Augment KB context with LLM knowledge
    response = generateText({
        system: "Use KB context, can supplement with general knowledge",
        prompt: KB_Context + User_Question
    })
    source = "Internal Docs + LLM"
} ELSE {
    // Fallback to pure LLM
    response = generateText({
        prompt: User_Question
    })
    source = "LLM"
}
```

**Characteristics:**
- **Flexible**: Can answer questions beyond knowledge base
- **Augmented**: Enhances KB answers with additional context
- **Fallback**: Uses LLM when KB has no relevant information
- **Use Case**: When general knowledge and completeness are important

### Similarity Threshold

**Cosine Distance Calculation:**
- **Range**: 0 to 2
- **0**: Identical vectors (perfect match)
- **1**: Orthogonal vectors (no similarity)
- **2**: Opposite vectors (maximum dissimilarity)

**Threshold Decision:**
- **Threshold**: `< 1.0` (considered a "good match")
- **Rationale**: 
  - Values < 1.0 indicate some semantic similarity
  - Values ≥ 1.0 suggest the query is unrelated to the knowledge base
  - This threshold balances precision and recall

**Top-K Retrieval:**
- **K = 3**: Retrieves top 3 most similar chunks
- **Context Limit**: 2000 characters (prevents token overflow)
- **Ranking**: Results sorted by cosine distance (ascending)

## Data Flow

### 1. Document Ingestion Flow

```
FAQ.md
  │
  ├─▶ Split into chunks (500 chars, 50 char overlap)
  │
  ├─▶ Generate embeddings (text-embedding-004)
  │
  ├─▶ Store in Chroma Cloud
  │   ├─ IDs: chunk-0, chunk-1, ...
  │   ├─ Embeddings: [768-dim vectors]
  │   ├─ Documents: [chunk text]
  │   └─ Metadata: {source, chunkIndex}
  │
  └─▶ Collection ready for queries
```

### 2. Query Processing Flow

```
User Message
  │
  ├─▶ Save to Neon (Prisma)
  │   └─ messages table
  │
  ├─▶ Generate embedding
  │   └─ text-embedding-004
  │
  ├─▶ Vector Search (Chroma Cloud)
  │   ├─ Query: queryEmbedding
  │   ├─ Top-K: 3
  │   └─ Return: {content, metadata, distance}
  │
  ├─▶ Evaluate Match Quality
  │   └─ distance < 1.0?
  │
  ├─▶ Route to Response Generator
  │   ├─ KB Only Mode
  │   └─ LLM + KB Mode
  │
  ├─▶ Generate Response (Gemini 2.5 Flash)
  │
  ├─▶ Save Response to Neon
  │   ├─ messages table
  │   └─ source tracking
  │
  └─▶ Return to Client
```

### 3. Session Management Flow

```
Session Creation
  │
  ├─▶ Generate UUID
  │
  ├─▶ Create in Neon (Prisma)
  │   └─ sessions table
  │
  └─▶ Return sessionId

Message Persistence
  │
  ├─▶ User Message
  │   └─ Save to messages table
  │
  ├─▶ Assistant Response
  │   ├─ Save to messages table
  │   ├─ Include source
  │   └─ Update session.updatedAt
  │
  └─▶ Maintain conversation history
```

## Key Architectural Decisions

### 1. Hybrid Database Architecture

**Decision**: Separate Chroma Cloud (vectors) and Neon PostgreSQL (relational)

**Rationale:**
- **Optimization**: Each database optimized for its use case
- **Scalability**: Vector operations don't impact relational queries
- **Maintainability**: Clear separation of concerns
- **Cost**: Use best tool for each job

**Trade-offs:**
- **Complexity**: Two databases to manage
- **Consistency**: No single source of truth for all data
- **Mitigation**: Clear boundaries and well-defined responsibilities

### 2. Source Tracking

**Decision**: Store response source with each message

**Rationale:**
- **Transparency**: Users know where answers come from
- **Audit Trail**: Track which mode was used
- **Analytics**: Understand system behavior
- **Trust**: Build user confidence

**Implementation:**
- `source` field in `messages` table
- Values: "Internal Docs", "LLM", "Internal Docs + LLM", "None"

### 3. Session-Based Architecture

**Decision**: Organize conversations by sessions

**Rationale:**
- **Context Management**: Maintain conversation history
- **User Experience**: Switch between multiple conversations
- **Scalability**: Efficient querying by session
- **Data Organization**: Logical grouping of related messages

**Implementation:**
- `sessions` table with UUID primary key
- `messages` table with `sessionId` foreign key
- Cascade delete for data cleanup

### 4. Chunking Strategy

**Decision**: 500-character chunks with 50-character overlap

**Rationale:**
- **Balance**: Not too small (loses context) or too large (noisy)
- **Overlap**: Prevents information loss at boundaries
- **Section-Aware**: Splits by markdown headers first
- **Token Efficiency**: Fits within LLM context windows

**Improvements Possible:**
- Semantic chunking (by topic)
- Dynamic chunk sizes
- Metadata enrichment

### 5. Embedding Strategy

**Decision**: Generate embeddings at ingestion time

**Rationale:**
- **Performance**: Pre-computed embeddings = faster queries
- **Cost**: Embedding generation is expensive (do once)
- **Consistency**: Same embedding model for ingestion and queries
- **Scalability**: Can handle many concurrent queries

**Trade-offs:**
- **Storage**: Requires vector storage space
- **Updates**: Re-ingest when documents change
- **Acceptable**: Documents change infrequently

### 6. Error Handling

**Decision**: Graceful degradation with user-friendly messages

**Rationale:**
- **User Experience**: Never show technical errors
- **Reliability**: System continues functioning
- **Debugging**: Log errors server-side
- **Transparency**: Clear communication about failures

**Implementation:**
- Try-catch blocks around critical operations
- Fallback responses
- Error logging for debugging
- User-facing error messages

## Performance Considerations

### Optimization Strategies

1. **Embedding Caching**: Collection instance cached in memory
2. **Batch Processing**: Documents added in batches of 100
3. **Context Limiting**: 2000 character limit prevents token overflow
4. **Connection Pooling**: Prisma manages database connections
5. **Lazy Loading**: Chroma collection loaded on first use

### Scalability

1. **Horizontal Scaling**: Stateless API routes
2. **Database Scaling**: Neon auto-scales PostgreSQL
3. **Vector Scaling**: Chroma Cloud handles vector operations
4. **CDN**: Next.js static assets served via CDN
5. **Caching**: Consider Redis for frequently accessed data

## Security Considerations

1. **API Keys**: Stored in environment variables
2. **Input Validation**: All user inputs validated
3. **SQL Injection**: Prevented via Prisma parameterized queries
4. **Rate Limiting**: Consider adding rate limits for production
5. **CORS**: Configured via Next.js middleware
6. **Session Isolation**: Users can only access their own sessions

## Future Enhancements

1. **Multi-Document Support**: Ingest multiple documents
2. **Document Versioning**: Track document changes
3. **User Authentication**: Add user management
4. **Analytics Dashboard**: Track usage and performance
5. **Fine-Tuning**: Custom model fine-tuning
6. **Streaming Responses**: Real-time response streaming
7. **Citation Links**: Direct links to source documents
8. **Multi-Language Support**: Support for multiple languages

## Deployment Architecture

```
Vercel Platform
  │
  ├─▶ Next.js Application
  │   ├─ Frontend (React)
  │   ├─ API Routes (Node.js)
  │   └─ Build: Turbopack
  │
  ├─▶ Environment Variables
  │   ├─ GOOGLE_GENERATIVE_AI_API_KEY
  │   ├─ DATABASE_URL (Neon)
  │   ├─ CHROMA_API_KEY
  │   ├─ CHROMA_TENANT
  │   └─ CHROMA_DATABASE
  │
  ├─▶ External Services
  │   ├─ Neon PostgreSQL (Database)
  │   ├─ Chroma Cloud (Vector Store)
  │   └─ Google AI (LLM & Embeddings)
  │
  └─▶ Build Process
      ├─ Install Dependencies
      ├─ Generate Prisma Client
      ├─ Build Next.js App
      └─ Deploy to Edge
```

## Conclusion

This architecture provides a robust, scalable foundation for a knowledge-grounded chatbot system. The hybrid database approach optimizes for both relational data management and vector similarity search, while the dual-mode response system balances accuracy with flexibility. The use of modern, managed services reduces operational overhead while maintaining high performance and reliability.

