import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import CustomCursor from "@/components/CustomCursor";
import PulsatingOverlay from "@/components/PulsatingOverlay";
import GalaxyBackground from "@/components/GalaxyBackground";
import Cosmic3DShapes from "@/components/Cosmic3DShapes";
import LoadingScreen from "@/components/LoadingScreen";
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
      <body className="min-h-screen bg-ink-950 text-white antialiased">
        {/* Cinematic boot overlay — locks the page for ~2.4 s while
            the React tree mounts behind it so all GPU layers, fonts
            and images are warm before the user can scroll. */}
        <LoadingScreen />
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
