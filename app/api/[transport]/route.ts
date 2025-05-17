// app/api/[transport]/route.ts
import { auth } from '@/lib/auth';
import { createMcpHandler } from '@vercel/mcp-adapter';
import { withMcpAuth } from 'better-auth/plugins';
import { z } from 'zod';
import { db } from '@/lib/db';
import { todos, workspaces, workspaceMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const handler = async (request: Request) => {
  const session = await auth.api.getMcpSession({
    headers: request.headers,
  });

  if (!session) {
    console.log('No session found');
    return new Response(null, {
      status: 401,
    });
  }

  return createMcpHandler(
    server => {
      // List workspaces tool
      server.tool(
        'list_workspaces',
        'List all workspaces you have access to',
        { },
        async () => {
          const userWorkspaces = await db
            .select({
              id: workspaces.id,
              name: workspaces.name,
              role: workspaceMembers.role,
            })
            .from(workspaces)
            .innerJoin(
              workspaceMembers,
              eq(workspaces.id, workspaceMembers.workspaceId)
            )
            .where(eq(workspaceMembers.userId, session.userId));

          return {
            content: [{ 
              type: 'text', 
              text: `Your workspaces: ${JSON.stringify(userWorkspaces, null, 2)}` 
            }],
          };
        }
      );

      // List todos tool
      server.tool(
        'list_todos',
        'List your todos, optionally filtered by workspace',
        {
          workspaceId: z.string().optional(),
        },
        async ({ workspaceId }) => {
          const whereConditions = workspaceId 
            ? and(eq(todos.userId, session.userId), eq(todos.workspaceId, workspaceId))
            : eq(todos.userId, session.userId);

          const userTodos = await db.select()
            .from(todos)
            .where(whereConditions);

          return {
            content: [{ 
              type: 'text', 
              text: `Your todos: ${JSON.stringify(userTodos, null, 2)}` 
            }],
          };
        }
      );

      // Add todo tool
      server.tool(
        'add_todo',
        'Add a new todo item',
        {
          title: z.string(),
          workspaceId: z.string(),
          dueDate: z.string(),
          urgency: z.number(),
        },
        async ({ title, workspaceId, dueDate, urgency }) => {
          console.log('Adding todo', title, workspaceId, dueDate, urgency);
          const todo = await db.insert(todos).values({
            id: uuidv4(),
            title,
            userId: session.userId,
            workspaceId: workspaceId,
            completed: false,
            dueDate: dueDate || null,
            urgency: urgency || 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning();

          return {
            content: [{ 
              type: 'text', 
              text: `Added new todo: ${JSON.stringify(todo[0])}` 
            }],
          };
        }
      );

      // Mark todo completed tool
      server.tool(
        'complete_todo',
        'Mark a todo as completed, you can pass in a todo id as an argument with the id property',
        {
          id: z.string(),
        },
        async ({ id }) => {
          console.log('Completing todo', id);
          const updatedTodo = await db.update(todos)
            .set({ 
              completed: true,
              updatedAt: new Date()
            })
            .where(and(
              eq(todos.id, id),
              eq(todos.userId, session.userId)
            ))
            .returning();

          if (!updatedTodo.length) {
            return {
              content: [{ type: 'text', text: 'Todo not found or you do not have permission to update it.' }],
            };
          }

          return {
            content: [{ 
              type: 'text', 
              text: `Todo marked as completed: ${JSON.stringify(updatedTodo[0])}` 
            }],
          };
        }
      );
    },
    {
      capabilities: {
        tools: {
          list_workspaces: {
            description: 'List all workspaces you have access to',
          },
          list_todos: {
            description: 'List your todos, optionally filtered by workspace',
          },
          add_todo: {
            description: 'Add a new todo item',
          },
          complete_todo: {
            description: 'Mark a todo as completed, you can pass in a todo id',
          },
        },
      },
    },
    {
      redisUrl: process.env.REDIS_URL,
      streamableHttpEndpoint: '/api/mcp',
      sseEndpoint: '/api/sse',
      sseMessageEndpoint: '/api/message',
      maxDuration: 60,
      verboseLogs: true,
    }
  )(request);
};

export { handler as GET, handler as POST, handler as DELETE };