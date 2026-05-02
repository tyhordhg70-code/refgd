import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tell Next.js the monorepo root explicitly so it doesn't try to infer
  // it from lockfile locations (avoids the "multiple lockfiles" warning
  // when Render builds from the repo root).
  outputFileTracingRoot: path.join(__dirname, ".."),
  // Allow Replit's preview proxy domains during development so HMR/_next assets
  // don't trigger cross-origin warnings.
  allowedDevOrigins: [
    "*.replit.dev",
    "*.repl.co",
    "*.picard.replit.dev",
    "*.spock.replit.dev",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "**.clearbit.com" },
      { protocol: "https", hostname: "icons.duckduckgo.com" },
      { protocol: "https", hostname: "www.google.com" },
    ],
  },
};

export default nextConfig;
