import { NextResponse, type NextRequest } from "next/server";

/**
 * Admin routing.
 *
 * /admin is ALWAYS publicly addressable (the login page itself is gated
 * by the JWT cookie auth in lib/auth.ts — there is no benefit to also
 * 404-ing the URL, and several user reports said "/admin returns 404"
 * because ADMIN_PATH was set on the host without them realising it).
 *
 * In addition, if ADMIN_PATH is configured to something other than
 * "admin", that custom slug is rewritten to /admin under the hood, so
 * BOTH /admin and /<adminPath> work. ADMIN_PATH stays as an
 * obscurity convenience, never as a security barrier.
 */
/**
 * v6.13.56 — Force no-store on every HTML response.
 *
 * Why: even though every page sets `dynamic = "force-dynamic"`, that
 * only controls Next.js's *internal* render cache. The HTTP response
 * still goes out without an explicit `Cache-Control` header, which
 * means Render's edge proxy (and any intermediate CDN/browser cache)
 * is free to keep serving the previously rendered HTML for minutes
 * or hours. From the admin's perspective: "Save works, I see the
 * change in edit mode, but visitors on the live URL still see the
 * old text". Forcing `no-store, must-revalidate` on every response
 * here guarantees every visitor request hits the origin, which then
 * hits the DB (cache disabled in lib/content.ts) and reflects the
 * latest admin edits immediately.
 *
 * We exclude /_next/static/* implicitly because the middleware
 * `matcher` already excludes _next. API routes can still set their
 * own cache headers (none currently do). Static images served from
 * /uploads or /public are also excluded by the matcher.
 */
function withNoStore(res: NextResponse): NextResponse {
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0",
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export function middleware(req: NextRequest) {
  const adminPath = (process.env.ADMIN_PATH || "admin").trim().replace(/^\/+|\/+$/g, "");
  const url = req.nextUrl;
  const p = url.pathname;

  // Static public assets MUST stay cacheable. Forcing no-store on them (the
  // matcher below catches everything outside /_next) re-downloads multi-MB
  // files — notably the hero video — on EVERY visit and refresh, which makes
  // the site feel like it never loads and makes the video stutter. Let
  // next.config.mjs headers() govern caching for these instead.
  if (
    /\.(?:mp4|webm|mov|m4v|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|mp3|wav|css|js|mjs|map|txt|json|pdf)$/i.test(p)
  ) {
    return NextResponse.next();
  }

  if (adminPath === "admin") return withNoStore(NextResponse.next());

  // Rewrite /<adminPath>(/...) → /admin(/...) — keeps the obscure URL
  // working for users who set ADMIN_PATH.
  if (p === `/${adminPath}` || p.startsWith(`/${adminPath}/`)) {
    const rewritten = p.replace(`/${adminPath}`, "/admin") || "/admin";
    return withNoStore(NextResponse.rewrite(new URL(rewritten + url.search, url)));
  }

  // /admin remains accessible — auth is enforced by the page itself.
  return withNoStore(NextResponse.next());
}

export const config = {
  matcher: ["/admin/:path*", "/admin", "/((?!_next|api|favicon|robots|sitemap).*)"],
};
