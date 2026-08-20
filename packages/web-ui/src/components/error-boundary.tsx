import { Component, createElement } from "react";
import type { ErrorInfo, ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { logError } from "../lib/logger";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

const DefaultFallback = ({
  error,
  onReset,
}: {
  error: Error;
  onReset: () => void;
}) => (
  <div className="flex h-screen flex-col items-center justify-center gap-4 text-content-secondary">
    <p>Something went wrong</p>
    <pre className="max-w-md overflow-auto rounded-sm bg-surface-tertiary p-4 text-xs text-content-tertiary">
      {error.message}
    </pre>
    <Button onClick={onReset}>Retry</Button>
  </div>
);

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  // eslint-disable-next-line class-methods-use-this
  componentDidCatch(error: Error, info: ErrorInfo): void {
    logError("UI_RENDER_ERROR", "React component render error", {
      componentStack: info.componentStack,
      error: error.message,
      stack: error.stack,
    });
  }

  handleReset = (): void => {
    // oxlint-disable-next-line react/no-set-state
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return createElement(DefaultFallback, {
        error: this.state.error,
        onReset: this.handleReset,
      });
    }

    return this.props.children;
  }
}
