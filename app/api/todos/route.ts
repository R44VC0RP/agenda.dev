import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { todos, comments, users, workspaces, workspaceMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Validation schemas
const uuidSchema = z.string().uuid();
const todoCreateSchema = z.object({
  title: z.string().min(1).max(500).trim(),
  dueDate: z.string().nullable().optional(),
  urgency: z.number().int().min(1).max(5).default(1),
  workspaceId: z.string().uuid().nullable().optional(),
});

const todoUpdateSchema = z.object({
  id: z.string().uuid(),
  completed: z.boolean().optional(),
  dueDate: z.string().nullable().optional(),
  workspaceId: z.string().uuid().nullable().optional(),
});

const todoDeleteSchema = z.object({
  id: z.string().uuid(),
});

// Helper function to find personal workspace
async function findOrCreatePersonalWorkspace(userId: string) {
  // Find personal workspace
  const personalWorkspace = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaces.name, 'Personal')))
    .limit(1);

  // If personal workspace exists, return it
  if (personalWorkspace.length > 0) {
    return personalWorkspace[0].id;
  }

  // Create a new personal workspace
  const workspaceId = uuidv4();
  const now = new Date();

  await db.transaction(async (tx) => {
    // Create the workspace
    await tx.insert(workspaces).values({
      id: workspaceId,
      name: 'Personal',
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Add owner as member
    await tx.insert(workspaceMembers).values({
      workspaceId,
      userId,
      role: 'owner',
    });
  });

  return workspaceId;
}

/**
 * Retrieves the authenticated user's todos, optionally filtered by workspace, including nested comments and comment author info.
 *
 * Returns a JSON array of todos, each with associated comments and user details. If a `workspaceId` query parameter is provided, only todos from that workspace are returned.
 *
 * @returns A JSON response containing an array of todos with nested comments and comment user information.
 *
 * @remark Returns 401 if the user is not authenticated, 400 if the workspace ID is invalid, and 500 on server errors.
 */
export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the workspaceId from query parameter
    const url = new URL(req.url);
    const workspaceIdParam = url.searchParams.get('workspaceId');

    // Validate workspaceId if provided
    let workspaceId: string | null = null;
    if (workspaceIdParam) {
      try {
        workspaceId = uuidSchema.parse(workspaceIdParam);
      } catch (_) {
        return NextResponse.json({ error: 'Invalid workspace ID format' }, { status: 400 });
      }
    }

    // Build base query
    let query = db
      .select({
        todos: todos,
        comments: comments,
        commentUser: users,
      })
      .from(todos)
      .where(eq(todos.userId, session.user.id))
      .leftJoin(comments, eq(comments.todoId, todos.id))
      .leftJoin(users, eq(users.id, comments.userId));

    // Filter by workspace if provided
    if (workspaceId) {
      // Create a new query with the additional condition
      const userTodos = await db
        .select({
          todos: todos,
          comments: comments,
          commentUser: users,
        })
        .from(todos)
        .where(and(eq(todos.userId, session.user.id), eq(todos.workspaceId, workspaceId)))
        .leftJoin(comments, eq(comments.todoId, todos.id))
        .leftJoin(users, eq(users.id, comments.userId));

      // Group comments by todo
      const groupedTodos = userTodos.reduce((acc: any[], row) => {
        const todo = acc.find((t) => t.id === row.todos.id);
        if (todo) {
          if (row.comments) {
            todo.comments.push({
              ...row.comments,
              user: row.commentUser
                ? {
                    name: row.commentUser.name,
                    image: row.commentUser.image,
                  }
                : null,
            });
          }
        } else {
          acc.push({
            ...row.todos,
            comments: row.comments
              ? [
                  {
                    ...row.comments,
                    user: row.commentUser
                      ? {
                          name: row.commentUser.name,
                          image: row.commentUser.image,
                        }
                      : null,
                  },
                ]
              : [],
          });
        }
        return acc;
      }, []);

      return NextResponse.json(groupedTodos);
    }

    // Get all todos if no workspace filter
    const userTodos = await query;

    // Group comments by todo
    const groupedTodos = userTodos.reduce((acc: any[], row) => {
      const todo = acc.find((t) => t.id === row.todos.id);
      if (todo) {
        if (row.comments) {
          todo.comments.push({
            ...row.comments,
            user: row.commentUser
              ? {
                  name: row.commentUser.name,
                  image: row.commentUser.image,
                }
              : null,
          });
        }
      } else {
        acc.push({
          ...row.todos,
          comments: row.comments
            ? [
                {
                  ...row.comments,
                  user: row.commentUser
                    ? {
                        name: row.commentUser.name,
                        image: row.commentUser.image,
                      }
                    : null,
                },
              ]
            : [],
        });
      }
      return acc;
    }, []);

    return NextResponse.json(groupedTodos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
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
    const validationResult = todoCreateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid todo data',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { title, dueDate, urgency, workspaceId } = validationResult.data;

    // Get or create personal workspace if needed
    let todoWorkspaceId = workspaceId;
    if (!todoWorkspaceId) {
      todoWorkspaceId = await findOrCreatePersonalWorkspace(session.user.id);
    }

    const todo = await db
      .insert(todos)
      .values({
        id: uuidv4(),
        title,
        userId: session.user.id,
        workspaceId: todoWorkspaceId,
        completed: false,
        dueDate: dueDate || null,
        urgency,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ ...todo[0], comments: [] });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input
    const body = await req.json();
    const validationResult = todoUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { id, completed, dueDate, workspaceId } = validationResult.data;

    // Update the todo with changes
    const updateData: any = { updatedAt: new Date() };
    if (completed !== undefined) updateData.completed = completed;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (workspaceId !== undefined) updateData.workspaceId = workspaceId;

    // Update the todo
    await db
      .update(todos)
      .set(updateData)
      .where(and(eq(todos.id, id), eq(todos.userId, session.user.id)));

    // Fetch the updated todo with its comments
    const updatedTodo = await db
      .select({
        todos: todos,
        comments: comments,
        commentUser: users,
      })
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, session.user.id)))
      .leftJoin(comments, eq(comments.todoId, todos.id))
      .leftJoin(users, eq(users.id, comments.userId));

    // Format the response similar to GET route
    const formattedTodo = updatedTodo.reduce((acc: any, row) => {
      if (!acc.id) {
        acc = {
          ...row.todos,
          comments: [],
        };
      }
      if (row.comments) {
        acc.comments.push({
          ...row.comments,
          user: row.commentUser
            ? {
                name: row.commentUser.name,
                image: row.commentUser.image,
              }
            : null,
        });
      }
      return acc;
    }, {});

    return NextResponse.json(formattedTodo);
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
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
    const validationResult = todoDeleteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid delete request',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { id } = validationResult.data;

    await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, session.user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}
