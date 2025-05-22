import { NextRequest, NextResponse } from "next/server"
import Redis from "ioredis"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { todos as todosTable, subscriptions as subscriptionsTable } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"

// Redis for conversation memory
const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL)
  : null

// Define Zod schema for validating todo data
const TodoSchema = z.object({
  title: z.string().min(1, "Title must not be empty"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, "Date must be in ISO format"),
  urgency: z.string().or(z.number()).transform(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return Math.min(Math.max(num, 1), 5);
  }),
});

// Define schema for multiple tasks
const MultipleTasksSchema = z.object({
  isMultipleTasks: z.boolean(),
  tasks: z.array(z.object({
    title: z.string(),
    suggestedDate: z.string().nullable().optional(),
    suggestedUrgency: z.number().min(1).max(5).optional(),
  })),
});

// Helper function to store conversation in Redis
async function storeConversation(conversationId: string, data: any) {
  if (!redis) return
  
  console.log(`💾 Storing conversation data for ID: ${conversationId}`)
  try {
    await redis.set(`todo:${conversationId}`, JSON.stringify(data), 'EX', 60 * 60 * 24) // Expire after 24 hours
    console.log(`✅ Successfully stored conversation data`)
  } catch (error) {
    console.error(`❌ Error storing conversation data:`, error)
  }
}

// Helper function to retrieve conversation from Redis
async function getConversation(conversationId: string) {
  if (!redis) return null
  
  console.log(`🔍 Retrieving conversation data for ID: ${conversationId}`)
  try {
    const data = await redis.get(`todo:${conversationId}`)
    if (data) {
      console.log(`✅ Found conversation data`)
      return JSON.parse(data)
    }
    console.log(`ℹ️ No existing conversation data found`)
    return null
  } catch (error) {
    console.error(`❌ Error retrieving conversation data:`, error)
    return null
  }
}

/**
 * Check if a user has a pro plan
 */
async function hasProPlan(userId: string): Promise<boolean> {
  if (!userId) {
    console.log(`ℹ️ No user ID provided, defaulting to non-pro`)
    return false
  }
  
  console.log(`🔍 Checking subscription status for user: ${userId}`)
  try {
    // Query the subscriptions table for an active subscription
    const userSubscriptions = await db.select({
      plan: subscriptionsTable.plan,
      status: subscriptionsTable.status,
    })
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.referenceId, userId),
        eq(subscriptionsTable.status, 'active')
      )
    )
    .limit(1)
    
    // Check if the user has an active pro subscription
    if (userSubscriptions.length > 0) {
      const isPro = userSubscriptions[0].plan.toLowerCase().includes('pro')
      console.log(`✅ User has ${isPro ? 'pro' : 'non-pro'} subscription (${userSubscriptions[0].plan})`)
      return isPro
    }
    
    console.log(`ℹ️ No active subscription found for user`)
    return false
  } catch (error) {
    console.error(`❌ Error checking subscription status:`, error)
    return false
  }
}

/**
 * Get the appropriate model based on the user's subscription status
 */
async function getModelForUser(userId: string): Promise<string> {
  const isPro = await hasProPlan(userId)
  
  if (isPro) {
    console.log(`🚀 Using premium model (gpt-4.1) for pro user`)
    return 'gpt-4.1'
  } else {
    console.log(`📊 Using standard model (gpt-4.1-mini) for non-pro user`)
    return 'gpt-4.1-mini'
  }
}

/**
 * Convert a relative date string to an ISO date string
 */
async function convertRelativeDate(dateStr: string): Promise<string> {
  console.log(`🗓️ Converting relative date: "${dateStr}"`)
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/convert-date`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date: dateStr }),
    })

    if (!response.ok) {
      throw new Error(`Error converting date: ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`✅ Converted date: "${dateStr}" -> ${data.formattedDateTime}`)
    return data.formattedDateTime
  } catch (error) {
    console.error(`❌ Error converting date:`, error)
    return dateStr // Return original string if conversion fails
  }
}

/**
 * Detect and split multiple tasks from a single input using AI
 */
async function detectMultipleTasks(input: string): Promise<{ isMultipleTasks: boolean; tasks: Array<{ title: string; suggestedDate?: string | null; suggestedUrgency?: number }> }> {
  console.log(`🔍 Detecting multiple tasks in: "${input}"`)
  
  const currentTime = new Date().toISOString()
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  
  try {
    const { text: response } = await generateText({
      model: openai('gpt-4o-mini'), // Use faster model for task detection
      system: `You are a task detection specialist. Analyze the input and determine if it contains multiple distinct tasks.

Current time: ${currentTime}
Today: ${todayName}

CRITICAL RULES:
1. Only split if there are clearly MULTIPLE DISTINCT TASKS
2. Don't split if it's a single task with multiple steps
3. Look for conjunctions like "and", "then", "also", "plus"
4. Each task should be actionable independently
5. Extract dates and times when mentioned (convert relative dates to absolute)
6. If no date/time is specified, leave suggestedDate as null
7. NEVER suggest dates/times in the past - always use future dates

Output ONLY valid JSON in this exact format:
{
  "isMultipleTasks": boolean,
  "tasks": [
    {
      "title": "Clean task title (without date/time info)",
      "suggestedDate": null or "YYYY-MM-DDTHH:MM:SS",
      "suggestedUrgency": 1-5
    }
  ]
}

Examples:
Input: "Feed the turtle and buy napkins"
Output: {"isMultipleTasks": true, "tasks": [{"title": "Feed the turtle", "suggestedDate": null, "suggestedUrgency": 3}, {"title": "Buy napkins", "suggestedDate": null, "suggestedUrgency": 2}]}

Input: "Call mom at 3pm and schedule dentist appointment for tomorrow"
Output: {"isMultipleTasks": true, "tasks": [{"title": "Call mom", "suggestedDate": "2024-04-27T15:00:00", "suggestedUrgency": 2}, {"title": "Schedule dentist appointment", "suggestedDate": "2024-04-28T10:00:00", "suggestedUrgency": 3}]}

Input: "Prepare presentation for Monday meeting"
Output: {"isMultipleTasks": false, "tasks": [{"title": "Prepare presentation for Monday meeting", "suggestedDate": "2024-04-29T09:00:00", "suggestedUrgency": 4}]}

Input: "Buy groceries, workout at 6pm, and call investor tomorrow morning"
Output: {"isMultipleTasks": true, "tasks": [{"title": "Buy groceries", "suggestedDate": null, "suggestedUrgency": 2}, {"title": "Workout", "suggestedDate": "2024-04-27T18:00:00", "suggestedUrgency": 3}, {"title": "Call investor", "suggestedDate": "2024-04-28T09:00:00", "suggestedUrgency": 4}]}`,
      prompt: input,
      temperature: 0.1,
      maxTokens: 800,
    });

    const parsed = JSON.parse(response);
    const validated = MultipleTasksSchema.parse(parsed);
    
    console.log(`✅ Task detection result: ${validated.isMultipleTasks ? `${validated.tasks.length} tasks detected` : 'Single task detected'}`);
    return validated;
  } catch (error) {
    console.error(`❌ Error detecting multiple tasks:`, error);
    // Fallback to single task
    return {
      isMultipleTasks: false,
      tasks: [{ title: input, suggestedUrgency: 3 }]
    };
  }
}

/**
 * Dynamically generate time suggestions based on context
 */
function generateTimeSuggestions(title: string): Array<{ time: string, display: string }> {
  console.log(`🕒 Generating time suggestions for: "${title}"`)
  
  // Map keywords to time suggestions
  const keywordMap: Record<string, Array<{ time: string, display: string }>> = {
    'breakfast': [
      { time: '07:00:00', display: '7 AM' },
      { time: '08:00:00', display: '8 AM' },
      { time: '09:00:00', display: '9 AM' },
    ],
    'lunch': [
      { time: '12:00:00', display: '12 PM' },
      { time: '13:00:00', display: '1 PM' },
      { time: '13:30:00', display: '1:30 PM' },
    ],
    'dinner': [
      { time: '18:00:00', display: '6 PM' },
      { time: '19:00:00', display: '7 PM' },
      { time: '20:00:00', display: '8 PM' },
    ],
    'meeting': [
      { time: '09:00:00', display: '9 AM' },
      { time: '14:00:00', display: '2 PM' },
      { time: '16:00:00', display: '4 PM' },
    ],
    'call': [
      { time: '10:00:00', display: '10 AM' },
      { time: '14:00:00', display: '2 PM' },
      { time: '15:30:00', display: '3:30 PM' },
    ],
    'workout': [
      { time: '06:00:00', display: '6 AM' },
      { time: '18:00:00', display: '6 PM' },
      { time: '20:00:00', display: '8 PM' },
    ],
    'investor': [
      { time: '09:30:00', display: '9:30 AM' },
      { time: '11:00:00', display: '11 AM' },
      { time: '14:00:00', display: '2 PM' },
    ],
  }
  
  // Default suggestions (business hours)
  const defaultSuggestions = [
    { time: '09:00:00', display: '9 AM' },
    { time: '14:00:00', display: '2 PM' },
    { time: '16:00:00', display: '4 PM' },
  ]
  
  // Check for matching keywords
  const lowerTitle = title.toLowerCase()
  for (const [keyword, suggestions] of Object.entries(keywordMap)) {
    if (lowerTitle.includes(keyword)) {
      console.log(`🔍 Matched keyword "${keyword}" in title, using specific suggestions`)
      return suggestions
    }
  }
  
  console.log(`📋 Using default time suggestions`)
  return defaultSuggestions
}

/**
 * Extract values from the assistant message
 */
function extractValues(messageContent: string) {
  console.log(`🔍 Extracting values from message`)
  const values: Record<string, string> = {}
  
  // Extract title
  const titleMatch = messageContent.match(/<title>(.*?)<\/title>/)
  if (titleMatch && titleMatch[1]) {
    values.title = titleMatch[1]
    console.log(`📝 Found title: "${values.title}"`)
  }
  
  // Extract date
  const dateMatch = messageContent.match(/<date>(.*?)<\/date>/)
  if (dateMatch && dateMatch[1]) {
    values.date = dateMatch[1]
    console.log(`📅 Found date: "${values.date}"`)
  }
  
  // Extract urgency
  const urgencyMatch = messageContent.match(/<urgency>(.*?)<\/urgency>/)
  if (urgencyMatch && urgencyMatch[1]) {
    values.urgency = urgencyMatch[1]
    console.log(`🚨 Found urgency: ${values.urgency}`)
  }

  // Extract follow-up message
  const followUpMatch = messageContent.match(/<follow_up>(.*?)<\/follow_up>/)
  if (followUpMatch && followUpMatch[1]) {
    values.follow_up = followUpMatch[1]
    console.log(`💬 Found follow-up: "${values.follow_up}"`)
  }
  
  return values
}

/**
 * Extract still needed fields from the assistant message
 */
function extractStillNeeded(messageContent: string): string[] {
  console.log(`🔍 Checking for still needed fields`)
  const stillNeededMatch = messageContent.match(/<still_needed>(.*?)<\/still_needed>/)
  if (stillNeededMatch && stillNeededMatch[1]) {
    const fields = stillNeededMatch[1].split(',').map(field => field.trim())
    console.log(`❓ Still needed fields: ${fields.join(', ')}`)
    return fields
  }
  return []
}

/**
 * Check if the todo is complete
 */
function isTodoComplete(messageContent: string): boolean {
  const isComplete = messageContent.includes('<todo_complete>')
  console.log(`${isComplete ? '✅' : '❌'} Todo complete: ${isComplete}`)
  return isComplete
}

/**
 * Validate extracted values against Zod schema
 */
function validateTodoData(values: Record<string, string>): { 
  valid: boolean; 
  errors?: Record<string, string>;
} {
  console.log(`🔍 Validating todo data`)
  
  try {
    // Only validate fields that are present
    const fieldsToValidate: Record<string, any> = {}
    if (values.title) fieldsToValidate.title = values.title
    if (values.date) fieldsToValidate.date = values.date
    if (values.urgency) fieldsToValidate.urgency = values.urgency
    
    // Partial validation for fields that are present
    const partialSchema = z.object({
      title: values.title ? TodoSchema.shape.title : z.string().optional(),
      date: values.date ? TodoSchema.shape.date : z.string().optional(),
      urgency: values.urgency ? TodoSchema.shape.urgency : z.any().optional(),
    })
    
    partialSchema.parse(fieldsToValidate)
    console.log(`✅ Todo data is valid`)
    return { valid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.errors.forEach(err => {
        if (err.path.length > 0) {
          errors[err.path[0]] = err.message
        }
      })
      console.error(`❌ Todo data validation failed:`, errors)
      return { valid: false, errors }
    }
    console.error(`❌ Unexpected validation error:`, error)
    return { valid: false, errors: { unknown: 'Unexpected validation error' } }
  }
}

/**
 * Check for loop detection (asking for same field multiple times)
 */
function checkForLoop(
  fieldCounts: Record<string, number>,
  currentField: string | undefined
): { inLoop: boolean; loopField?: string } {
  if (!currentField) return { inLoop: false }
  
  const threshold = 3 // Number of times to try asking before escalating
  const count = fieldCounts[currentField] || 0
  
  if (count >= threshold) {
    console.warn(`⚠️ Loop detected! Asked for "${currentField}" ${count} times`)
    return { inLoop: true, loopField: currentField }
  }
  
  return { inLoop: false }
}

/**
 * Create urgency fallback message based on loop detection
 */
function createLoopFallbackMessage(loopField: string, values: Record<string, string>): string {
  if (loopField === 'urgency') {
    console.log(`🔄 Creating fallback message for urgency`)
    const title = values.title?.toLowerCase() || ''
    
    // Define keywords that indicate high urgency
    const highUrgencyKeywords = ['urgent', 'important', 'critical', 'deadline', 'asap', 'immediately', 'investor']
    
    // Check if title contains any high urgency keywords
    const isHighUrgency = highUrgencyKeywords.some(keyword => title.includes(keyword))
    const suggestedUrgency = isHighUrgency ? 4.5 : 3.0
    
    return `I'll set this to ${suggestedUrgency} out of 5 urgency based on the description. You can adjust this later.`
  }
  
  if (loopField === 'date') {
    return `I'll need a specific date and time. Would you like me to set this for today?`
  }
  
  return `I'm having trouble understanding your input for ${loopField}. Could you provide it in a different way?`
}

// Define the system prompt with detailed examples
const createSystemPrompt = async (userId?: string, workspaceId?: string) => {
  const currentTime = new Date().toISOString()
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  
  let prompt = `
You are a concise todo assistant that helps users create structured todos.

Current time: ${currentTime}
Today: ${todayName}

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
4. Provide contextual suggestions (morning for breakfast, etc.) MAKE SURE THE SUGGESTIONS ARE IN THE FUTURE, IF IT IS 12PM MAKE SURE THE SUGGESTIONS ARE AFTER THAT TIME.
5. Keep responses direct and to the point
6. If you have a date, DO NOT ask for it again
7. If there's a mention of "investor", "deadline", "urgent", set urgency to 4.5 automatically
8. Don't go in circles - listen carefully to user input
9. After 3 attempts to get a field, provide a reasonable default
10. When a user indicates a relative date like "tomorrow" or "next week", directly convert it

NEVER, EVER, SUGGEST A DATE OR TIME THAT IS IN THE PAST. ALWAYS SUGGEST A DATE OR TIME THAT IS IN THE FUTURE.

Examples:

User: "Meet investors tomorrow"
Assistant: <title>Meet with investors</title>
<date>2024-04-28T09:00:00</date>
<follow_up>How urgent is this meeting? (1-5)</follow_up>
<suggestion type="urgency" value="4.5">High (4.5)</suggestion>
<suggestion type="urgency" value="3.0">Medium (3)</suggestion>
<still_needed>urgency</still_needed>

User: "4"
Assistant: <title>Meet with investors</title>
<date>2024-04-28T09:00:00</date>
<urgency>4.0</urgency>
<todo_complete>

User: "finish project by friday"
Assistant: <title>Finish project</title>
<date>2024-05-03T17:00:00</date>
<follow_up>How urgent is this task? (1-5)</follow_up>
<suggestion type="urgency" value="4.0">High (4)</suggestion>
<suggestion type="urgency" value="3.0">Medium (3)</suggestion>
<still_needed>urgency</still_needed>
`

  // Include user's workspace todos for context if workspace ID is provided
  if (userId && workspaceId) {
    try {
      console.log(`🔍 Fetching todos for workspace context`)
      const recentTodos = await db.select({
        title: todosTable.title,
        urgency: todosTable.urgency,
        dueDate: todosTable.dueDate,
      })
      .from(todosTable)
      .where(eq(todosTable.workspaceId, workspaceId))
      .limit(10)
      
      if (recentTodos.length > 0) {
        prompt += `\nRecent todos in this workspace:\n`
        recentTodos.forEach(todo => {
          prompt += `- "${todo.title}" (Urgency: ${todo.urgency}, Due: ${todo.dueDate || 'unspecified'})\n`
        })
        console.log(`✅ Added ${recentTodos.length} workspace todos to context`)
      }
    } catch (error) {
      console.error(`❌ Error fetching workspace todos:`, error)
    }
  }
  
  return prompt
}

export async function POST(request: NextRequest) {
  console.log(`\n🔄 Starting todo parse request`)
  
  try {
    // Parse request body
    const body = await request.json()
    const { 
      message, 
      conversationId, 
      collectedValues = {}, 
      pendingFields = [], 
      currentField,
      userId,
      workspaceId,
      fieldAttempts = {} 
    } = body
    
    console.log(`🆔 Conversation ID: ${conversationId}`)
    console.log(`💬 User message: "${message}"`)
    console.log(`🧩 Collected values:`, collectedValues)
    console.log(`🔍 Pending fields: ${pendingFields.join(', ') || 'none'}`)
    console.log(`📊 Field attempts:`, fieldAttempts)
    
    // Check if this is a fresh conversation (no collected values and no pending fields)
    const isFreshConversation = Object.keys(collectedValues).length === 0 && pendingFields.length === 0
    
    // If it's a fresh conversation, check for multiple tasks first
    if (isFreshConversation) {
      console.log(`🔍 Fresh conversation detected, checking for multiple tasks`)
      const multiTaskResult = await detectMultipleTasks(message)
      
      if (multiTaskResult.isMultipleTasks && multiTaskResult.tasks.length > 1) {
        console.log(`✅ Multiple tasks detected: ${multiTaskResult.tasks.length} tasks`)
        
        // Return multiple tasks response
        return NextResponse.json({
          text: `I detected ${multiTaskResult.tasks.length} separate tasks. I'll help you create them one by one.`,
          html: `<multiple_tasks_detected>
<task_count>${multiTaskResult.tasks.length}</task_count>
<tasks>${JSON.stringify(multiTaskResult.tasks)}</tasks>
</multiple_tasks_detected>`,
          values: {},
          stillNeeded: [],
          isComplete: false,
          isMultipleTasks: true,
          tasks: multiTaskResult.tasks,
          validation: { valid: true },
          fieldAttempts: {},
          fallbackApplied: false,
          suggestions: []
        })
      }
    }
    
    // Try to retrieve existing conversation from Redis
    let existingConversation = null
    if (redis) {
      existingConversation = await getConversation(conversationId)
      if (existingConversation) {
        console.log(`🔄 Retrieved existing conversation state`)
      }
    }
    
    // Track number of attempts for each field for loop detection
    const updatedFieldAttempts = { ...fieldAttempts }
    if (currentField) {
      updatedFieldAttempts[currentField] = (updatedFieldAttempts[currentField] || 0) + 1
      console.log(`🔢 Field "${currentField}" has been asked ${updatedFieldAttempts[currentField]} times`)
    }
    
    // Check for loops
    const { inLoop, loopField } = checkForLoop(updatedFieldAttempts, currentField)
    
    // If we're in a loop and have a field that's being repeatedly asked, provide a fallback value
    let updatedCollectedValues = { ...collectedValues }
    let fallbackApplied = false
    let fallbackMessage = ''
    
    if (inLoop && loopField) {
      console.log(`🔄 Applying fallback for loop in field: ${loopField}`)
      fallbackMessage = createLoopFallbackMessage(loopField, collectedValues)
      
      // Set default value based on the field
      if (loopField === 'urgency') {
        const title = collectedValues.title?.toLowerCase() || ''
        const highUrgencyKeywords = ['urgent', 'important', 'critical', 'deadline', 'asap', 'immediately', 'investor']
        const isHighUrgency = highUrgencyKeywords.some(keyword => title.includes(keyword))
        updatedCollectedValues.urgency = isHighUrgency ? '4.5' : '3.0'
      }
      
      fallbackApplied = true
    }
    
    // Prepare conversation context
    const systemPrompt = await createSystemPrompt(userId, workspaceId)
    let contextPrompt = systemPrompt
    
    // Add context about already collected values
    if (Object.keys(updatedCollectedValues).length > 0 || pendingFields.length > 0) {
      let contextMessage = "\n\nCurrent information:\n"
      
      if (updatedCollectedValues.title) {
        contextMessage += `Title: ${updatedCollectedValues.title}\n`
      }
      
      if (updatedCollectedValues.date) {
        contextMessage += `Date: ${updatedCollectedValues.date}\n`
      }
      
      if (updatedCollectedValues.urgency) {
        contextMessage += `Urgency: ${updatedCollectedValues.urgency}\n`
      }
      
      if (pendingFields.length > 0) {
        contextMessage += `\nNeeded: ${pendingFields.join(', ')}\n`
      }
      
      if (currentField) {
        contextMessage += `\nAsking about: ${currentField}\n`
      }
      
      // Add field attempt counts
      contextMessage += `\nField attempts: ${Object.entries(updatedFieldAttempts)
        .map(([field, count]) => `${field}=${count}`)
        .join(', ')}\n`
      
      if (fallbackApplied) {
        contextMessage += `\nFallback applied for ${loopField}. Message: ${fallbackMessage}\n`
      }
      
      contextPrompt += contextMessage
      console.log(`📝 Added context information to system prompt`)
    }
    
    let assistantMessage = ''
    
    // If we're in a loop, we'll construct a mock assistant message
    if (fallbackApplied && loopField) {
      console.log(`🤖 Creating mock assistant response due to loop detection`)
      
      // Construct a response as if the assistant generated it
      assistantMessage = `<title>${updatedCollectedValues.title || ''}</title>\n`
      
      if (updatedCollectedValues.date) {
        assistantMessage += `<date>${updatedCollectedValues.date}</date>\n`
      }
      
      if (updatedCollectedValues.urgency) {
        assistantMessage += `<urgency>${updatedCollectedValues.urgency}</urgency>\n`
      }
      
      assistantMessage += `<follow_up>${fallbackMessage}</follow_up>\n`
      
      // If all required fields are now present, mark as complete
      const requiredFields = ['title', 'date', 'urgency']
      const missingFields = requiredFields.filter(field => !updatedCollectedValues[field])
      
      if (missingFields.length === 0) {
        assistantMessage += `<todo_complete>`
      } else {
        assistantMessage += `<still_needed>${missingFields.join(',')}</still_needed>`
      }
    } else {
      // Get the appropriate model based on the user's subscription
      const modelName = await getModelForUser(userId)
      
      // Use AI SDK to generate response
      console.log(`🤖 Generating response with AI SDK using model: ${modelName}`)
      const { text: generatedMessage } = await generateText({
        model: openai(modelName),
        system: contextPrompt,
        prompt: message,
        temperature: 0.2, // Lower temperature for more consistent responses
        maxTokens: 500,
      })
      
      assistantMessage = generatedMessage
      console.log(`🤖 Assistant response: "${assistantMessage.substring(0, 100)}${assistantMessage.length > 100 ? '...' : ''}"`)
    }
    
    // Process the response
    const extractedValues = extractValues(assistantMessage)
    const stillNeeded = extractStillNeeded(assistantMessage)
    const isComplete = isTodoComplete(assistantMessage)
    
    // Update collected values
    const finalCollectedValues = { ...updatedCollectedValues, ...extractedValues }
    
    // Handle date conversion if needed
    if (extractedValues.date && !extractedValues.date.includes('T')) {
      // Convert relative date to ISO
      finalCollectedValues.date = await convertRelativeDate(extractedValues.date)
    }
    
    // Validate the collected values
    const validation = validateTodoData(finalCollectedValues)
    
    // Store conversation in Redis if needed
    if (redis) {
      // Create storage entry with message and values
      const storageEntry = {
        message,
        response: assistantMessage,
        values: finalCollectedValues,
        pendingFields: stillNeeded,
        fieldAttempts: updatedFieldAttempts,
        validation,
        isComplete,
        updatedAt: new Date().toISOString()
      }
      
      // Store conversation data
      await storeConversation(conversationId, storageEntry)
    }
    
    // Generate time suggestions if needed
    let suggestions: Array<{ time: string, display: string }> = []
    if (stillNeeded.includes('time') && finalCollectedValues.title) {
      suggestions = generateTimeSuggestions(finalCollectedValues.title)
    }
    
    // Prepare and return response
    const response = {
      text: extractedValues.follow_up || assistantMessage.replace(/<.*?>/g, '').trim(), // Use follow_up if available, otherwise clean HTML tags
      html: assistantMessage,
      values: finalCollectedValues,
      stillNeeded,
      isComplete,
      validation,
      fieldAttempts: updatedFieldAttempts,
      fallbackApplied,
      suggestions
    }
    
    console.log(`✅ Parse todo request completed`)
    return NextResponse.json(response)
  } catch (error) {
    console.error(`❌ Error processing todo:`, error)
    return NextResponse.json(
      { error: 'Failed to process todo' }, 
      { status: 500 }
    )
  }
} 