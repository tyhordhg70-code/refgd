"use client";

/**
 * v6.13.54 — EditorErrorBoundary with retry budget.
 *
 * Wraps the editable subtree so a runtime exception thrown inside
 * an inline-editor component (EditableText/EditableImage popovers,
 * MoveHandle drag math, image scale composition, etc.) doesn't
 * bubble up to Next's red "Application error: a client-side
 * exception has occurred" screen and take down the entire page.
 *
 * v6.13.43 → v6.13.54 fix: the previous implementation auto-cleared
 * the error every microtask via `queueMicrotask`. That works for
 * transient races (a popover unmount, a stale ref) — but if the
 * underlying error is DETERMINISTIC on render (a child component
 * always throws), the boundary loops:
 *   catch → reset → re-render → catch → reset → …
 * React detects the runaway and gives up, surfacing exactly the
 * full-page "Application error" overlay this boundary was meant
 * to suppress.
 *
 * New behaviour: keep the auto-recover for transient errors, but
 * cap consecutive recoveries at MAX_RECOVERIES. After that we
 * stay in errored state and render a minimal fallback so the rest
 * of the page (Nav / Footer / non-editor content) keeps working
 * and the admin can refresh or navigate away. We also reset the
 * retry counter after a quiet period so independent later errors
 * still get the auto-recovery treatment.
 */

import React from "react";

type State = {
  hasError: boolean;
  key: number;
  /** How many times we've auto-recovered without a quiet period in between. */
  recoveries: number;
  /** Last error message — shown in admin fallback only. */
  message: string;
};

const MAX_RECOVERIES = 2;
const QUIET_RESET_MS = 5000;

export default class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, key: 0, recoveries: 0, message: "" };

  private quietTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(err: unknown): Partial<State> {
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.warn("[editor] caught runtime error:", err);

    const next = this.state.recoveries + 1;
    if (next > MAX_RECOVERIES) {
      // Give up auto-recovery — render the fallback so React stops
      // hammering the broken subtree.
      this.setState({ recoveries: next });
      return;
    }

    // Auto-recover by re-keying the subtree on the next tick.
    queueMicrotask(() => {
      this.setState((s) => ({ hasError: false, key: s.key + 1, recoveries: next }));
    });

    // Reset the retry counter after a period of stability so unrelated
    // later errors still get a fresh budget.
    if (this.quietTimer) clearTimeout(this.quietTimer);
    this.quietTimer = setTimeout(() => {
      this.setState({ recoveries: 0 });
      this.quietTimer = null;
    }, QUIET_RESET_MS);
  }

  componentWillUnmount() {
    if (this.quietTimer) clearTimeout(this.quietTimer);
  }

  private handleReset = () => {
    this.setState((s) => ({
      hasError: false,
      key: s.key + 1,
      recoveries: 0,
      message: "",
    }));
  };

  render() {
    if (this.state.hasError) {
      // Persistent error: render minimal fallback so the rest of the
      // page (Nav / Footer / non-editor content) keeps working and the
      // admin can refresh, exit edit mode, or navigate away.
      // Visitors (non-admin) shouldn't see this path because edit-only
      // components don't render for them — but if they do, the small
      // notice is far less alarming than Next.js's red overlay.
      return (
        <div
          style={{
            margin: "1.5rem auto",
            maxWidth: "32rem",
            padding: "1rem 1.25rem",
            borderRadius: "0.75rem",
            border: "1px solid rgba(252, 211, 77, 0.4)",
            background: "rgba(20, 16, 8, 0.6)",
            color: "rgba(255, 251, 235, 0.92)",
            fontSize: "0.9rem",
            lineHeight: 1.5,
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>
            Inline editor hit a snag
          </div>
          <div style={{ opacity: 0.8, marginBottom: "0.75rem" }}>
            The page is otherwise fine. Try refreshing, or click below to retry the editor.
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(252, 211, 77, 0.5)",
              background: "rgba(252, 211, 77, 0.12)",
              color: "rgba(255, 251, 235, 0.95)",
              cursor: "pointer",
            }}
          >
            Retry editor
          </button>
        </div>
      );
    }
    return (
      <React.Fragment key={this.state.key}>{this.props.children}</React.Fragment>
    );
  }
}
