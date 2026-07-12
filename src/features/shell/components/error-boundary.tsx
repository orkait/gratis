"use client";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";

/** The app had NO error boundary.
 *
 * A single legacy thread with no `modelId` made providerForModel() throw on `.startsWith`. React
 * unmounted the whole tree and the user got a blank page - which, showing only the raw background,
 * reads as "the app randomly switched to dark mode". One bad row in IndexedDB took down everything.
 *
 * A crash should cost you the broken surface, not the application.
 */

type Props = {
  children: ReactNode;
  /** Shown in the fallback so the user knows WHICH surface died. */
  surface: string;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Deliberately loud: a silent boundary is how a crash becomes a mystery.
    console.error(`[${this.props.surface}] render crashed`, error, info.componentStack);
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div role="alert" className="flex flex-col items-center justify-center gap-3 h-empty-state text-(--color-fg-subtle)">
        <TriangleAlert className="w-8 h-8 text-(--color-warning)" />

        <div className="text-center">
          <div className="text-base font-medium text-(--color-fg-muted)">
            The {this.props.surface} hit an error
          </div>
          <div className="text-sm mt-1">The rest of the app still works.</div>
          <div className="text-xs font-mono mt-2 opacity-80">{error.message}</div>
        </div>

        <button
          type="button"
          onClick={this.reset}
          className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-(--color-border) px-3 py-1.5 text-sm text-(--color-fg-muted) hover:bg-(--color-surface-2) transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Try again
        </button>
      </div>
    );
  }
}
