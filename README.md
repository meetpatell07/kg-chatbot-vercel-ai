# Knowledge-Grounded Chatbot System

A functional prototype of a Knowledge-Grounded Chatbot System built with Next.js, Vercel AI SDK, Neon PostgreSQL, Chroma Cloud, and Google's Gemini model. This system leverages a private, internal document knowledge base for primary responses and can consult a large language model for general or supplementary inquiries.

## Features

- **Knowledge Base Only Mode**: Answers questions strictly based on internal documentation
- **LLM + KB Mode**: Augments knowledge base responses with LLM or falls back to LLM when KB doesn't have the answer
- **Session Management**: Create, switch between, and manage multiple chat sessions
- **Chat History**: Persistent conversation history with source citations
- **Vector Database**: Uses Chroma Cloud for efficient semantic search of document embeddings
- **Modern UI**: Clean, responsive interface with custom scrollbars and smooth interactions

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI SDK**: Vercel AI SDK (`ai` package)
- **LLM Provider**: Google Gemini 2.5 Flash
- **Embeddings**: Google's `text-embedding-004` model
- **Database**: Neon PostgreSQL (for users, sessions, messages)
- **Vector Database**: Chroma Cloud (for document embeddings)
- **ORM**: Prisma (for relational data)
- **Styling**: Tailwind CSS 4

## Prerequisites

- Node.js 20+ and pnpm
- Neon PostgreSQL database
- Chroma Cloud account
- Google Generative AI API key

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

### 3. Set Up Database

Run Prisma migrations to create the database schema:

```bash
pnpm db:migrate
```

Or push the schema directly (for development):

```bash
pnpm db:push
```

This creates the following tables:
- `users` - User accounts
- `sessions` - Chat sessions
- `messages` - Chat messages with source citations

### 4. Ingest Documents into Vector Database

Run the ingestion script to process the FAQ document and create embeddings:

```bash
pnpm ingest
```

This will:
- Read the FAQ document from `data/faq.md`
- Split it into semantic chunks
- Generate embeddings using Google's embedding model
- Store everything in Chroma Cloud (vector database)

### 5. Start the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Chat Interface

The main interface consists of:
- **Sidebar**: List of all chat sessions with message counts
- **Main Chat Area**: Message history with source citations
- **Toggle Switch**: Enable/disable general LLM responses
- **Input Field**: Type your questions here

### Toggle Modes

- **OFF (Knowledge Base Only)**: The chatbot will only answer questions based on the ingested FAQ document. If it doesn't find relevant information, it will say so.
- **ON (LLM + KB)**: The chatbot will first try to find answers in the knowledge base. If found, it augments the response with LLM. If not found, it falls back to using the LLM directly.

### Session Management

- **Create New Session**: Click the "+ New Chat" button in the sidebar
- **Switch Sessions**: Click on any session in the sidebar to load its chat history
- **Session Persistence**: All messages are automatically saved and persist across page refreshes

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
│   │   ├── chat/
│   │   │   └── route.ts              # Chat API endpoint
│   │   └── sessions/
│   │       ├── route.ts              # List/Create sessions
│   │       └── [id]/
│   │           ├── route.ts           # Get/Update/Delete session
│   │           └── messages/
│   │               └── route.ts      # Get session messages
│   ├── globals.css                    # Global styles (including scrollbar)
│   ├── layout.tsx                     # Root layout
│   └── page.tsx                       # Main chat interface
├── data/
│   └── faq.md                         # Sample FAQ document
├── lib/
│   ├── chroma-cloud.ts               # Chroma Cloud client & utilities
│   └── prisma.ts                     # Prisma client instance
├── prisma/
│   ├── migrations/                   # Database migrations
│   └── schema.prisma                 # Prisma schema definition
└── scripts/
    └── ingest-documents.ts           # Document ingestion script
```

## API Endpoints

### Chat

- **POST** `/api/chat` - Send a message and get a response
  - Body: `{ message: string, useLLM: boolean, sessionId: string }`
  - Returns: `{ response: string, source: string, messageId: string, sessionId: string }`

### Sessions

- **GET** `/api/sessions` - List all sessions
- **POST** `/api/sessions` - Create a new session
- **GET** `/api/sessions/[id]` - Get a specific session
- **PATCH** `/api/sessions/[id]` - Update a session
- **DELETE** `/api/sessions/[id]` - Delete a session
- **GET** `/api/sessions/[id]/messages` - Get all messages for a session

For detailed API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

## How It Works

1. **Document Ingestion**:
   - The FAQ document is split into semantic chunks
   - Each chunk is embedded using Google's embedding model (`text-embedding-004`)
   - Embeddings are stored in Chroma Cloud (vector database)

2. **Query Processing**:
   - User query is embedded using the same model
   - Vector similarity search (cosine distance) finds the most relevant chunks
   - Context is retrieved and passed to the LLM

3. **Response Generation**:
   - **KB Only Mode**: Uses RAG (Retrieval-Augmented Generation) with strict KB context
   - **LLM + KB Mode**: Augments KB context with LLM knowledge or uses LLM as fallback
   - Response source is tracked and displayed (e.g., "Internal Docs", "LLM", "Internal Docs + LLM")

4. **Message Persistence**:
   - All user and assistant messages are saved to the database
   - Messages are associated with sessions
   - Source citations are stored with each assistant message

## Architecture

### Hybrid Database Approach

- **Relational Data** (Users, Sessions, Messages): Stored in Neon PostgreSQL using Prisma ORM
  - Optimized for structured queries and relationships
  - ACID compliance for data integrity
  
- **Vector Data** (Document Embeddings): Stored in Chroma Cloud
  - Optimized for vector similarity search
  - Handles embedding generation and storage
  - Efficient semantic search capabilities

### Data Flow

1. **Ingestion**: Documents → Chunks → Embeddings → Chroma Cloud
2. **Query**: User Message → Embedding → Chroma Search → Context Retrieval
3. **Generation**: Context + Query → LLM → Response
4. **Storage**: Messages → Prisma → Neon PostgreSQL

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm ingest` - Ingest documents into Chroma Cloud
- `pnpm db:generate` - Generate Prisma Client
- `pnpm db:migrate` - Run database migrations
- `pnpm db:push` - Push schema to database (dev only)
- `pnpm db:studio` - Open Prisma Studio (database GUI)

## UI/UX Features

- **Custom Scrollbars**: Styled scrollbars for better visibility
- **Responsive Layout**: Works on different screen sizes
- **Session Sidebar**: Easy navigation between chat sessions
- **Source Citations**: Clear indication of response sources
- **Loading States**: Visual feedback during API calls
- **Auto-scroll**: Messages automatically scroll to bottom

## Notes

- Documents are stored in Chroma Cloud (optimized for vector operations)
- User data, sessions, and messages are stored in Neon PostgreSQL (optimized for relational queries)
- Re-run `pnpm ingest` if you update the FAQ document
- The system uses cosine distance for vector search (0 = identical, 2 = opposite)
- Distance threshold of 1.0 is used to determine if KB has a good match
- Chroma Cloud requires an embedding function during collection creation, but we provide our own embeddings from Google's model

## Troubleshooting

### Chroma Cloud Collection Error

If you see an error about `DefaultEmbeddingFunction`, ensure `@chroma-core/default-embed` is installed. The collection is created with a default embedding function, but we provide our own embeddings when adding documents.

### Database Connection Issues

Make sure your `DATABASE_URL` is correct and includes SSL parameters:
```
postgresql://user:password@host/db?sslmode=require
```

### Missing Environment Variables

Ensure all required environment variables are set in `.env.local`:
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `DATABASE_URL`
- `CHROMA_API_KEY`
- `CHROMA_TENANT`
- `CHROMA_DATABASE`

## License

MIT
