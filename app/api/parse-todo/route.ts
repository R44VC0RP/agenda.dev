import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

import Redis from 'ioredis';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Redis for conversation memory
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

// Helper function to store conversation in Redis
async function storeConversation(conversationId: string, data: any) {
  if (!redis) return;

  console.log(`💾 Storing conversation data for ID: ${conversationId}`);
  try {
    await redis.set(`todo:${conversationId}`, JSON.stringify(data), 'EX', 60 * 60 * 24); // Expire after 24 hours
    console.log(`✅ Successfully stored conversation data`);
  } catch (error) {
    console.error(`❌ Error storing conversation data:`, error);
  }
}

// Helper function to retrieve conversation from Redis
async function getConversation(conversationId: string) {
  if (!redis) return null;

  console.log(`🔍 Retrieving conversation data for ID: ${conversationId}`);
  try {
    const data = await redis.get(`todo:${conversationId}`);
    if (data) {
      console.log(`✅ Found conversation data`);
      return JSON.parse(data);
    }
    console.log(`ℹ️ No existing conversation data found`);
    return null;
  } catch (error) {
    console.error(`❌ Error retrieving conversation data:`, error);
    return null;
  }
}

/**
 * Convert a relative date string to an ISO date string
 */
async function convertRelativeDate(dateStr: string): Promise<string> {
  console.log(`🗓️ Converting relative date: "${dateStr}"`);
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/convert-date`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date: dateStr }),
    });

    if (!response.ok) {
      throw new Error(`Error converting date: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Converted date: "${dateStr}" -> ${data.formattedDateTime}`);
    return data.formattedDateTime;
  } catch (error) {
    console.error(`❌ Error converting date:`, error);
    return dateStr; // Return original string if conversion fails
  }
}

/**
 * Extract values from the assistant message
 */
function extractValues(messageContent: string) {
  console.log(`🔍 Extracting values from message`);
  const values: Record<string, string> = {};

  // Extract title
  const titleMatch = messageContent.match(/<title>(.*?)<\/title>/);
  if (titleMatch && titleMatch[1]) {
    values.title = titleMatch[1];
    console.log(`📝 Found title: "${values.title}"`);
  }

  // Extract date
  const dateMatch = messageContent.match(/<date>(.*?)<\/date>/);
  if (dateMatch && dateMatch[1]) {
    values.date = dateMatch[1];
    console.log(`📅 Found date: "${values.date}"`);
  }

  // Extract urgency
  const urgencyMatch = messageContent.match(/<urgency>(.*?)<\/urgency>/);
  if (urgencyMatch && urgencyMatch[1]) {
    values.urgency = urgencyMatch[1];
    console.log(`🚨 Found urgency: ${values.urgency}`);
  }

  // Extract follow-up message
  const followUpMatch = messageContent.match(/<follow_up>(.*?)<\/follow_up>/);
  if (followUpMatch && followUpMatch[1]) {
    values.follow_up = followUpMatch[1];
    console.log(`💬 Found follow-up: "${values.follow_up}"`);
  }

  return values;
}

/**
 * Extract still needed fields from the assistant message
 */
function extractStillNeeded(messageContent: string): string[] {
  console.log(`🔍 Checking for still needed fields`);
  const stillNeededMatch = messageContent.match(/<still_needed>(.*?)<\/still_needed>/);
  if (stillNeededMatch && stillNeededMatch[1]) {
    const fields = stillNeededMatch[1].split(',').map((field) => field.trim());
    console.log(`❓ Still needed fields: ${fields.join(', ')}`);
    return fields;
  }
  return [];
}

/**
 * Check if the todo is complete
 */
function isTodoComplete(messageContent: string): boolean {
  const isComplete = messageContent.includes('<todo_complete>');
  console.log(`${isComplete ? '✅' : '❌'} Todo complete: ${isComplete}`);
  return isComplete;
}

// Define the system prompt with detailed examples
const SYSTEM_PROMPT = `
You are a concise todo assistant that helps users create structured todos.

Current time: ${new Date().toISOString()}
Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}

Required tags:
<title>Clear title without date/time info (e.g. "Meet with investor" not "Meet investor tomorrow")</title>
<date>ISO format date (YYYY-MM-DDTHH:MM:SS)</date>
<urgency>Number 1.0-5.0</urgency>
<follow_up>Brief, direct question or statement about what's needed next</follow_up>
<still_needed>missing fields</still_needed>

For missing info, provide 2-3 suggestions:
<suggestion type="date|time|datetime" value="YYYY-MM-DDTHH:MM:SS">Display text</suggestion>

Add <todo_complete> when done.

Key rules:
1. Be extremely concise in follow-up messages
2. Never include date/time in titles
3. Always convert relative dates to absolute
4. Provide contextual suggestions (morning for breakfast, etc.)
5. Keep responses direct and to the point

Examples:

User: "Meet investors tomorrow"
Assistant: <title>Meet with investors</title>
<follow_up>What time works best?</follow_up>
<suggestion type="time" value="09:00:00">9 AM</suggestion>
<suggestion type="time" value="14:00:00">2 PM</suggestion>
<suggestion type="time" value="16:00:00">4 PM</suggestion>
<still_needed>time,urgency</still_needed>

User: "9am"
Assistant: <title>Meet with investors</title>
<date>2024-04-28T09:00:00</date>
<follow_up>How urgent is this meeting? (1-5)</follow_up>
<still_needed>urgency</still_needed>

User: "4"
Assistant: <title>Meet with investors</title>
<date>2024-04-28T09:00:00</date>
<urgency>4.0</urgency>
<todo_complete>`;

export async function POST(request: NextRequest) {
  console.log(`\n🔄 Starting todo parse request`);

  try {
    // Parse request body
    const body = await request.json();
    const {
      message,
      conversationId,
      collectedValues = {},
      pendingFields = [],
      currentField,
    } = body;

    console.log(`🆔 Conversation ID: ${conversationId}`);
    console.log(`💬 User message: "${message}"`);
    console.log(`🧩 Collected values:`, collectedValues);
    console.log(`🔍 Pending fields: ${pendingFields.join(', ') || 'none'}`);

    // Try to retrieve existing conversation from Redis
    let existingConversation = null;
    if (redis) {
      existingConversation = await getConversation(conversationId);
      if (existingConversation) {
        console.log(`🔄 Retrieved existing conversation state`);
      }
    }

    // Prepare conversation context
    let contextPrompt = SYSTEM_PROMPT;

    // Add context about already collected values
    if (Object.keys(collectedValues).length > 0 || pendingFields.length > 0) {
      let contextMessage = '\n\nCurrent information:\n';

      if (collectedValues.title) {
        contextMessage += `Title: ${collectedValues.title}\n`;
      }

      if (collectedValues.date) {
        contextMessage += `Date: ${collectedValues.date}\n`;
      }

      if (collectedValues.urgency) {
        contextMessage += `Urgency: ${collectedValues.urgency}\n`;
      }

      if (pendingFields.length > 0) {
        contextMessage += `\nNeeded: ${pendingFields.join(', ')}\n`;
      }

      if (currentField) {
        contextMessage += `\nAsking about: ${currentField}\n`;
      }

      contextPrompt += contextMessage;
      console.log(`📝 Added context information to system prompt`);
    }

    // Use AI SDK to generate response
    console.log(`🤖 Generating response with AI SDK`);
    const { text: assistantMessage } = await generateText({
      model: openai('gpt-4o'),
      system: contextPrompt,
      prompt: message,
      temperature: 0.7,
      maxTokens: 500,
    });

    console.log(
      `🤖 Assistant response: "${assistantMessage.substring(0, 100)}${assistantMessage.length > 100 ? '...' : ''}"`
    );

    // Process the response
    const extractedValues = extractValues(assistantMessage);
    const stillNeeded = extractStillNeeded(assistantMessage);
    const isComplete = isTodoComplete(assistantMessage);

    // Handle date conversion if needed
    if (extractedValues.date && !extractedValues.date.includes('T')) {
      // Convert relative date to ISO
      extractedValues.date = await convertRelativeDate(extractedValues.date);
    }

    // Store conversation in Redis if needed
    if (redis) {
      // Create storage entry with message and values
      const storageEntry = {
        message,
        response: assistantMessage,
        values: {
          ...collectedValues,
          ...extractedValues,
        },
        pendingFields: stillNeeded,
        isComplete,
        updatedAt: new Date().toISOString(),
      };

      // Store conversation data
      await storeConversation(conversationId, storageEntry);
    }

    // Prepare and return response
    const response = {
      text: extractedValues.follow_up || assistantMessage.replace(/<.*?>/g, '').trim(), // Use follow_up if available, otherwise clean HTML tags
      html: assistantMessage,
      values: extractedValues,
      stillNeeded,
      isComplete,
    };

    console.log(`✅ Parse todo request completed`);
    return NextResponse.json(response);
  } catch (error) {
    console.error(`❌ Error processing todo:`, error);
    return NextResponse.json({ error: 'Failed to process todo' }, { status: 500 });
  }
}
