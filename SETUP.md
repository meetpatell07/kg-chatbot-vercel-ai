# Quick Setup Guide

## Step 1: Create Environment File

Create a `.env.local` file in the root directory with your Google API key and Neon database URL:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
DATABASE_URL=postgresql://neondb_owner:npg_MRXayem8oG6Z@ep-odd-union-ahyd8s3l-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## Step 2: Ingest Documents

Run the ingestion script to process the FAQ document:

```bash
pnpm ingest
```

This will:
- Read `data/faq.md`
- Initialize Neon database with pgvector extension
- Generate embeddings for each chunk
- Store in Neon PostgreSQL database

**Expected output:**
```
Starting document ingestion...
✅ Database initialized successfully
Split document into X chunks
Generating embeddings...
Processed 10/X chunks
...
✅ Added X documents to database
✅ Successfully ingested X chunks into Neon database!
```

## Step 3: Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Testing

1. **Test KB Only Mode** (toggle OFF):
   - Ask: "What is TechCorp Cloud Services?"
   - Should get answer from knowledge base with "Source: Internal Docs"

2. **Test LLM + KB Mode** (toggle ON):
   - Ask: "What is TechCorp Cloud Services?"
   - Should get augmented answer with "Source: Internal Docs + LLM"
   - Ask: "What is the weather today?"
   - Should get LLM answer with "Source: LLM" (not in KB)

## Troubleshooting

### "Table not found" or database errors
- Make sure you ran `pnpm ingest` first (this initializes the database schema)
- Verify your `DATABASE_URL` is correct in `.env.local`
- Ensure pgvector extension is enabled in your Neon database

### "API key not found" error
- Check that `.env.local` exists and has the correct key
- Restart the dev server after creating `.env.local`

### Embedding errors
- Verify your Google API key has access to the embedding model
- Check your API quota/limits

### Database connection errors
- Verify your Neon database connection string is correct
- Check that the pgvector extension is enabled: `CREATE EXTENSION IF NOT EXISTS vector;`
- Ensure your Neon database is accessible and not paused

