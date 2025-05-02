import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { AuthSession, Todo } from "../types";

// Get the API URL from Raycast preferences
const preferences = getPreferenceValues<{ apiUrl: string }>();
const API_URL = preferences.apiUrl || "http://localhost:3000/api";

// Authentication utilities
export async function getAuthToken(): Promise<string | null> {
  const session = await LocalStorage.getItem<string>("auth_session");
  if (!session) return null;
  return JSON.parse(session).token;
}

export async function setAuthSession(session: AuthSession) {
  await LocalStorage.setItem("auth_session", JSON.stringify(session));
}

export async function clearAuthSession() {
  await LocalStorage.removeItem("auth_session");
}

// API utilities
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      await clearAuthSession();
      throw new Error("Authentication expired");
    }
    throw new Error(`API error: ${response.statusText}`);
  }

  return response;
}

// Todo API functions
export async function fetchTodos(): Promise<Todo[]> {
  const response = await fetchWithAuth("/todos");
  const data = await response.json();
  return data as Todo[];
}

export async function createTodo(todo: Omit<Todo, "id" | "createdAt" | "updatedAt" | "userId" | "comments">): Promise<Todo> {
  const response = await fetchWithAuth("/todos", {
    method: "POST",
    body: JSON.stringify(todo),
  });
  const data = await response.json();
  return data as Todo;
}

export async function updateTodo(id: string, updates: Partial<Todo>): Promise<Todo> {
  const response = await fetchWithAuth(`/todos/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  return data as Todo;
}

export async function deleteTodo(id: string): Promise<void> {
  await fetchWithAuth(`/todos/${id}`, {
    method: "DELETE",
  });
}

// Auth API functions
export async function login(email: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  const data = await response.json();
  const session = data as AuthSession;
  await setAuthSession(session);
  return session;
} 