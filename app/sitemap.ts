import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const now = new Date();
  const routes = [
    "",
    "/store-list",
    "/our-service",
    "/exclusive-mentorships",
    "/evade-cancelations",
    "/top-tier-methods",
    "/vouches",
  ];
  return routes.map((r) => ({
    url: `${base}${r}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: r === "" ? 1.0 : 0.7,
  }));
}
