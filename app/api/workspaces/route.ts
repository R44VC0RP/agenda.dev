import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { workspaces, workspaceMembers, todos } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schema for workspace name
const workspaceNameSchema = z.object({
  name: z.string().min(1).max(50).trim(),
});

// Validation schema for workspace ID
const workspaceIdSchema = z.object({
  id: z.string().uuid(),
});

export async function GET() {
  try {
    // Get the cookie store asynchronously
    const cookieStore = await cookies();
    const cookieString = cookieStore.toString();

    // Get the session
    const session = await auth.api.getSession({
      headers: new Headers({
        cookie: cookieString,
      }),
    });

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get all workspaces for the user
    const userWorkspaces = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        ownerId: workspaces.ownerId,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
      })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, session.user.id));

    return NextResponse.json(userWorkspaces);
  } catch (error) {
    console.error('Failed to fetch workspaces:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Get the cookie store asynchronously
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

    // Validate input
    const body = await req.json();
    const validationResult = workspaceNameSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid workspace name',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;
    const workspaceId = uuidv4();
    const now = new Date();

    // Create workspace
    await db.transaction(async (tx) => {
      await tx.insert(workspaces).values({
        id: workspaceId,
        name,
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
    });

    return NextResponse.json({
      id: workspaceId,
      name,
      ownerId: session.user.id,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Failed to create workspace:', error);
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    // Get the cookie store asynchronously
    const cookieStore = await cookies();

    const session = await auth.api.getSession({
      headers: new Headers({
        cookie: cookieStore.toString(),
      }),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input
    const body = await req.json();
    const validationResult = workspaceIdSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid workspace ID',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { id: workspaceId } = validationResult.data;

    // Check if user has permission to delete the workspace
    const workspace = await db.query.workspaces.findFirst({
      where: and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, session.user.id)),
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found or unauthorized' }, { status: 404 });
    }

    // Check for incomplete todos
    const incompleteTodos = await db.query.todos.findMany({
      where: and(eq(todos.workspaceId, workspaceId), eq(todos.completed, false)),
    });

    if (incompleteTodos.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete workspace with incomplete todos',
        },
        { status: 400 }
      );
    }

    // Delete workspace and related data
    await db.transaction(async (tx) => {
      // Delete workspace members first (due to foreign key constraint)
      await tx.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));

      // Delete all todos in the workspace
      await tx.delete(todos).where(eq(todos.workspaceId, workspaceId));

      // Finally delete the workspace
      await tx.delete(workspaces).where(eq(workspaces.id, workspaceId));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete workspace:', error);
    return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 });
  }
}
