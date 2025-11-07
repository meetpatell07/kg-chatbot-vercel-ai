# Knowledge-Grounded Chatbot System

A functional prototype of a Knowledge-Grounded Chatbot System built with Next.js, Vercel AI SDK, Neon PostgreSQL with pgvector, and Google's Gemini model.

## Features

- **Knowledge Base Only Mode**: Answers questions strictly based on internal documentation
- **LLM + KB Mode**: Augments knowledge base responses with LLM or falls back to LLM when KB doesn't have the answer
- **Vector Database**: Uses Neon PostgreSQL with pgvector extension for efficient semantic search
- **Simple Chat Interface**: Clean, functional UI with toggle switch and source citations

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI SDK**: Vercel AI SDK (`ai` package)
- **LLM Provider**: Google Gemini 2.5 Flash
- **Embeddings**: Google's `text-embedding-004` model
- **Database**: Neon PostgreSQL (for users, sessions, messages)
- **Vector Database**: Chroma Cloud (for document embeddings)
- **ORM**: Prisma (for relational data)
- **Styling**: Tailwind CSS

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

This will automatically generate the Prisma Client after installation (via `postinstall` script).

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
DATABASE_URL=postgresql://neondb_owner:password@host/neondb?sslmode=require
CHROMA_API_KEY=your_chroma_api_key
CHROMA_TENANT=your_chroma_tenant_id
CHROMA_DATABASE=your_chroma_database_name
```

**Note**: 
- `DATABASE_URL` points to your Neon PostgreSQL database (for users, sessions, messages)
- Chroma Cloud credentials are for document vector storage

### 3. Ingest Documents into Vector Database

Run the ingestion script to process the FAQ document and create embeddings:

```bash
pnpm ingest
```

This will:
- Read the FAQ document from `data/faq.md`
- Split it into chunks
- Generate embeddings using Google's embedding model
- Store everything in Chroma Cloud (vector database)

### 4. Start the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Toggle Modes

- **OFF (Knowledge Base Only)**: The chatbot will only answer questions based on the ingested FAQ document. If it doesn't find relevant information, it will say so.
- **ON (LLM + KB)**: The chatbot will first try to find answers in the knowledge base. If found, it augments the response with LLM. If not found, it falls back to using the LLM directly.

### Example Questions

Try asking:
- "What is TechCorp Cloud Services?"
- "What is your pricing model?"
- "How secure is your platform?"
- "What support options are available?"
- "How do I get started?"

## Project Structure

```
.
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # API route for chat endpoint
│   └── page.tsx                   # Main chat interface
├── data/
│   └── faq.md                     # Sample FAQ document
├── lib/
│   ├── neon-db.ts                 # Neon database utilities (using Prisma)
│   └── prisma.ts                  # Prisma client instance
├── prisma/
│   └── schema.prisma              # Prisma schema definition
└── scripts/
    └── ingest-documents.ts       # Document ingestion script
```

## How It Works

1. **Document Ingestion**:
   - The FAQ document is split into semantic chunks
   - Each chunk is embedded using Google's embedding model
   - Embeddings are stored in Chroma Cloud (vector database)

2. **Query Processing**:
   - User query is embedded using the same model
   - Vector similarity search (cosine distance) finds the most relevant chunks
   - Context is retrieved and passed to the LLM

3. **Response Generation**:
   - **KB Only Mode**: Uses RAG (Retrieval-Augmented Generation) with strict KB context
   - **LLM + KB Mode**: Augments KB context with LLM knowledge or uses LLM as fallback

## Architecture

- **Relational Data** (Users, Sessions, Messages): Stored in Neon PostgreSQL using Prisma ORM
- **Vector Data** (Document Embeddings): Stored in Chroma Cloud for optimized vector search

## Notes

- Documents are stored in Chroma Cloud (optimized for vector operations)
- User data, sessions, and messages are stored in Neon PostgreSQL (optimized for relational queries)
- Re-run `pnpm ingest` if you update the FAQ document
- The system uses cosine distance for vector search (0 = identical, 2 = opposite)
- Distance threshold of 1.0 is used to determine if KB has a good match

## License

MIT
