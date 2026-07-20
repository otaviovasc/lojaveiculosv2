import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorPage } from "./ErrorPage";

/**
 * Crash containment for the app shell and for individual module surfaces.
 * Shows the friendly ErrorPage and offers a reset instead of blanking the
 * viewport. Logs a structured, secret-free entry for diagnostics.
 */
export class AppErrorBoundary extends Component<
  {
    children: ReactNode;
    layout?: "fill" | "screen";
  },
  { error: Error | null }
> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ui:error-boundary]", {
      componentStack: info.componentStack ?? undefined,
      message: error.message,
      name: error.name,
    });
  }

  override render() {
    const { error } = this.state;
    if (error) {
      return (
        <ErrorPage
          layout={this.props.layout ?? "screen"}
          onRetry={this.reset}
        />
      );
    }
    return this.props.children;
  }

  private reset = () => {
    this.setState({ error: null });
  };
}
