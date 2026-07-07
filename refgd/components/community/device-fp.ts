/**
 * Client-side device signals for ban enforcement, built the way large
 * commercial sites (the "how does Amazon/eBay do it" ask) approach it:
 *
 *  1. MANY INDEPENDENT signals instead of one brittle combined hash. Each is
 *     hashed and matched on its own server-side, so a partial match (e.g. same
 *     GPU + audio stack but a new browser version) still scores toward a block
 *     while no single weak signal can false-positive on its own.
 *  2. A SELF-HEALING device id persisted in several stores (localStorage,
 *     cookie, IndexedDB). Clearing one store alone no longer mints a new id —
 *     the others re-seed it. Only a full data wipe rotates it.
 *  3. TRUSTED signals only. Every value is salted+hashed server-side; the raw
 *     canvas/audio/GPU strings never leave as identifiers beyond this request.
 *
 * Fail-soft everywhere: any error yields a missing signal; sign-in never breaks
 * because fingerprinting failed.
 */

const DID_KEY = "tg_device_id";
const IDB_NAME = "rg_dev";
const IDB_STORE = "kv";

function randId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function readCookieDid(): string | null {
  try {
    const m = document.cookie.match(/(?:^|;\s*)tg_did=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

function writeCookieDid(did: string): void {
  try {
    // ~2yr, lax so it rides normal navigations; not httpOnly (client mints it).
    document.cookie = `tg_did=${encodeURIComponent(did)}; path=/; max-age=63072000; SameSite=Lax`;
  } catch {
    /* cookies blocked — other stores still carry it */
  }
}

function idbGet(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const open = indexedDB.open(IDB_NAME, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(IDB_STORE);
      open.onerror = () => resolve(null);
      open.onsuccess = () => {
        try {
          const db = open.result;
          const tx = db.transaction(IDB_STORE, "readonly");
          const req = tx.objectStore(IDB_STORE).get(key);
          req.onsuccess = () =>
            resolve(typeof req.result === "string" ? req.result : null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });
}

function idbSet(key: string, value: string): void {
  try {
    const open = indexedDB.open(IDB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(IDB_STORE);
    open.onsuccess = () => {
      try {
        const tx = open.result.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(value, key);
      } catch {
        /* ignore */
      }
    };
  } catch {
    /* ignore */
  }
}

/**
 * Resolve the persistent device id from ANY surviving store, then rewrite it
 * back to every store so clearing one alone doesn't rotate it. Mints a fresh id
 * only when all stores are empty.
 */
async function getDeviceId(): Promise<string | null> {
  let ls: string | null = null;
  try {
    ls = localStorage.getItem(DID_KEY);
  } catch {
    ls = null;
  }
  const cookie = readCookieDid();
  const idb = await idbGet(DID_KEY);

  let did = ls || cookie || idb;
  if (!did) did = randId();

  // Re-seed every store with the resolved id (self-heal).
  try {
    localStorage.setItem(DID_KEY, did);
  } catch {
    /* private mode — cookie/idb still carry it */
  }
  if (cookie !== did) writeCookieDid(did);
  if (idb !== did) idbSet(DID_KEY, did);

  return did;
}

/* ── Legacy signal functions ──────────────────────────────────────────────
   Byte-identical to the pre-upgrade implementation so the combined `fp` hash
   matches historical banned records. DO NOT change these — the new richer
   signals below are ADDED alongside, never in place of, the legacy `fp`. */

/** Legacy canvas render (220x40, no arc) — kept for `fp` continuity. */
function legacyCanvasSignal(): string {
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

/** Legacy WebGL vendor|renderer (no params) — kept for `fp` continuity. */
function legacyWebglSignal(): string {
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

/** Legacy combined fingerprint — EXACT original attribute set + order. */
async function legacyFp(): Promise<string | null> {
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
      legacyWebglSignal(),
      legacyCanvasSignal(),
    ];
    return await sha256Hex(parts.join("\u001f"));
  } catch {
    return null;
  }
}

/** Small deterministic canvas render — hashes differ by GPU/driver/fonts. */
function canvasSignal(): string | null {
  try {
    const c = document.createElement("canvas");
    c.width = 240;
    c.height = 60;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(120, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.font = '15px "Arial"';
    ctx.fillText("refgd-fp \u{1F338} 3.14159", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.font = '17px "Times New Roman"';
    ctx.fillText("refgd-fp \u{1F338} 3.14159", 4, 33);
    ctx.strokeStyle = "rgba(0,0,80,0.5)";
    ctx.beginPath();
    ctx.arc(50, 45, 12, 0, Math.PI * 1.7);
    ctx.stroke();
    return c.toDataURL();
  } catch {
    return null;
  }
}

/** Unmasked WebGL vendor/renderer — identifies the GPU + driver stack. */
function webglSignal(): string | null {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl") ||
      c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return null;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = ext
      ? String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL))
      : String(gl.getParameter(gl.VENDOR));
    const renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    const params = [
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
    ].join(",");
    return `${vendor}|${renderer}|${params}`;
  } catch {
    return null;
  }
}

/**
 * Audio-stack fingerprint: render a short oscillator through an
 * OfflineAudioContext and sum the output. The tiny floating-point differences
 * between audio implementations are stable per device/browser build. Times out
 * fast and fails soft.
 */
function audioSignal(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const OfflineCtx =
        (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext })
          .OfflineAudioContext ||
        (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
          .webkitOfflineAudioContext;
      if (!OfflineCtx) return resolve(null);
      const ctx = new OfflineCtx(1, 44100, 44100);
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 10000;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -50;
      comp.knee.value = 40;
      comp.ratio.value = 12;
      comp.attack.value = 0;
      comp.release.value = 0.25;
      osc.connect(comp);
      comp.connect(ctx.destination);
      osc.start(0);
      let done = false;
      const finish = (v: string | null) => {
        if (done) return;
        done = true;
        resolve(v);
      };
      const timer = setTimeout(() => finish(null), 800);
      ctx.oncomplete = (e) => {
        clearTimeout(timer);
        try {
          const data = e.renderedBuffer.getChannelData(0);
          let sum = 0;
          for (let i = 4500; i < 5000; i++) sum += Math.abs(data[i]);
          finish(sum.toString());
        } catch {
          finish(null);
        }
      };
      ctx.startRendering();
    } catch {
      resolve(null);
    }
  });
}

/** Stable hardware/locale profile — coarse, so it groups similar devices. */
function hardwareSignal(): string | null {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    return [
      navigator.platform || "",
      String(navigator.hardwareConcurrency || 0),
      String(nav.deviceMemory || 0),
      String(navigator.maxTouchPoints || 0),
      String(screen.width),
      String(screen.height),
      String(screen.colorDepth),
      String(window.devicePixelRatio || 1),
      Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      navigator.language || "",
      (navigator.languages || []).join(","),
    ].join("|");
  } catch {
    return null;
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

/**
 * Independent per-attribute signals. Keys are stable identifiers the server
 * hashes and scores individually. `did` is the self-healing device id (raw
 * uuid — the server salts+hashes it too). Any value may be absent.
 */
export interface DeviceSignals {
  did: string | null;
  /** Combined legacy fingerprint (kept for back-compat with older records). */
  fp: string | null;
  /** Independent component signals for score-based matching. */
  signals: Record<string, string>;
}

/** Collect all device signals. Never throws; fields may be absent. */
export async function getDeviceSignals(): Promise<DeviceSignals> {
  if (typeof window === "undefined") return { did: null, fp: null, signals: {} };

  const did = await getDeviceId().catch(() => null);

  const [canvas, audio] = await Promise.all([
    Promise.resolve(canvasSignal()),
    audioSignal(),
  ]);
  const webgl = webglSignal();
  const hw = hardwareSignal();
  const ua = (() => {
    try {
      return navigator.userAgent || null;
    } catch {
      return null;
    }
  })();

  // Hash each component independently (short, opaque, safe to send).
  const entries: Array<[string, string | null]> = [
    ["canvas", canvas],
    ["webgl", webgl],
    ["audio", audio],
    ["hw", hw],
    ["ua", ua],
  ];
  const signals: Record<string, string> = {};
  for (const [k, v] of entries) {
    if (!v) continue;
    const h = await sha256Hex(`${k}:${v}`);
    if (h) signals[k] = h;
  }

  // Legacy combined fp — byte-identical to the pre-upgrade formula so banned
  // records from before this upgrade still match on the same device.
  const fp = await legacyFp();

  return { did, fp, signals };
}
