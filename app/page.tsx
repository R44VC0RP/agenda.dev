import HomeClient from './HomeClient';
import { auth } from '@/lib/auth';
import type { Todo } from '@/lib/types';
import { db } from '@/lib/db';
import { todos, comments, users, workspaces, workspaceMembers } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export default async function Home() {
  const cookieStore = await cookies();
  const session = await auth.api.getSession({
    headers: new Headers({
      cookie: cookieStore.toString(),
    }),
  });
  let initialTodos: Todo[] = [];

  if (session?.user) {
    try {
      // Check if user has a personal workspace
      const userWorkspaces = await db
        .select()
        .from(workspaces)
        .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(and(eq(workspaceMembers.userId, session.user.id), eq(workspaces.name, 'Personal')))
        .limit(1);

      // Create personal workspace if user doesn't have one
      // Variable is used locally for workspace creation but not referenced elsewhere yet
      let _personalWorkspaceId: string;

      if (userWorkspaces.length === 0) {
        // Create personal workspace
        const workspaceId = uuidv4();
        const now = new Date();

        await db.transaction(async (tx) => {
          await tx.insert(workspaces).values({
            id: workspaceId,
            name: 'Personal',
            ownerId: session.user.id,
            createdAt: now,
            updatedAt: now,
          });

          await tx.insert(workspaceMembers).values({
            workspaceId,
            userId: session.user.id,
            role: 'owner',
          });
        });

        _personalWorkspaceId = workspaceId;

        // Assign any existing todos without workspace to personal workspace
        await db
          .update(todos)
          .set({ workspaceId })
          .where(and(eq(todos.userId, session.user.id), isNull(todos.workspaceId)));
      } else {
        _personalWorkspaceId = userWorkspaces[0].workspaces.id;
      }

      // Query todos directly from the database with comments and user info
      const userTodos = await db
        .select({
          todos: todos,
          comments: comments,
          commentUser: users,
        })
        .from(todos)
        .where(eq(todos.userId, session.user.id))
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

      // Helper function to generate a content hash for comparison
      const getContentHash = (todo: Todo) => {
        return `${todo.title.toLowerCase().trim()}_${todo.dueDate || ''}_${todo.urgency || 1}`;
      };

      // Dedupe todos by content hash
      initialTodos = Array.from(
        new Map(groupedTodos.map((todo: Todo) => [getContentHash(todo), todo])).values()
      );
    } catch (error) {
      console.error('Failed to fetch initial todos:', error);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <HomeClient initialTodos={initialTodos} />
    </main>
  );
}
