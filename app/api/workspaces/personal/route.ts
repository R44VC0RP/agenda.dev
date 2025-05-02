import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { workspaces, workspaceMembers, todos } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

// Create a personal workspace for a user and assign any unassigned todos to it
export async function POST() {
  try {
    const cookieStore = await cookies();
    const session = await auth.api.getSession({
      headers: new Headers({
        cookie: cookieStore.toString(),
      }),
    });

    // More robust session validation
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has a workspace named "Personal"
    const existingPersonal = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaceMembers.userId, session.user.id), eq(workspaces.name, 'Personal')))
      .limit(1);

    // If user already has a personal workspace, return it
    if (existingPersonal.length > 0) {
      return NextResponse.json({
        id: existingPersonal[0].id,
        name: 'Personal',
        ownerId: session.user.id,
      });
    }

    // Create a new personal workspace
    const workspaceId = uuidv4();
    const now = new Date();

    await db.transaction(async (tx) => {
      // Create the workspace
      await tx.insert(workspaces).values({
        id: workspaceId,
        name: 'Personal',
        ownerId: session.user.id,
        createdAt: now,
        updatedAt: now,
      });

      // Add owner as member
      await tx.insert(workspaceMembers).values({
        workspaceId,
        userId: session.user.id,
        role: 'owner',
      });

      // Update all user todos with null workspaceId to use the personal workspace
      await tx
        .update(todos)
        .set({ workspaceId })
        .where(and(eq(todos.userId, session.user.id), isNull(todos.workspaceId)));
    });

    return NextResponse.json({
      id: workspaceId,
      name: 'Personal',
      ownerId: session.user.id,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Failed to create personal workspace:', error);
    return NextResponse.json({ error: 'Failed to create personal workspace' }, { status: 500 });
  }
}
