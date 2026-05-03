"use client";

/**
 * v6.13.55 — EditorIsland: per-element micro error boundary.
 *
 * Each inline-editor primitive (EditableText, EditableImage,
 * EditableLink/Button/MagneticButton, MoveHandle, ReorderableSection)
 * wraps its render in this island so that one broken element cannot
 * take down its siblings, its parent section, or — via the page-level
 * boundary's runaway loop — the whole page.
 *
 * Behaviour:
 *  - On render error: log a one-line warning (with optional id) and
 *    render the supplied `fallback` (defaults to nothing) for that one
 *    element only. The rest of the React tree continues normally.
 *  - We do NOT auto-reset. The page-level EditorErrorBoundary
 *    handled retry semantics; an island that swallowed its error
 *    must stay quiet until the user navigates / re-renders the
 *    parent on its own. This is what prevents the catch-reset loop.
 *  - For visitors (non-admin, non-edit-mode) the swallowed element
 *    is invisible — far preferable to a full-page red screen.
 */

import React from "react";

type Props = {
  /** Optional content-id to include in the dev console warning. */
  id?: string;
  /** Optional fallback render when the child throws. Defaults to null. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

type State = { hasError: boolean };

export default class EditorIsland extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.warn(
      `[editor-island${this.props.id ? `:${this.props.id}` : ""}] swallowed error:`,
      err,
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
