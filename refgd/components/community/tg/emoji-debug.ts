/**
 * On-device diagnostics for the custom-emoji render cascade.
 *
 * The picker/message tiles bump counters as each cascade stage succeeds or
 * fails, and record the last few error reasons. The EmojiPanel exposes a
 * hidden overlay (tap the "Custom" tab 5 times fast) that shows this
 * snapshot plus a live self-test — so a device we can't reach (e.g. the
 * Telegram Mini App webview) can report exactly which step breaks.
 */

type Counts = Record<string, number>;

const counts: Counts = {};
const errors: string[] = [];

export function emojiDebugBump(key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

export function emojiDebugError(msg: string): void {
  const t = new Date().toISOString().slice(11, 19);
  errors.push(`${t} ${msg}`);
  if (errors.length > 10) errors.shift();
}

export interface EmojiDebugSnapshot {
  counts: Counts;
  errors: string[];
}

export function getEmojiDebugSnapshot(): EmojiDebugSnapshot {
  return { counts: { ...counts }, errors: [...errors] };
}

type ProbeLottie = {
  loadAnimation(opts: Record<string, unknown>): { destroy(): void };
};

/** Rejects after `ms` so a hanging step reports as a TIMEOUT line. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(
      () => reject(new Error(`${label} TIMEOUT ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * Runs the full pipeline once on THIS device: API fetch → vendored Lottie
 * script → loadAnimation into an offscreen box → check an <svg> painted.
 * Reports each step INCREMENTALLY via onLine (so a hang still shows every
 * completed step) and every step has its own timeout — the test can never
 * stick at "running…".
 */
export async function runEmojiSelfTest(
  sampleId: string,
  version: number,
  onLine: (line: string) => void,
): Promise<void> {
  try {
    const url = `/api/community/emoji/${sampleId}?v=${version}`;
    onLine(`url: ${url}`);
    let ct = "";
    let bytes: ArrayBuffer | null = null;
    try {
      const ac = new AbortController();
      const kill = window.setTimeout(() => ac.abort(), 10000);
      const res = await withTimeout(
        fetch(url, { signal: ac.signal }),
        10000,
        "fetch",
      );
      ct = res.headers.get("content-type") ?? "";
      onLine(`fetch: ${res.status} ${ct || "(no ct)"}`);
      bytes = await withTimeout(res.arrayBuffer(), 10000, "body");
      window.clearTimeout(kill);
      onLine(`body: ${bytes.byteLength}B`);
    } catch (e) {
      onLine(`fetch FAILED: ${String((e as Error)?.message ?? e)}`);
      return;
    }
    const w = window as unknown as { lottie?: ProbeLottie };
    if (!w.lottie) {
      onLine("loading /vendor/lottie-light.min.js …");
      try {
        await withTimeout(
          new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "/vendor/lottie-light.min.js";
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("script onerror"));
            document.head.appendChild(s);
          }),
          10000,
          "script",
        );
      } catch (e) {
        onLine(`script FAILED: ${String((e as Error)?.message ?? e)}`);
      }
    }
    onLine(`lottie lib: ${w.lottie ? "LOADED" : "MISSING"}`);
    if (!w.lottie) return;
    if (!ct.includes("json") || !bytes) {
      onLine("(sample not Lottie JSON — render probe skipped)");
      return;
    }
    let data: unknown;
    try {
      data = JSON.parse(new TextDecoder().decode(bytes));
      onLine("json: parsed OK");
    } catch (e) {
      onLine(`json FAILED: ${String((e as Error)?.message ?? e)}`);
      return;
    }
    const box = document.createElement("div");
    box.style.cssText =
      "position:fixed;left:-200px;top:0;width:64px;height:64px";
    document.body.appendChild(box);
    try {
      const anim = w.lottie.loadAnimation({
        container: box,
        renderer: "svg",
        loop: false,
        autoplay: true,
        animationData: data,
      });
      onLine("loadAnimation: called OK");
      await new Promise((r) => setTimeout(r, 900));
      const svg = box.querySelector("svg");
      onLine(
        `render: svg=${svg ? "YES" : "NO"} nodes=${svg ? svg.childNodes.length : 0}`,
      );
      anim.destroy();
    } catch (e) {
      onLine(`render FAILED: ${String((e as Error)?.message ?? e)}`);
    } finally {
      box.remove();
    }
    onLine("self-test DONE");
  } catch (e) {
    onLine(`selftest error: ${String((e as Error)?.message ?? e)}`);
  }
}
