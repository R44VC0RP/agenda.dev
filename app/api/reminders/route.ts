import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { reminders, userSettings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { Comment } from '@/lib/types';

const systemPrompt = `### Generate Reminder Details from Todo Context

You are an AI assistant that helps generate reminder details from user messages. 
The input will include a todo item's title, its comments, a reminder command message, and the user's timezone.

Your task is to generate a structured response with the following blocks:

<reminder_title>
A concise, clear title for the reminder that captures its essence
</reminder_title>

<reminder_description>
A detailed description of what needs to be done, incorporating context from the todo and comments
</reminder_description>

<reminder_time>
Extract or infer the time for the reminder from the message, considering the user's timezone.
Format: Use natural language that can be parsed by the date conversion API (e.g., "tomorrow at 9am", "in 2 hours", "next Monday at 3pm")
Important: All times will be stored in UTC, but you should interpret user input based on their timezone.
</reminder_time>

<reminder_summary>
A user-friendly summary that will be shown in the comments, explaining when the reminder will trigger and what it's for. Always include a 🔔 emoji at the start.
</reminder_summary>

---

### ✅ Examples:

**Input:**
Todo: "Prepare presentation for client meeting"
Comments: ["Added initial slides", "Need to include Q2 metrics"]
Message: "!remindme tomorrow morning to review slides"
Timezone: "America/New_York"

**Output:**
<reminder_title>Review Client Presentation Slides</reminder_title>
<reminder_description>Review the prepared presentation slides for the client meeting, ensuring Q2 metrics are included and all content is finalized.</reminder_description>
<reminder_time>tomorrow at 9:00 AM America/New_York</reminder_time>
<reminder_summary>I'll remind you to review the presentation slides tomorrow at 9:00 AM ET</reminder_summary>

**Input:**
Todo: "Fix login bug in authentication flow"
Comments: ["Users getting stuck at OAuth screen", "Need to check token expiration"]
Message: "!rmd in 2 hours to test fix"
Timezone: "UTC"

**Output:**
<reminder_title>Test Authentication Fix</reminder_title>
<reminder_description>Test the login bug fix in the authentication flow, focusing on the OAuth screen issues and token expiration handling.</reminder_description>
<reminder_time>in 2 hours</reminder_time>
<reminder_summary>!!RMD!! I'll remind you to test the authentication fix in 2 hours</reminder_summary>

---

### ⚠️ Notes:
- Keep titles concise but descriptive
- The title and description are going to be shown at the time of the reminder, so make sure they do not reference the future since the reminder will be set in the past and if it is like "check the invoice tmr" it should be "check the invoice today" since the reminder will be sent today.
- reminder_summary will be shown in the comments at the time of adding the reminder, so make it like "Reminding you to check the invoice" with no date or time reference. and begin it with !!RMD!! and no emojis.
- Include relevant context from todo and comments in the description
- Make summaries user-friendly and clear about timing
- Always use the 🔔 emoji in summaries
- For unclear time expressions, use a reasonable default based on context
- Always consider the user's timezone when interpreting time expressions
`;

// Checks if the user is authenticated and returns their userId
// Throws an error if not authenticated
async function checkAuth() {
  const cookieStore = await cookies();
  const session = await auth.api.getSession({
    headers: new Headers({
      cookie: cookieStore.toString(),
    }),
  });

  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  return session.user.id;
}

interface ReminderRequest {
  todoId: string;
  todoTitle: string;
  comments: Comment[];
  message: string;
}

// Creates a new reminder for a todo's comment
// Requires: todoId, todoTitle, comments, and message in the request body
// Returns: the created reminder object with AI-generated details
export async function POST(req: Request) {
  try {
    console.log('🔑 Authenticating user...');
    const userId = await checkAuth();
    const { todoId, todoTitle, comments, message } = (await req.json()) as ReminderRequest;

    // Get user's timezone setting
    const userSetting = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    const userTimezone = userSetting?.timezone || 'UTC';

    console.log('📝 Received reminder request:', {
      todoTitle,
      commentsCount: comments.length,
      message,
      timezone: userTimezone,
    });

    // Generate reminder details using AI
    console.log('🤖 Generating reminder details with AI...');
    const prompt = `Todo: "${todoTitle}"\nComments: ${JSON.stringify(comments.map((c: Comment) => c.text))}\nMessage: "${message}"\nTimezone: "${userTimezone}"`;

    const { text: aiResponse } = await generateText({
      model: openai('gpt-4.1-mini'),
      prompt,
      system: systemPrompt,
    });

    console.log('✨ AI response received, extracting blocks...');
    // Extract blocks from AI response
    const extractBlock = (blockName: string) => {
      const regex = new RegExp(`<${blockName}>(.*?)</${blockName}>`, 's');
      const match = aiResponse.match(regex);
      return match ? match[1].trim() : '';
    };

    const title = extractBlock('reminder_title');
    const description = extractBlock('reminder_description');
    const timeStr = extractBlock('reminder_time');
    const summary = extractBlock('reminder_summary');

    console.log('📦 Extracted reminder components:', {
      title,
      timeStr,
      hasDescription: !!description,
      hasSummary: !!summary,
    });

    if (!title || !description || !timeStr || !summary) {
      console.error('❌ Invalid AI response format - missing required blocks');
      throw new Error('Invalid AI response format');
    }

    // Convert the time string using the same date conversion logic
    console.log('⏰ Converting time string:', timeStr);
    const { text: dateResult } = await generateText({
      model: openai('gpt-4.1-mini'),
      prompt: `${timeStr}\nUser timezone: ${userTimezone}`,
      system: `### Convert Relative Time Expressions to Specific Date & Time Strings

            The current date and time in the user's timezone (${userTimezone}) is:

            ${new Date().toLocaleString('en-US', {
              timeZone: userTimezone,
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}

            The day of the week is ${new Date().toLocaleString('en-US', { timeZone: userTimezone, weekday: 'long' })}
            The month is ${new Date().toLocaleString('en-US', { timeZone: userTimezone, month: 'long' })}
            The year is ${new Date().getFullYear()}
            The time is ${new Date().toLocaleString('en-US', { timeZone: userTimezone, hour: 'numeric', minute: '2-digit', hour12: true })}

            ---

            ### ✅ Output Format:
            - Convert the input time to UTC
            - Date: "Month Day, Year"
            - Time: "HH:MM AM/PM UTC"
            - If time is **not** mentioned, default to 9:00 AM in the user's timezone
            - ONLY RESPOND WITH THE TIME, IN THIS FORMAT:

            \`\`\`
            <TEXT>
            Converting "${timeStr}" from ${userTimezone} to UTC
            </TEXT>
            <TIME>April 21, 2025, 9:00 PM UTC</TIME>
            \`\`\``,
    });

    console.log('🔍 Parsing date from AI response...');
    // Extract the date/time from the response
    const timeMatch = dateResult.match(/<[tT][iI][mM][eE]>(.*?)<\/[tT][iI][mM][eE]>/);
    if (!timeMatch) {
      console.error('❌ Invalid date format in AI response, dateResult:', dateResult);
      throw new Error('Invalid date format in AI response');
    }

    const dateTimeStr = timeMatch[1];
    const dateTime = new Date(dateTimeStr);
    console.log('📅 Parsed reminder time (UTC):', dateTime.toISOString());

    // Create new reminder with the correct schema fields
    console.log('💾 Saving reminder to database...');
    const reminder = await db
      .insert(reminders)
      .values({
        id: uuidv4(),
        userId,
        todoId,
        title,
        description,
        reminderTime: dateTime,
        message,
        summary,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log('✅ Reminder created successfully:', {
      id: reminder[0].id,
      title: reminder[0].title,
      reminderTime: reminder[0].reminderTime.toISOString(),
    });

    return NextResponse.json(reminder[0]);
  } catch (error) {
    console.error('❌ Error creating reminder:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create reminder' },
      { status: error instanceof Error && error.message === 'Authentication required' ? 401 : 500 }
    );
  }
}

// Fetches all reminders for the authenticated user
// Optional: status query parameter to filter by reminder status
// Returns: array of reminder objects
export async function GET(req: Request) {
  try {
    const userId = await checkAuth();
    const url = new URL(req.url);
    const status = url.searchParams.get('status') as 'pending' | 'sent' | 'cancelled' | null;

    const query = status
      ? db
          .select()
          .from(reminders)
          .where(and(eq(reminders.userId, userId), eq(reminders.status, status)))
      : db.select().from(reminders).where(eq(reminders.userId, userId));

    const userReminders = await query;
    return NextResponse.json(userReminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch reminders' },
      { status: error instanceof Error && error.message === 'Authentication required' ? 401 : 500 }
    );
  }
}

// Updates a reminder's status
// Requires: id and status in the request body
// Status can be: 'pending', 'sent', or 'cancelled'
// Returns: the updated reminder object
export async function PATCH(req: Request) {
  try {
    const userId = await checkAuth();
    const { id, status } = await req.json();

    const updatedReminder = await db
      .update(reminders)
      .set({
        status: status as 'pending' | 'sent' | 'cancelled',
        updatedAt: new Date(),
      })
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
      .returning();

    if (!updatedReminder.length) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    return NextResponse.json(updatedReminder[0]);
  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update reminder' },
      { status: error instanceof Error && error.message === 'Authentication required' ? 401 : 500 }
    );
  }
}

// Deletes a reminder
// Requires: id in the request body
// Only allows deletion if the user owns the reminder
// Returns: the deleted reminder object
export async function DELETE(req: Request) {
  try {
    const userId = await checkAuth();
    const { id } = await req.json();

    const deletedReminder = await db
      .delete(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
      .returning();

    if (!deletedReminder.length) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    return NextResponse.json(deletedReminder[0]);
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete reminder' },
      { status: error instanceof Error && error.message === 'Authentication required' ? 401 : 500 }
    );
  }
}
