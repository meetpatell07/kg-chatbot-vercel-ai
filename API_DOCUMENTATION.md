# API Documentation

## Overview

The Knowledge-Grounded Chatbot System provides RESTful APIs for managing chat sessions and messages, with integration to Chroma Cloud for vector search and Google Gemini for LLM responses.

## API Endpoints

### 1. Chat API

#### `POST /api/chat`

Send a message and get a response from the chatbot.

**Request Body:**
```json
{
  "message": "What is TechCorp Cloud Services?",
  "useLLM": false,
  "sessionId": "uuid-here"
}
```

**Response:**
```json
{
  "response": "TechCorp Cloud Services is a comprehensive...",
  "source": "Internal Docs",
  "messageId": "uuid",
  "sessionId": "uuid"
}
```

**Features:**
- ✅ Uses Google AI SDK (`generateText`, `embed`)
- ✅ KB Only mode when `useLLM: false`
- ✅ LLM + KB mode when `useLLM: true`
- ✅ Saves messages to database automatically
- ✅ Maintains session history

---

### 2. Sessions API

#### `GET /api/sessions`

Get all chat sessions.

**Query Parameters:**
- `userId` (optional): Filter sessions by user ID

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "title": "New Chat",
      "userId": null,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "user": null,
      "_count": {
        "messages": 5
      }
    }
  ]
}
```

#### `POST /api/sessions`

Create a new chat session.

**Request Body:**
```json
{
  "userId": "optional-user-id",
  "title": "Optional session title"
}
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "title": "New Chat",
    "userId": null,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### 3. Session by ID API

#### `GET /api/sessions/[id]`

Get a specific session by ID.

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "title": "New Chat",
    "userId": null,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "_count": {
      "messages": 5
    }
  }
}
```

#### `PATCH /api/sessions/[id]`

Update a session (e.g., change title).

**Request Body:**
```json
{
  "title": "Updated title"
}
```

#### `DELETE /api/sessions/[id]`

Delete a session and all its messages.

**Response:**
```json
{
  "success": true
}
```

---

### 4. Messages API

#### `GET /api/sessions/[id]/messages`

Get all messages for a specific session.

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "role": "user",
      "content": "What is TechCorp Cloud Services?",
      "source": null,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "sessionId": "uuid",
      "role": "assistant",
      "content": "TechCorp Cloud Services is...",
      "source": "Internal Docs",
      "createdAt": "2024-01-01T00:00:01Z"
    }
  ]
}
```

---

## Data Flow

1. **User sends message** → Frontend calls `POST /api/chat`
2. **Chat API**:
   - Validates session (creates if needed)
   - Saves user message to database
   - Generates embedding using Google AI SDK
   - Searches Chroma Cloud for relevant documents
   - Generates response using Google Gemini (KB Only or LLM + KB)
   - Saves assistant message to database
   - Updates session timestamp
3. **Frontend**:
   - Displays response
   - Loads chat history from database
   - Maintains session list

## Session Management

- Each chat conversation is managed by a **Session**
- Sessions contain multiple **Messages** (user and assistant)
- Messages are automatically saved to the database
- Chat history is loaded when a session is selected
- Sessions can be created, listed, updated, and deleted

## Technology Stack

- **Backend**: Next.js API Routes
- **Database**: Neon PostgreSQL (Prisma ORM)
- **Vector Search**: Chroma Cloud
- **LLM**: Google Gemini 2.5 Flash (via Vercel AI SDK)
- **Embeddings**: Google text-embedding-004

