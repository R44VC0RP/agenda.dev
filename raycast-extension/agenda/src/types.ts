export interface Todo {
  id: string;
  title: string;
  dueDate?: string;
  urgency: number;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  comments: Comment[];
}

export interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    email: string;
  };
} 