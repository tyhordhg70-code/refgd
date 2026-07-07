"use client";

/**
 * Reactions for readonly bubbles — imported vouch history ("v<id>") and the
 * constant seed posts ("seed:<key>"). Live chat messages keep their own
 * reaction flow inside useCommunityChat; this hook covers everything else so
 * ANY signed-in member can toggle a reaction on ANY post, exactly like
 * Telegram.
 *
 * Usage: `reactionsFor(id, baseline)` is called during render. It lazily
 * registers the id, batches a single GET for all newly-seen ids, and merges
 * the live DB rows over the static imported baseline (e.g. the ❤️1 that
 * shipped with the READ ME post).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Reaction } from "./useCommunityChat";

export interface ExtraReactions {
  /** Merged (baseline + live) chips for a readonly target. */
  reactionsFor: (id: string, baseline?: Reaction[]) => Reaction[];
  /** Toggle the caller's reaction (server enforces auth/moderation). */
  toggle: (id: string, emoji: string) => Promise<void>;
}

export function useExtraReactions(
  signedIn: boolean,
  onRequireSignIn?: () => void,
  onNotice?: (msg: string) => void,
): ExtraReactions {
  const [map, setMap] = useState<Record<string, Reaction[]>>({});
  const known = useRef<Set<string>>(new Set());
  const pending = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const requireSignIn = useRef(onRequireSignIn);
  requireSignIn.current = onRequireSignIn;
  const notice = useRef(onNotice);
  notice.current = onNotice;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, []);

  const flush = useCallback(() => {
    timer.current = null;
    const ids = Array.from(pending.current);
    pending.current.clear();
    if (ids.length === 0) return;
    void fetch(
      `/api/community/chat/reactions?ids=${encodeURIComponent(ids.join(","))}`,
    )
      .then((r) => r.json())
      .then((data: { ok?: boolean; reactions?: Record<string, Reaction[]> }) => {
        if (!mounted.current || !data?.ok || !data.reactions) return;
        const rx = data.reactions;
        if (Object.keys(rx).length === 0) return;
        setMap((prev) => ({ ...prev, ...rx }));
      })
      .catch(() => undefined);
  }, []);

  // Render-phase registration is deliberate: refs only, fetch deferred to a
  // timeout, and the known-set makes it idempotent under Strict Mode.
  const register = useCallback(
    (id: string) => {
      if (known.current.has(id)) return;
      known.current.add(id);
      pending.current.add(id);
      if (!timer.current) timer.current = setTimeout(flush, 60);
    },
    [flush],
  );

  const reactionsFor = useCallback(
    (id: string, baseline?: Reaction[]): Reaction[] => {
      register(id);
      const live = map[id];
      if (!baseline || baseline.length === 0) return live ?? [];
      if (!live || live.length === 0) return baseline;
      const out: Reaction[] = baseline.map((b) => ({ ...b }));
      for (const r of live) {
        const hit = out.find((o) => o.emoji === r.emoji);
        if (hit) {
          hit.count += r.count;
          hit.mine = hit.mine || r.mine;
        } else {
          out.push({ ...r });
        }
      }
      return out;
    },
    [map, register],
  );

  const toggle = useCallback(
    async (id: string, emoji: string) => {
      if (!signedIn) {
        requireSignIn.current?.();
        return;
      }
      try {
        const res = await fetch("/api/community/chat/react", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: id, emoji }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          reactions?: Reaction[];
          error?: string;
        };
        // The 2-reactions-per-post cap comes back as a 409 WITH the current
        // chips — surface the notice and still sync state.
        if (!res.ok || !data.ok) {
          if (data.error && mounted.current) notice.current?.(data.error);
        }
        if (!data.reactions) return;
        known.current.add(id);
        if (mounted.current)
          setMap((prev) => ({ ...prev, [id]: data.reactions as Reaction[] }));
      } catch {
        /* ignore transient reaction errors */
      }
    },
    [signedIn],
  );

  return { reactionsFor, toggle };
}
