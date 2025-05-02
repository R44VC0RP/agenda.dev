import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { comments, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Validation schemas
const commentCreateSchema = z.object({
  todoId: z.string().uuid(),
  text: z.string().min(1).max(1000).trim(),
});

const commentDeleteSchema = z.object({
  todoId: z.string().uuid(),
  commentId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input
    const body = await req.json();
    const validationResult = commentCreateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid comment data',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { todoId, text } = validationResult.data;

    const now = new Date();
    const comment = await db
      .insert(comments)
      .values({
        id: uuidv4(),
        text,
        todoId,
        userId: session.user.id,
        createdAt: now,
      })
      .returning();

    // Get user info
    const user = await db
      .select({
        name: users.name,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .then((rows) => rows[0]);

    return NextResponse.json({
      ...comment[0],
      createdAt: now.toISOString(),
      user: user || null,
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input
    const body = await req.json();
    const validationResult = commentDeleteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid delete request',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { todoId, commentId } = validationResult.data;

    await db
      .delete(comments)
      .where(
        and(
          eq(comments.id, commentId),
          eq(comments.todoId, todoId),
          eq(comments.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
