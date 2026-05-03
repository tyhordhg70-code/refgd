import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import CustomCursor from "@/components/CustomCursor";
import PulsatingOverlay from "@/components/PulsatingOverlay";
import GalaxyBackground from "@/components/GalaxyBackground";
import Cosmic3DShapes from "@/components/Cosmic3DShapes";
/* v6.13.27 — LoadingScreen RESTORED per user request ("Everything
   should download and boot during loading screen"). Was removed
   in v6.13.10; user since reported in-flight visual artifacts
   (black/violet bars, blank cards, fallback-vs-loaded transitions)
   that they don't want to see. Restoring the boot overlay so
   galaxy worker, hero canvas, and entrance components all warm
   up behind the splash and the user only sees a finished page
   once it lifts. The useEntranceReady gate in components is
   already wired up — just remounting the screen here re-arms it. */
import LoadingScreen from "@/components/LoadingScreen";
import SmoothScroll from "@/components/SmoothScroll";
import EditProvider from "@/lib/edit-context";
import EditorToolbar from "@/components/EditorToolbar";
import AutoEditWrapper from "@/components/AutoEditWrapper";
import EditorErrorBoundary from "@/components/EditorErrorBoundary";
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
      {/* v6.13.27 — REVERTED v6.13.26 violet→ink gradient back
          to solid bg-ink-950. The gradient produced a visible
          violet horizontal band at the top of the body (most
          noticeable on the home page above-the-fold), which
          the user reported as "now there's a violet bar".
          Going back to solid ink. The black-bar-during-scroll
          issue is now solved by the LoadingScreen restoration
          above — the page can't be scrolled until galaxy +
          critical assets are warm. */}
      <body className="min-h-screen bg-ink-950 text-white antialiased">
        {/* Lenis-powered smooth scroll for the entire site (no-op for
            users with prefers-reduced-motion). */}
        <SmoothScroll />
        {/* v6.13.27 — restored. Self-dismisses once the galaxy
            worker reports ready and the cinematic scene warm
            event fires (with a hard timeout fallback inside
            LoadingScreen so it can never strand the page). */}
        <LoadingScreen />
        <EditProvider initialAdmin={initialAdmin} initialContent={initialContent}>
        <EditorErrorBoundary>
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
        </EditorErrorBoundary>
        </EditProvider>
      </body>
    </html>
  );
}
