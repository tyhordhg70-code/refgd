import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import CustomCursor from "@/components/CustomCursor";
import PulsatingOverlay from "@/components/PulsatingOverlay";
import GalaxyBackground from "@/components/GalaxyBackground";
import Cosmic3DShapes from "@/components/Cosmic3DShapes";
/* v6.13.10 — LoadingScreen removed per user request ("loading scene
   still happens it shouldn't load"). The cinematic boot overlay
   added a hard ~1.5-2.4 s gate before any scrolling was allowed,
   which the user found intrusive. With it gone, entrance components
   that previously gated on `useEntranceReady()` now see the gate
   flag as `undefined` — the gate hook (loading-screen-gate.ts) was
   updated to treat `undefined` as "ready" so all entrance animations
   play immediately on first paint instead of waiting for an event
   that will never fire. */
import SmoothScroll from "@/components/SmoothScroll";
import EditProvider from "@/lib/edit-context";
import EditorToolbar from "@/components/EditorToolbar";
import AutoEditWrapper from "@/components/AutoEditWrapper";
import { getAllContentMap } from "@/lib/content";
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
  // We load both the DEFAULT_CONTENT seed *and* every saved row in the
  // DB — the latter is critical so ad-hoc ids that admins create
  // through the inline editor (theater video IDs, elastic detail copy,
  // etc.) survive page reloads.
  const initialContent = await getAllContentMap();

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
      {/* v6.13.26 — body bg was solid `bg-ink-950` (#05060a,
          near-black). Anywhere the GalaxyBackground worker
          hadn't yet repainted (boot delay, iOS Low Power Mode
          which auto-bails the worker via prefers-reduced-
          motion, or in-between worker frames during fast
          scroll) you saw the body's near-black bg as a "brief
          black bar" during scroll. Replaced with a deep
          violet→ink vertical gradient so any body show-through
          is atmospheric (matches the GalaxyBackground vibe)
          instead of a hard black void. The Tailwind class is
          kept as a non-rendering fallback for environments
          where inline styles don't apply. */}
      <body
        className="min-h-screen bg-ink-950 text-white antialiased"
        style={{
          background:
            "linear-gradient(180deg, #0c0822 0%, #0a0a1c 35%, #06060f 70%, #05060a 100%)",
        }}
      >
        {/* Lenis-powered smooth scroll for the entire site (no-op for
            users with prefers-reduced-motion). */}
        <SmoothScroll />
        {/* v6.13.10 — <LoadingScreen /> removed (see import note). */}
        <EditProvider initialAdmin={initialAdmin} initialContent={initialContent}>
          {/* Site-wide continuous WebGL galaxy field — every page scrolls
              over the same scene so transitions feel like one journey. */}
          <GalaxyBackground />
          {/* Subtle 3D wireframe shapes drifting behind every chapter —
              pure CSS @keyframes, GPU-only, zero JS thread cost. */}
          <Cosmic3DShapes />
          <PulsatingOverlay />
          <AnnouncementBanner
            text={initialContent["banner.text"]}
            cta={initialContent["banner.cta"]}
            url={initialContent["banner.url"]}
          />
          <Nav />
          <AutoEditWrapper>
            <main className="relative z-[2]">{children}</main>
          </AutoEditWrapper>
          <Footer />
          <CustomCursor />
          {/* Floating inline-editor toolbar (only renders for admins). */}
          <EditorToolbar />
        </EditProvider>
      </body>
    </html>
  );
}
