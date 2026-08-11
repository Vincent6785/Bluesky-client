import { useState, type FormEvent } from "react";
import { useAuthStore } from "@/store/authStore";
import { describeError } from "@/errors/describeError";

export function LoginScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const [handle, setHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!handle.trim()) return;
    setSubmitting(true);
    setError(undefined);
    try {
      // Navigates the browser away to the user's authorization server; this
      // call does not return on success.
      await signIn(handle.trim());
    } catch (err) {
      setSubmitting(false);
      setError(describeError(err).message);
    }
  }

  return (
    <div className="login-screen">
      <h1>Sign in to Bluesky</h1>
      <p>
        You'll be redirected to your account's authorization server (your PDS)
        to sign in. This app never sees your password.
      </p>
      <form onSubmit={onSubmit}>
        <input
          type="text"
          aria-label="Bluesky handle"
          placeholder="handle.bsky.social"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          autoComplete="username"
          autoFocus
        />
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="primary-button" disabled={submitting || !handle.trim()}>
          {submitting ? "Redirecting…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
