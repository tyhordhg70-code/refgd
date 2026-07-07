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
  /** Crash site (top componentStack frames) — shown in admin fallback only. */
  site: string;
  /** When the crash was caught (local time) — shown in admin fallback only. */
  at: string;
};

const MAX_RECOVERIES = 2;
const QUIET_RESET_MS = 5000;

// Fire-and-forget crash report — inside webviews (Telegram Mini App, in-app
// browsers) there is no console to read, so the caught error is shipped to
// /api/client-error where it can be inspected server-side. Hard-capped per
// page load so a render loop can't spam the endpoint.
let reportsSent = 0;
const MAX_REPORTS = 3;
function reportCrash(payload: {
  message: string;
  stack: string;
  site: string;
  path: string;
}): void {
  if (reportsSent >= MAX_REPORTS) return;
  reportsSent += 1;
  try {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      /* diagnostics only — never surface */
    });
  } catch {
    /* diagnostics only — never surface */
  }
}

export default class EditorErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    /** Show the caught error's message in the fallback (admins only). */
    showDetail?: boolean;
  },
  State
> {
  state: State = {
    hasError: false,
    key: 0,
    recoveries: 0,
    message: "",
    site: "",
    at: "",
  };

  private quietTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(err: unknown): Partial<State> {
    const message =
      err instanceof Error
        ? `${err.name}: ${err.message}`
        : typeof err === "string"
          ? err
          : "Unknown error";
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown, info?: React.ErrorInfo) {
    // console.error (not warn) with the component stack so the crash site is
    // findable from a screenshot / remote log — the fallback text alone says
    // nothing about WHAT broke.
    // eslint-disable-next-line no-console
    console.error(
      "[editor] caught runtime error:",
      err,
      info?.componentStack ?? "",
    );

    // Capture WHERE it threw for the admin detail box: the top frames of the
    // component stack name the crashing component directly, which the bare
    // error message ("Cannot read properties of undefined…") never does.
    const site = (info?.componentStack ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(" \u2190 ");
    this.setState({ site, at: new Date().toLocaleTimeString() });

    reportCrash({
      message:
        err instanceof Error
          ? `${err.name}: ${err.message}`
          : typeof err === "string"
            ? err
            : "Unknown error",
      stack: err instanceof Error ? (err.stack ?? "").slice(0, 2000) : "",
      site: (info?.componentStack ?? "").slice(0, 2000),
      path:
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "",
    });

    // Mid-deploy chunk failures (the served HTML references a JS chunk that
    // times out / 404s while Render swaps instances) are transient — a fresh
    // load fixes them. Reload once instead of stranding the user on a dead
    // half-page (SSR markup visible, nothing clickable, spinners forever).
    // The sessionStorage stamp stops a reload loop if the chunk is truly gone.
    const msgText =
      err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    if (
      typeof window !== "undefined" &&
      /ChunkLoadError|Loading (CSS )?chunk .+ failed|dynamically imported module|module script failed/i.test(
        msgText,
      )
    ) {
      let last = 0;
      try {
        last = Number(window.sessionStorage.getItem("rg-chunk-reload") ?? 0);
      } catch {
        /* storage blocked — fall through to normal recovery */
      }
      if (Date.now() - last > 60_000) {
        try {
          window.sessionStorage.setItem("rg-chunk-reload", String(Date.now()));
          window.location.reload();
          return;
        } catch {
          /* storage blocked — never risk a reload loop without the guard */
        }
      }
    }

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
      site: "",
      at: "",
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
          {this.props.showDetail && this.state.message ? (
            <div
              style={{
                marginBottom: "0.75rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                background: "rgba(0, 0, 0, 0.35)",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "0.75rem",
                opacity: 0.75,
                overflowWrap: "break-word",
                textAlign: "left",
              }}
            >
              <div>{this.state.message}</div>
              {this.state.site ? (
                <div style={{ marginTop: "0.35rem", opacity: 0.8 }}>
                  in {this.state.site}
                </div>
              ) : null}
              <div style={{ marginTop: "0.35rem", opacity: 0.6 }}>
                {typeof window !== "undefined" ? window.location.pathname : ""}
                {this.state.at ? ` \u00b7 ${this.state.at}` : ""}
              </div>
            </div>
          ) : null}
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
