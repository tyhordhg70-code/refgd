/**
 * Client-side device signals for ban enforcement (owner ask: IP + device
 * fingerprinting so a banned user can't just rejoin over a VPN).
 *
 * Two independent signals, both sent to /api/community/auth where they are
 * salted+hashed server-side (raw values never persisted):
 *
 *  - `did` — a random UUID minted ONCE per browser and kept in localStorage.
 *    Collision-free by construction → zero false positives. Evadable only by
 *    clearing site data.
 *  - `fp`  — a rich multi-attribute hardware/browser fingerprint (canvas
 *    render hash, WebGL renderer string, screen metrics, timezone, language,
 *    cores, memory, platform, UA). Survives storage clearing AND VPNs — the
 *    signal the owner asked for — while being specific enough that two
 *    different devices essentially never share the full attribute set.
 *
 * Fail-soft everywhere: any error yields null for that signal; sign-in never
 * breaks because fingerprinting failed.
 */

const DID_KEY = "tg_device_id";

function getDeviceId(): string | null {
  try {
    let did = localStorage.getItem(DID_KEY);
    if (!did) {
      did =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DID_KEY, did);
    }
    return did;
  } catch {
    return null; // storage blocked (private mode) — did is simply absent
  }
}

/** Small deterministic canvas render — hashes differ by GPU/driver/fonts. */
function canvasSignal(): string {
  try {
    const c = document.createElement("canvas");
    c.width = 220;
    c.height = 40;
    const ctx = c.getContext("2d");
    if (!ctx) return "no-2d";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(120, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.font = '15px "Arial"';
    ctx.fillText("refgd-fp \u{1F338} 3.14159", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.font = '17px "Times New Roman"';
    ctx.fillText("refgd-fp \u{1F338} 3.14159", 4, 33);
    return c.toDataURL();
  } catch {
    return "no-canvas";
  }
}

/** Unmasked WebGL vendor/renderer — identifies the GPU + driver stack. */
function webglSignal(): string {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl") ||
      c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "no-webgl";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = ext
      ? String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL))
      : String(gl.getParameter(gl.VENDOR));
    const renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    return `${vendor}|${renderer}`;
  } catch {
    return "no-webgl";
  }
}

async function sha256Hex(input: string): Promise<string | null> {
  try {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(input),
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null; // crypto.subtle needs a secure context — absent = no fp
  }
}

export interface DeviceSignals {
  fp: string | null;
  did: string | null;
}

/** Collect both device signals. Never throws; either field may be null. */
export async function getDeviceSignals(): Promise<DeviceSignals> {
  if (typeof window === "undefined") return { fp: null, did: null };
  const did = getDeviceId();
  let fp: string | null = null;
  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const parts = [
      navigator.userAgent,
      navigator.platform || "",
      navigator.language,
      (navigator.languages || []).join(","),
      String(screen.width),
      String(screen.height),
      String(screen.colorDepth),
      String(window.devicePixelRatio || 1),
      Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      String(navigator.hardwareConcurrency || 0),
      String(nav.deviceMemory || 0),
      String(navigator.maxTouchPoints || 0),
      webglSignal(),
      canvasSignal(),
    ];
    fp = await sha256Hex(parts.join("\u001f"));
  } catch {
    fp = null;
  }
  return { fp, did };
}
