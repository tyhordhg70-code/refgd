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
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "**.clearbit.com" },
      { protocol: "https", hostname: "icons.duckduckgo.com" },
      { protocol: "https", hostname: "www.google.com" },
        { protocol: "https", hostname: "spawngc.gg" },
        { protocol: "https", hostname: "**.spawngc.gg" },
    ],
  },
};

export default nextConfig;
