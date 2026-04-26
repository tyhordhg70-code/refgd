import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import MusicPlayer from "@/components/MusicPlayer";
import { getContentBlock } from "@/lib/content";

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
  const [bannerText, bannerCta, bannerUrl] = await Promise.all([
    getContentBlock("banner.text"),
    getContentBlock("banner.cta"),
    getContentBlock("banner.url"),
  ]);

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
        <AnnouncementBanner text={bannerText} cta={bannerCta} url={bannerUrl} />
        <Nav />
        <main>{children}</main>
        <Footer />
        <MusicPlayer />
      </body>
    </html>
  );
}
