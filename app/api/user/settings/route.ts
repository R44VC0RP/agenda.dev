import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for settings
const settingsSchema = z.object({
  reminderMinutes: z.number().int().min(1).max(10080), // Max 1 week in minutes
  aiSuggestedReminders: z.boolean(),
  weeklyReview: z.boolean(),
  timezone: z.string().min(1), // Add timezone validation
});

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.user.id),
    });

    if (!settings) {
      // Return default settings if none exist
      const browserTimezone = req.headers.get('x-timezone') || 'UTC';
      return NextResponse.json({
        reminderMinutes: 30,
        aiSuggestedReminders: false,
        weeklyReview: false,
        timezone: browserTimezone,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input
    const body = await req.json();
    const validationResult = settingsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid settings data',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { reminderMinutes, aiSuggestedReminders, weeklyReview, timezone } = validationResult.data;

    // Check if settings exist
    const existingSettings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.user.id),
    });

    if (existingSettings) {
      // Update existing settings
      await db
        .update(userSettings)
        .set({
          reminderMinutes,
          aiSuggestedReminders,
          weeklyReview,
          timezone,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, session.user.id));
    } else {
      // Create new settings
      await db.insert(userSettings).values({
        userId: session.user.id,
        reminderMinutes,
        aiSuggestedReminders,
        weeklyReview,
        timezone,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
