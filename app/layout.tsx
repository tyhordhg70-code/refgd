import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import CustomCursor from "@/components/CustomCursor";
import PulsatingOverlay from "@/components/PulsatingOverlay";
import GalaxyBackground from "@/components/GalaxyBackground";
import EditProvider from "@/lib/edit-context";
import EditorToolbar from "@/components/EditorToolbar";
import { DEFAULT_CONTENT, getContentBlock } from "@/lib/content";
import { readSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "RefundGod — Refunds, Replacements, Mentorships",
  description:
    "RefundGod offers refund services, exclusive mentorships, and a curated store list across USA, Canada, EU and UK. Safe, fast, encrypted process.",
  keywords: [
    "refundgod",
    "refund service",
    "refund mentorship",
    "social engineering",
    "evade cancelations",
    "store list",
  ],
  openGraph: {
    title: "RefundGod",
    description:
      "Refunds, replacements, and exclusive mentorships across USA, Canada, EU, UK.",
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: "RefundGod",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve every known content block server-side so the inline editor
  // already has the correct starting values when the React tree mounts.
  // (Cheap — they all come from a single in-memory cache after the first
  // call to getContentBlock.)
  const ids = Object.keys(DEFAULT_CONTENT);
  const values = await Promise.all(ids.map((id) => getContentBlock(id)));
  const initialContent: Record<string, string> = {};
  ids.forEach((id, i) => {
    initialContent[id] = values[i];
  });

  // Server-side admin check — the toolbar only renders if this is true.
  // We re-check from the client on visibilitychange to handle the
  // "logged out in another tab" case.
  const session = await readSession();
  const initialAdmin = Boolean(session);

  return (
    <html lang="en" className="bg-ink-950">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://api.fontshare.com" />
        {/* Geist (body) + Space Grotesk fallback (display) — replaces the
            generic Inter look with a more crafted, professional pairing. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
        {/* Clash Display for show-stopper headlines (free from Fontshare) */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "RefundGod",
              url: process.env.NEXT_PUBLIC_SITE_URL,
              sameAs: ["https://t.me/refundlawfirm"],
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-ink-950 text-white antialiased">
        <EditProvider initialAdmin={initialAdmin} initialContent={initialContent}>
          {/* Site-wide continuous WebGL galaxy field — every page scrolls
              over the same scene so transitions feel like one journey. */}
          <GalaxyBackground />
          <PulsatingOverlay />
          <AnnouncementBanner
            text={initialContent["banner.text"]}
            cta={initialContent["banner.cta"]}
            url={initialContent["banner.url"]}
          />
          <Nav />
          <main className="relative z-[2]">{children}</main>
          <Footer />
          <CustomCursor />
          {/* Floating inline-editor toolbar (only renders for admins). */}
          <EditorToolbar />
        </EditProvider>
      </body>
    </html>
  );
}
