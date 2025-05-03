export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  userId: string;
  workspaceId?: string;
  createdAt: Date;
  updatedAt: Date;
  comments: Comment[];
  dueDate?: string;
  urgency: number;
  // Operation tracking properties - internal use only (not in DB)
  _lastUpdateId?: string;
  _deleteOperationId?: string | null;
}

export interface Comment {
  id: string;
  text: string;
  todoId: string;
  userId: string;
  createdAt: Date;
  user?: {
    name: string;
    image: string | null;
  };
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: 'owner' | 'member';
  user?: {
    name: string;
    image?: string | null;
  };
}
