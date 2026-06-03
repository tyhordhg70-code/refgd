"use client";

/**
 * ReactDomGuard — neutralises the "edit vanishes everything" crash.
 *
 * ROOT CAUSE (confirmed): `AutoEditWrapper` is a runtime DOM walker that,
 * in admin edit mode, mutates React-managed nodes directly — it sets
 * `el.textContent = …`, toggles `contentEditable`, and lets the browser
 * insert <br>/<div>/text nodes as the admin types. React has no knowledge
 * of these out-of-band mutations. The moment ANYTHING triggers a re-render
 * of a mutated subtree (e.g. saving a store calls `setStores`, or an inline
 * edit calls `setValue`), React's commit phase tries to reconcile its
 * virtual children against a DOM that no longer matches and calls
 * `Node.removeChild` / `Node.insertBefore` on nodes that are no longer where
 * React expects. Those native calls THROW `NotFoundError: Failed to execute
 * 'removeChild' on 'Node'`, the exception escapes the commit, and React
 * unmounts the whole root → the entire page (all stores) goes blank. A
 * reload fixes it because decoration only runs AFTER mount, before any
 * re-render. The EditorErrorBoundary can't save it: its recovery re-mounts
 * the subtree, AutoEditWrapper re-decorates, and the next edit crashes again.
 *
 * THE FIX: make `removeChild` / `insertBefore` defensive so they no-op in
 * exactly the invalid situation that manual DOM mutation creates instead of
 * throwing. This is the canonical, battle-tested workaround React itself
 * recommends for third-party/manual DOM mutation (facebook/react#11538,
 * the same crash Google Translate causes). It only changes behaviour for
 * calls that would otherwise throw — valid removals/insertions are
 * untouched — so it is safe for normal rendering.
 *
 * Mounted as the first node in <body> (and installed at module load) so the
 * guard is active before any reconciliation can run.
 */

let installed = false;

function installDomGuard(): void {
  if (installed) return;
  if (typeof window === "undefined") return;
  if (typeof Node !== "function" || !Node.prototype) return;
  installed = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    // Native removeChild throws if `child` is not actually a child of `this`.
    // That is precisely what happens after AutoEditWrapper rewrites a node's
    // contents out from under React. No-op instead of throwing.
    if (child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    // Native insertBefore throws if `referenceNode` is not a child of `this`.
    // When the reference node was removed by a manual mutation, fall back to
    // appending so React's commit can complete without crashing.
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, null) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

// Install eagerly when this client chunk loads — earlier than any effect.
if (typeof window !== "undefined") installDomGuard();

export default function ReactDomGuard(): null {
  // Belt-and-suspenders: also install during the first client render in case
  // module-eval ordering ever changes.
  if (typeof window !== "undefined") installDomGuard();
  return null;
}
