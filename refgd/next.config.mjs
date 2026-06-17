import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // v6.13.60 — Ship sourcemaps to the browser so production stack
    // traces in user bug reports point at real file/line numbers
    // instead of minified chunk offsets. Tiny serving cost, massive
    // debugging payoff. Toggle off only if bandwidth becomes an
    // issue.
    productionBrowserSourceMaps: true,
  // Tell Next.js the monorepo root explicitly so it doesn't try to infer
  // it from lockfile locations (avoids the "multiple lockfiles" warning
  // when Render builds from the repo root).
  outputFileTracingRoot: path.join(__dirname, ".."),
  // Keep recently-visited pages in the client-side router cache so that going
  // back (e.g. tapping "All categories" after viewing a category) restores the
  // previous page instantly from cache instead of re-fetching the server
  // component — which is what made that navigation feel laggy. force-dynamic
  // pages still re-render fresh on a hard load / after this short window.
  experimental: {
    staleTimes: { dynamic: 120, static: 300 },
  },
  images: {
      // v6.13.65 — Enable Next.js image optimization for all external image hosts
      // we reference. Images get resized to the requested width, converted to
      // AVIF/WebP, and cached at the edge — cuts a 1.9 MB source PNG down to
      // ~10 KB for the 200 px thumbnails we display. Massive perf win.
      remotePatterns: [
        { protocol: "https", hostname: "spawngc.gg" },
        { protocol: "https", hostname: "logo.clearbit.com" },
        { protocol: "https", hostname: "**.clearbit.com" },
        { protocol: "https", hostname: "icons.duckduckgo.com" },
        { protocol: "https", hostname: "www.google.com" },
        { protocol: "https", hostname: "images.unsplash.com" },
        { protocol: "https", hostname: "live.staticflickr.com" },
        { protocol: "https", hostname: "upload.wikimedia.org" },
      ],
      formats: ["image/avif", "image/webp"],
      minimumCacheTTL: 604800,
    },
      async headers() {
        // Long-lived immutable caching for the mirrored shop illustrations and
        // any admin uploads. These files are content-addressed / stable, so the
        // browser (and Render's CDN) can cache them for a year instead of
        // re-fetching on every visit — fixes "images take a while to load in".
        return [
          {
            source: "/shop-images/:path*",
            headers: [
              { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
            ],
          },
          {
            source: "/uploads/:path*",
            headers: [
              { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
            ],
          },
          {
            source: "/gc-img/:path*",
            headers: [
              { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
            ],
          },
          {
            // Mirrored info-popup images (content-addressed sha1 filenames) for
            // the store-list / buy4u in-place info modals. Stable forever, so
            // cache for a year instead of revalidating on every visit.
            source: "/info-img/:path*",
            headers: [
              { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
            ],
          },
          {
            // Scroll-scrubbed hero frame sequence (f_001.webp … f_101.webp).
            // Content-stable and 1-indexed, so cache them for a year — the
            // browser reuses every frame on repeat visits instead of re-pulling
            // the whole sequence. public/ otherwise serves with max-age=0.
            source: "/hero-frames/:path*",
            headers: [
              { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
            ],
          },
          {
            // Pre-rendered hero cinematic clip (H.264 MP4 primary + webm
            // fallback). Content-stable single files, so cache for a year — the
            // browser reuses them on repeat visits instead of re-pulling several
            // MB. public/ otherwise serves max-age=0.
            source: "/hero-cinematic.:ext(mp4|webm)",
            headers: [
              { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
            ],
          },
          {
            // Looping color-changing sphere montage (current hero clip).
            // Content-stable single file → cache for a year so it is reused on
            // repeat visits instead of re-pulling ~13 MB every time.
            source: "/sphere-montage.mp4",
            headers: [
              { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
            ],
          },
          {
            // Mentorship page "Liquid Reflections" looping backdrop + its
            // poster. Content-stable single files → cache for a year so the
            // browser reuses them on repeat visits instead of re-pulling ~8 MB.
            // public/ otherwise serves max-age=0 (revalidates every load).
            source: "/mentorship-bg.:ext(mp4|webp)",
            headers: [
              { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
            ],
          },
          {
            // Poster image for the mentorship backdrop (filename ends -poster).
            source: "/mentorship-bg-poster.webp",
            headers: [
              { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
            ],
          },
        ];
      },
      async redirects() {
        return [
          {
            source: "/top-tier-methods",
            destination: "/shop-methods",
            permanent: true,
          },
        ];
      },
  };

  export default nextConfig;
