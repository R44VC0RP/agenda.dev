import { ActionPanel, Form, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { createTodo } from "./utils/api";
import { Todo } from "./types";

export default function Command() {
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
