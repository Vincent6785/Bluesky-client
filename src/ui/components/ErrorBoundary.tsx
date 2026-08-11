import { Component, type ErrorInfo, type ReactNode } from "react";
import { describeError } from "@/errors/describeError";

type Props = { children: ReactNode };
type State = { error: unknown };

/**
 * Catches render-time errors in its subtree so one broken screen shows a
 * recoverable message instead of taking down the whole app to a blank
 * white screen. Async errors (failed fetches, etc.) are handled separately
 * per-component — this only covers errors thrown while rendering.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: undefined };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", describeError(error).message, info.componentStack);
    }
  }

  override render() {
    if (this.state.error !== undefined) {
      return (
        <div className="centered-message">
          <p className="error-text">{describeError(this.state.error).message}</p>
          <button type="button" className="primary-button" onClick={() => this.setState({ error: undefined })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
