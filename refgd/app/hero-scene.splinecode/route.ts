import { promises as fs } from "fs";
import path from "path";
import zlib from "zlib";
import { promisify } from "util";

/**
 * Same-origin scene server for the home Spline galaxy.
 *
 * Why this exists
 * ───────────────
 * The hero loads a ~23 MB `scene.splinecode`. Served straight from the Spline
 * CDN it had two problems:
 *   1. The CDN sends NO `Cache-Control`, so the browser re-downloaded the whole
 *      file heuristically on repeat visits ("it should save and load fast").
 *   2. It was shipped uncompressed — the CDN ignores `Accept-Encoding`.
 *
 * This route serves a brotli-compressed copy that lives in the repo
 * (`public/hero-scene.splinecode.br`, 14.3 MB) and:
 *   • sets `Content-Encoding: br` for clients that accept it (all modern
 *     browsers), so the FIRST download is ~36 % smaller — fully lossless, the
 *     decoded bytes are byte-identical to the original scene, so the look and
 *     animation are untouched;
 *   • decompresses on the fly for the rare client that can't do brotli;
 *   • sets `Cache-Control: immutable`, so the browser's own disk cache reuses
 *     it on every repeat visit instead of re-fetching;
 *   • if the local file can't be read on the host for any reason, redirects to
 *     the original Spline CDN URL — so the hero can NEVER end up broken.
 *
 * NOTE: this does not reduce runtime memory / GPU lag — the decoded scene is
 * still 23 MB in memory. Reducing that requires a lighter scene re-exported in
 * Spline (a small visual trade-off).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CDN_FALLBACK =
  "https://prod.spline.design/mzZcfxXnOQsM5LXz/scene.splinecode";

// `next start` runs from the app root, but the monorepo layout means the CWD
// can differ on some hosts — try the obvious candidates before giving up.
const CANDIDATE_PATHS = [
  path.join(process.cwd(), "public", "hero-scene.splinecode.br"),
  path.join(process.cwd(), "refgd", "public", "hero-scene.splinecode.br"),
];

const brotliDecompress = promisify(zlib.brotliDecompress);

let brBufPromise: Promise<Buffer | null> | null = null;
function loadBrotli(): Promise<Buffer | null> {
  if (!brBufPromise) {
    brBufPromise = (async () => {
      for (const p of CANDIDATE_PATHS) {
        try {
          return await fs.readFile(p);
        } catch {
          /* try the next candidate */
        }
      }
      return null;
    })();
  }
  return brBufPromise;
}

let identityBuf: Buffer | null = null;
async function loadIdentity(br: Buffer): Promise<Buffer> {
  if (!identityBuf) identityBuf = (await brotliDecompress(br)) as Buffer;
  return identityBuf;
}

const IMMUTABLE = "public, max-age=31536000, immutable";

function clientAcceptsBrotli(req: Request): boolean {
  const ae = req.headers.get("accept-encoding") || "";
  return /(^|[,\s])br($|[,\s;])/i.test(ae);
}

async function respond(req: Request, withBody: boolean): Promise<Response> {
  const br = await loadBrotli();
  if (!br) {
    // Local asset unreadable — fall back to the original CDN so the hero still
    // loads exactly as it did before this optimisation.
    return Response.redirect(CDN_FALLBACK, 302);
  }
  if (clientAcceptsBrotli(req)) {
    return new Response(withBody ? new Uint8Array(br) : null, {
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "br",
        "Cache-Control": IMMUTABLE,
        Vary: "Accept-Encoding",
      },
    });
  }
  const id = await loadIdentity(br);
  return new Response(withBody ? new Uint8Array(id) : null, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": IMMUTABLE,
      Vary: "Accept-Encoding",
    },
  });
}

export async function GET(req: Request): Promise<Response> {
  return respond(req, true);
}

export async function HEAD(req: Request): Promise<Response> {
  return respond(req, false);
}
