import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reminders, users, userSettings } from '@/lib/db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { formatInTimezone } from '@/lib/timezone-utils';

// Vercel cron job handler for checking and sending reminders
export async function GET(req: Request) {
  try {
    // Verify that this is a cron job request from Vercel
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('🔍 Checking for pending reminders...');

    // Get all pending reminders that are due (using UTC)
    const currentUTCTime = new Date();
    console.log('⏰ Current UTC time:', currentUTCTime.toISOString());

    const pendingReminders = await db
      .select({
        reminder: reminders,
        user: {
          email: users.email,
          name: users.name,
        },
        settings: {
          timezone: userSettings.timezone,
        },
      })
      .from(reminders)
      .leftJoin(users, eq(reminders.userId, users.id))
      .leftJoin(userSettings, eq(reminders.userId, userSettings.userId))
      .where(and(eq(reminders.status, 'pending'), lte(reminders.reminderTime, currentUTCTime)));

    console.log(`📬 Found ${pendingReminders.length} reminders to send`);

    // Send emails for each reminder
    const results = await Promise.allSettled(
      pendingReminders.map(async ({ reminder, user, settings }) => {
        // Skip reminders for users without email
        if (!user?.email) {
          console.warn(
            `Skipping reminder ${reminder.id}: No email found for user ${reminder.userId}`
          );
          return reminder.id;
        }

        const userTimezone = settings?.timezone || 'UTC';
        const localTime = formatInTimezone(reminder.reminderTime, userTimezone);

        // Send the email
        try {
          await sendEmail({
            to: user.email,
            subject: `you need to do: ${reminder.title.toLowerCase()}`,
            type: 'reminder',
            data: {
              todoTitle: reminder.title,
              dueDate: new Date(localTime),
              urgency: 100, // Since this is a reminder, we'll set it to 100% urgency
              comments: [], // No comments needed for reminder emails
              userTimeZone: userTimezone,
            },
          });

          // Update reminder status to sent
          await db
            .update(reminders)
            .set({
              status: 'sent',
              updatedAt: new Date(),
            })
            .where(eq(reminders.id, reminder.id));

          return reminder.id;
        } catch (error) {
          console.error(`Failed to send email for reminder ${reminder.id}:`, error);
          return reminder.id;
        }
      })
    );

    // Count successes and failures
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`✅ Successfully sent ${succeeded} reminders`);
    if (failed > 0) {
      console.error(`❌ Failed to send ${failed} reminders`);
    }

    return NextResponse.json({
      success: true,
      sent: succeeded,
      failed,
    });
  } catch (error) {
    console.error('Error in reminder check cron job:', error);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}
