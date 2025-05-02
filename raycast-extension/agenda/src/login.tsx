import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { login } from "./utils/api";

export default function Command() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  async function handleSubmit(values: { email: string; password: string }) {
    if (!values.email.trim()) {
      setEmailError("Email is required");
      return;
    }
    if (!values.password.trim()) {
      setPasswordError("Password is required");
      return;
    }

    try {
      setIsLoading(true);
      await login(values.email, values.password);
      await showToast({
        style: Toast.Style.Success,
        title: "Logged in successfully",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Login failed",
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
          <Action.SubmitForm title="Login" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="email"
        title="Email"
        placeholder="Enter your email"
        error={emailError}
        onChange={() => setEmailError(undefined)}
        autoFocus
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Enter your password"
        error={passwordError}
        onChange={() => setPasswordError(undefined)}
      />
    </Form>
  );
} 