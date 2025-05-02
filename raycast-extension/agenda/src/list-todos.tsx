import { List, ActionPanel, Action, Icon, showToast, Toast, Form, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchTodos, updateTodo, deleteTodo, createTodo } from "./utils/api";
import { Todo } from "./types";

export default function Command() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTodos();
  }, []);

  async function loadTodos() {
    try {
      setIsLoading(true);
      const fetchedTodos = await fetchTodos();
      setTodos(fetchedTodos);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load todos",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggle(todo: Todo) {
    try {
      const updatedTodo = await updateTodo(todo.id, {
        completed: !todo.completed,
      });
      setTodos(todos.map((t) => (t.id === todo.id ? updatedTodo : t)));
      await showToast({
        style: Toast.Style.Success,
        title: updatedTodo.completed ? "Todo completed" : "Todo uncompleted",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update todo",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleDelete(todo: Todo) {
    try {
      await deleteTodo(todo.id);
      setTodos(todos.filter((t) => t.id !== todo.id));
      await showToast({
        style: Toast.Style.Success,
        title: "Todo deleted",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete todo",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search todos..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Todo"
            target={<AddTodoView onTodoCreated={loadTodos} />}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      {todos.map((todo) => (
        <List.Item
          key={todo.id}
          icon={todo.completed ? Icon.Checkmark : Icon.Circle}
          title={todo.title}
          subtitle={todo.dueDate}
          accessories={[
            { text: `Urgency: ${todo.urgency}` },
            { icon: todo.completed ? Icon.Checkmark : undefined },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title={todo.completed ? "Mark as Incomplete" : "Mark as Complete"}
                  icon={todo.completed ? Icon.Circle : Icon.Checkmark}
                  onAction={() => handleToggle(todo)}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete Todo"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(todo)}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function AddTodoView({ onTodoCreated }: { onTodoCreated: () => void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [urgencyError, setUrgencyError] = useState<string | undefined>();

  async function handleSubmit(values: {
    title: string;
    dueDate: string;
    urgency: string;
  }) {
    if (!values.title.trim()) {
      setTitleError("Title is required");
      return;
    }

    const urgency = parseFloat(values.urgency);
    if (isNaN(urgency) || urgency < 1 || urgency > 5) {
      setUrgencyError("Urgency must be a number between 1 and 5");
      return;
    }

    try {
      setIsLoading(true);
      const todo: Omit<Todo, "id" | "createdAt" | "updatedAt" | "userId" | "comments"> = {
        title: values.title,
        dueDate: values.dueDate || undefined,
        urgency: urgency,
        completed: false,
      };

      await createTodo(todo);
      await showToast({
        style: Toast.Style.Success,
        title: "Todo created",
      });
      onTodoCreated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create todo",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Todo" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="What needs to be done?"
        autoFocus
        error={titleError}
        onChange={() => setTitleError(undefined)}
      />
      <Form.TextField
        id="dueDate"
        title="Due Date"
        placeholder="tomorrow, next week, etc."
      />
      <Form.TextField
        id="urgency"
        title="Urgency (1-5)"
        placeholder="3"
        defaultValue="3"
        error={urgencyError}
        onChange={() => setUrgencyError(undefined)}
      />
    </Form>
  );
} 