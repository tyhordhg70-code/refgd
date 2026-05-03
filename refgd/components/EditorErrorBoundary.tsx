"use client";

/**
 * v6.13.43 — EditorErrorBoundary.
 *
 * Wraps the editable subtree so a runtime exception thrown inside
 * an inline-editor component (EditableText/EditableImage popovers,
 * MoveHandle drag math, image scale composition, etc.) doesn't
 * bubble up to Next's red "Application error: a client-side
 * exception has occurred" screen and take down the entire page.
 *
 * Behaviour: the children re-render normally on the NEXT route /
 * navigation update. While in the errored state we render the
 * children prop unchanged but with the boundary "cleared" — most
 * inline-editor crashes are transient (a stale ref, a popover
 * unmount race) and React resumes correctly on the next tick.
 *
 * We intentionally don't show a UI shell — visitors should never
 * notice; only admins ever trigger these paths.
 */

import React from "react";

type State = { hasError: boolean; key: number };

export default class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, key: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.warn("[editor] caught runtime error, recovering:", err);
    // Recover on next tick by re-keying the subtree so React fully
    // remounts the editable components with fresh state.
    queueMicrotask(() => {
      this.setState((s) => ({ hasError: false, key: s.key + 1 }));
    });
  }

  render() {
    if (this.state.hasError) {
      // Render nothing for the one tick before remount — better than
      // showing Next's full-page error overlay.
      return null;
    }
    return (
      <React.Fragment key={this.state.key}>{this.props.children}</React.Fragment>
    );
  }
}
