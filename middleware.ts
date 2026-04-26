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
export function middleware(req: NextRequest) {
  const adminPath = (process.env.ADMIN_PATH || "admin").trim().replace(/^\/+|\/+$/g, "");
  const url = req.nextUrl;
  const p = url.pathname;

  if (adminPath === "admin") return NextResponse.next();

  // Rewrite /<adminPath>(/...) → /admin(/...) — keeps the obscure URL
  // working for users who set ADMIN_PATH.
  if (p === `/${adminPath}` || p.startsWith(`/${adminPath}/`)) {
    const rewritten = p.replace(`/${adminPath}`, "/admin") || "/admin";
    return NextResponse.rewrite(new URL(rewritten + url.search, url));
  }

  // /admin remains accessible — auth is enforced by the page itself.
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/admin", "/((?!_next|api|favicon|robots|sitemap).*)"],
};
