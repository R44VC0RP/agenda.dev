import NewPageClient from "./NewPageClient"
import { auth } from "@/lib/auth"
import type { Todo } from "@/lib/types"
import { db } from "@/lib/db"
import { todos, comments, users } from "@/lib/db/schema"
import { eq, and, lte, gte, sql } from "drizzle-orm"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function NewPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const cookieStore = await cookies()
  const session = await auth.api.getSession({
    headers: new Headers({
      cookie: cookieStore.toString()
    })
  })
  
  // Require auth
  if (!session?.user) {
    redirect('/')
  }
  
  // Get view option from query params or default to 'all'
  const viewOption = Array.isArray(searchParams.view) 
    ? searchParams.view[0] 
    : (searchParams.view ?? 'all')
  
  let filteredTodos: Todo[] = []
  
  try {
    // Calculate date ranges based on view option
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    
    // Create where conditions based on view option
    let dateCondition = and(
      eq(todos.userId, session.user.id),
      gte(todos.dueDate, today.toISOString()),
      lte(todos.dueDate, endOfToday.toISOString())
    )
    
    if (viewOption === 'week') {
      // End of this week (Sunday)
      const endOfWeek = new Date(today)
      const daysUntilSunday = 7 - today.getDay()
      endOfWeek.setDate(today.getDate() + daysUntilSunday)
      endOfWeek.setHours(23, 59, 59, 999)
      
      dateCondition = and(
        eq(todos.userId, session.user.id),
        gte(todos.dueDate, today.toISOString()),
        lte(todos.dueDate, endOfWeek.toISOString())
      )
    } else if (viewOption === 'month') {
      // End of this month
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      
      dateCondition = and(
        eq(todos.userId, session.user.id),
        gte(todos.dueDate, today.toISOString()),
        lte(todos.dueDate, endOfMonth.toISOString())
      )
    } else if (viewOption === 'all') {
      // All todos regardless of date
      dateCondition = eq(todos.userId, session.user.id)
    }
    
    // Query todos with appropriate filter
    const userTodos = await db.select({
      todos: todos,
      comments: comments,
      commentUser: users
    })
    .from(todos)
    .where(dateCondition)
    .leftJoin(comments, eq(comments.todoId, todos.id))
    .leftJoin(users, eq(users.id, comments.userId))
    
    // Group comments by todo
    const groupedTodos = userTodos.reduce((acc: any[], row) => {
      const todo = acc.find(t => t.id === row.todos.id)
      if (todo) {
        if (row.comments) {
          todo.comments.push({
            ...row.comments,
            user: row.commentUser ? {
              name: row.commentUser.name,
              image: row.commentUser.image
            } : null
          })
        }
      } else {
        acc.push({
          ...row.todos,
          comments: row.comments ? [{
            ...row.comments,
            user: row.commentUser ? {
              name: row.commentUser.name,
              image: row.commentUser.image
            } : null
          }] : []
        })
      }
      return acc
    }, [])
    
    // Helper function to generate a content hash for comparison
    const getContentHash = (todo: Todo) => {
      return `${todo.title.toLowerCase().trim()}_${todo.dueDate || ''}_${todo.urgency || 1}`
    }

    // Dedupe todos by content hash
    filteredTodos = Array.from(
      new Map(
        groupedTodos.map((todo: Todo) => [
          getContentHash(todo),
          todo
        ])
      ).values()
    )
    
    // Sort todos by due date, with nulls at the end
    filteredTodos.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
  } catch (error) {
    console.error('Failed to fetch todos:', error)
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NewPageClient initialTodos={filteredTodos} initialViewOption={viewOption as string} />
    </main>
  )
} 