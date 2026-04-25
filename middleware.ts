import { NextResponse, type NextRequest } from "next/server";

/**
 * Hidden admin: the admin pages live at /admin internally, but the public URL
 * is configurable via ADMIN_PATH. If ADMIN_PATH is not "admin", direct access
 * to /admin returns 404 — the admin is only reachable via the hidden slug.
 *
 * Examples:
 *   ADMIN_PATH=admin               → /admin works (default, no hiding)
 *   ADMIN_PATH=secret-control      → /secret-control works, /admin → 404
 *
 * The /api/admin/* endpoints stay at their canonical path because they are
 * called from the rewritten admin UI; they are protected by JWT cookie auth.
 */
export function middleware(req: NextRequest) {
  const adminPath = (process.env.ADMIN_PATH || "admin").trim().replace(/^\/+|\/+$/g, "");
  const url = req.nextUrl;
  const p = url.pathname;

  if (adminPath === "admin") return NextResponse.next();

  // Block direct /admin access when admin is hidden behind a custom slug.
  if (p === "/admin" || p.startsWith("/admin/")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Rewrite /<adminPath>(/...) → /admin(/...)
  if (p === `/${adminPath}` || p.startsWith(`/${adminPath}/`)) {
    const rewritten = p.replace(`/${adminPath}`, "/admin") || "/admin";
    return NextResponse.rewrite(new URL(rewritten + url.search, url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/admin", "/((?!_next|api|favicon|robots|sitemap).*)"],
};
