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

/**
 * Runs the full pipeline once on THIS device: API fetch → vendored Lottie
 * script → loadAnimation into an offscreen box → check an <svg> painted.
 * Returns human-readable result lines for the overlay.
 */
export async function runEmojiSelfTest(
  sampleId: string,
  version: number,
): Promise<string[]> {
  const out: string[] = [];
  try {
    out.push(`ua: ${navigator.userAgent}`);
    const url = `/api/community/emoji/${sampleId}?v=${version}`;
    out.push(`url: ${url}`);
    let ct = "";
    try {
      const res = await fetch(url);
      ct = res.headers.get("content-type") ?? "";
      const buf = await res.arrayBuffer();
      out.push(`fetch: ${res.status} ${ct || "(no ct)"} ${buf.byteLength}B`);
    } catch (e) {
      out.push(`fetch FAILED: ${String((e as Error)?.message ?? e)}`);
      return out;
    }
    const w = window as unknown as { lottie?: ProbeLottie };
    if (!w.lottie) {
      await new Promise<void>((resolve) => {
        const s = document.createElement("script");
        s.src = "/vendor/lottie-light.min.js";
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.head.appendChild(s);
      });
    }
    out.push(`lottie lib: ${w.lottie ? "LOADED" : "MISSING"}`);
    if (!w.lottie) return out;
    if (!ct.includes("json")) {
      out.push("(sample not Lottie JSON — render probe skipped)");
      return out;
    }
    const res2 = await fetch(url);
    const data: unknown = await res2.json();
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
      await new Promise((r) => setTimeout(r, 900));
      const svg = box.querySelector("svg");
      out.push(
        `render: svg=${svg ? "YES" : "NO"} nodes=${svg ? svg.childNodes.length : 0}`,
      );
      anim.destroy();
    } catch (e) {
      out.push(`render FAILED: ${String((e as Error)?.message ?? e)}`);
    } finally {
      box.remove();
    }
  } catch (e) {
    out.push(`selftest error: ${String((e as Error)?.message ?? e)}`);
  }
  return out;
}
