import { NextRequest, NextResponse } from 'next/server';
import { generateText, embed } from 'ai';
import { google } from '@ai-sdk/google';
import { searchChromaKnowledgeBase } from '@/lib/chroma-cloud';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { message, useLLM, sessionId } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify session exists, create if it doesn't
    let session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      session = await prisma.session.create({
        data: {
          id: sessionId,
          title: 'New Chat',
        },
      });
    }

    // Save user message to database
    await prisma.message.create({
      data: {
        sessionId,
        role: 'user',
        content: message,
      },
    });

    // Generate embedding for the query
    const { embedding } = await embed({
      model: google.embedding('text-embedding-004'),
      value: message,
    });

    // Search knowledge base in Chroma Cloud
    const kbResults = await searchChromaKnowledgeBase(embedding, 3);

    // Determine if we have a good match from KB (threshold: distance < 1.0)
    // Cosine distance: 0 = identical, 2 = opposite, so < 1.0 means similar
    const hasGoodMatch = kbResults.length > 0 && kbResults[0].distance < 1.0;
    const kbContext = kbResults
      .map((r) => r.content)
      .join('\n\n')
      .slice(0, 2000); // Limit context length

    let response: string;
    let source: string;

    if (!useLLM) {
      // KB Only mode
      if (hasGoodMatch) {
        // Use RAG: generate response based on KB context
        const { text } = await generateText({
          model: google('gemini-2.5-flash'),
          system: `You are a helpful assistant. Answer questions based ONLY on the provided context from internal documentation. 
          If the context doesn't contain enough information to answer the question, say "I don't have enough information in the knowledge base to answer this question."
          Be concise and accurate.`,
          prompt: `Context from knowledge base:\n\n${kbContext}\n\n\nUser question: ${message}`,
        });
        response = text;
        source = 'Internal Docs';
      } else {
        response =
          "I don't have enough information in the knowledge base to answer this question.";
        source = 'None';
      }
    } else {
      // LLM + KB mode
      if (hasGoodMatch) {
        // Augment with KB context
        const { text } = await generateText({
          model: google('gemini-2.5-flash'),
          system: `You are a helpful assistant. Use the provided context from internal documentation to answer questions. 
          You can also use your general knowledge to provide supplementary information if needed.`,
          prompt: `Context from knowledge base:\n\n${kbContext}\n\n\nUser question: ${message}`,
        });
        response = text;
        source = 'Internal Docs + LLM';
      } else {
        // Fallback to LLM only
        const { text } = await generateText({
          model: google('gemini-2.5-flash'),
          prompt: message,
        });
        response = text;
        source = 'LLM';
      }
    }

    // Save assistant message to database
    const savedMessage = await prisma.message.create({
      data: {
        sessionId,
        role: 'assistant',
        content: response,
        source,
      },
    });

    // Update session's updatedAt timestamp
    await prisma.session.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      response,
      source,
      messageId: savedMessage.id,
      sessionId,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}

