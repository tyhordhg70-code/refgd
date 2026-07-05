"use client";

/**
 * Poll data for `[poll:<id>]` chat messages, mirroring the
 * useExtraReactions register-during-render pattern: `pollFor(id)` lazily
 * registers the id during render, a deferred batch GET loads all newly-seen
 * polls in one request, and a slow interval re-fetches the known set so vote
 * counts from other members propagate without a reload.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { PollData } from "@/lib/community";

const REFRESH_MS = 10000;

export interface Polls {
  /** Poll payload for a bubble (undefined while loading). */
  pollFor: (id: string) => PollData | undefined;
  /** Cast/replace the caller's vote; [] retracts. Returns server ok. */
  vote: (pollId: string, optionIdxs: number[]) => Promise<boolean>;
  /** Close voting (creator/admin only server-side). */
  close: (pollId: string) => Promise<boolean>;
}

export function usePolls(
  signedIn: boolean,
  onRequireSignIn?: () => void,
): Polls {
  const [map, setMap] = useState<Record<string, PollData>>({});
  const known = useRef<Set<string>>(new Set());
  const pending = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const requireSignIn = useRef(onRequireSignIn);
  requireSignIn.current = onRequireSignIn;

  const fetchIds = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const res = await fetch(
        `/api/community/chat/polls?ids=${encodeURIComponent(ids.join(","))}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        polls?: Record<string, PollData>;
      } | null;
      if (!mounted.current || !data?.polls) return;
      const polls = data.polls;
      if (Object.keys(polls).length === 0) return;
      setMap((prev) => ({ ...prev, ...polls }));
    } catch {
      /* transient — refresh interval retries */
    }
  }, []);

  const flush = useCallback(() => {
    timer.current = null;
    const ids = Array.from(pending.current);
    pending.current.clear();
    void fetchIds(ids);
  }, [fetchIds]);

  useEffect(() => {
    mounted.current = true;
    // Keep results live: other members' votes only exist server-side.
    const id = window.setInterval(() => {
      void fetchIds(Array.from(known.current));
    }, REFRESH_MS);
    return () => {
      mounted.current = false;
      window.clearInterval(id);
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [fetchIds]);

  // Render-phase registration is deliberate: refs only, fetch deferred to a
  // timeout, and the known-set makes it idempotent under Strict Mode.
  const pollFor = useCallback(
    (id: string): PollData | undefined => {
      if (!known.current.has(id)) {
        known.current.add(id);
        pending.current.add(id);
        if (!timer.current) timer.current = setTimeout(flush, 60);
      }
      return map[id];
    },
    [map, flush],
  );

  const vote = useCallback(
    async (pollId: string, optionIdxs: number[]): Promise<boolean> => {
      if (!signedIn) {
        requireSignIn.current?.();
        return false;
      }
      try {
        const res = await fetch("/api/community/chat/poll/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pollId, optionIdxs }),
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
        } | null;
        const ok = Boolean(res.ok && data?.ok);
        if (ok) void fetchIds([pollId]);
        return ok;
      } catch {
        return false;
      }
    },
    [signedIn, fetchIds],
  );

  const close = useCallback(
    async (pollId: string): Promise<boolean> => {
      if (!signedIn) {
        requireSignIn.current?.();
        return false;
      }
      try {
        const res = await fetch("/api/community/chat/poll/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pollId, close: true }),
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
        } | null;
        const ok = Boolean(res.ok && data?.ok);
        if (ok) void fetchIds([pollId]);
        return ok;
      } catch {
        return false;
      }
    },
    [signedIn, fetchIds],
  );

  return { pollFor, vote, close };
}
