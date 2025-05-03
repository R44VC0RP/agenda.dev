import { openai } from '@ai-sdk/openai';

export const dynamic = 'force-static';
export const revalidate = false;

import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    // Authentication check
    const cookieStore = await cookies();
    const _session = await auth.api.getSession({
      headers: new Headers({
        cookie: cookieStore.toString(),
      }),
    });

    const { text } = await req.json();
    // Session not used in this endpoint
    // const session = await getSession();
    const currentDate = new Date();

    const systemPrompt = `### Convert Relative Time Expressions to Specific Date & Time Strings  

The current date and time is 

${currentDate.toLocaleString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})}

The day of the week is ${currentDate.toLocaleString('en-US', { weekday: 'long' })}

The month is ${currentDate.toLocaleString('en-US', { month: 'long' })}

The year is ${currentDate.getFullYear()}

The time is ${currentDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}



---

### ✅ Output Format:
- Date: "Month Day, Year"
- Time: "HH:MM AM/PM" (always include time if specified or implied)
- If time is **not** mentioned, default to 9:00 AM.
- MAKE SURE NOT TO GIVE DATES IN THE PAST, ONLY GIVE DATES IN THE FUTURE.
- ONLY RESPOND WITH THE TIME, IN THIS FORMAT:

\`\`\`
<TEXT>
</TEXT>
<TIME>April 21, 2025, 9:00 PM</TIME>
\`\`\`

YOU MUST USE THE <TIME></TIME> TAG TO RETURN THE DATE AND TIME. YOU CANNOT USE ANY OTHER TAGS TO RETURN THE DATE AND TIME.

---

### ✅ Examples:

**Input:** "tomorrow"  
- **Reasoning:** One calendar day after April 20.  
- **Output:** **"April 21, 2025, 12:00 AM"**

**Input:** "yesterday"  
- **Reasoning:** One calendar day before April 20.  
- **Output:** **"April 19, 2025, 12:00 AM"**

**Input:** "next week"  
- **Reasoning:** Next Monday from current date.  
- **Output:** **"April 28, 2025, 12:00 AM"**

**Input:** "in 30 minutes"  
- **Reasoning:** Add 30 minutes to 7:45 PM → 8:15 PM same day.  
- **Output:** **"April 20, 2025, 8:15 PM"**

**Input:** "in 2 hours"  
- **Reasoning:** Add 2 hours to 7:45 PM → 9:45 PM same day.  
- **Output:** **"April 20, 2025, 9:45 PM"**

**Input:** "in 3 days"  
- **Reasoning:** Add 3 days to April 20 → April 23.  
- **Output:** **"April 23, 2025, 12:00 AM"**

**Input:** "last Friday"  
- **Reasoning:** April 20, 2025 is Sunday. Last Friday = April 18, 2025.  
- **Output:** **"April 18, 2025, 12:00 AM"**

**Input:** "in 90 minutes"  
- **Reasoning:** Add 1 hour 30 minutes → 9:15 PM.  
- **Output:** **"April 20, 2025, 9:15 PM"**

---

### ⚠️ Notes:
- Durations like "in 45 minutes," "in 2 hours," or "in 10 days" must be **added precisely** to both date and time.
- If the expression crosses midnight, **adjust the date accordingly**.
- For ambiguous or unsupported formats (e.g., "soon"), return:  
  **"Unclear date/time - please rephrase."**
`;

    const { text: result } = await generateText({
      model: openai('gpt-4.1-mini'),
      prompt: text,
      system: systemPrompt,
    });

    // Extract the date/time from the response
    const timeMatch = result.match(/<TIME>(.*?)<\/TIME>/i);
    if (!timeMatch) {
      console.log('Invalid response format:', result);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 400 });
    }

    const dateTimeStr = timeMatch[1];
    const dateTime = new Date(dateTimeStr);

    return NextResponse.json({
      originalText: text,
      formattedDateTime: dateTimeStr,
      dateTime: dateTime.toISOString(),
    });
  } catch (error) {
    console.error('Error converting date:', error);
    return NextResponse.json({ error: 'Failed to convert date/time' }, { status: 500 });
  }
}
