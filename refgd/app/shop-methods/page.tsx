export const dynamic = "force-dynamic";

  import ShopMethodsHero from "@/components/shop/ShopMethodsHero";
  import ShopMethodsGrid from "@/components/shop/ShopMethodsGrid";
  import EvadeImmersiveBg from "@/components/EvadeImmersiveBg";
  import catalog from "@/data/shop-methods.json";

  export const metadata = {
    title: "Shop Methods — RefundGod",
    description:
      "Books, exclusive mentorships, aged-order inserts, refund / SE methods and stealth / OPSec — the full RefundGod catalog.",
  };

  /**
   * /shop-methods — replicates refundgod.bgng.io shop home (Phase 1A).
   *
   * Layout:
   *   01 — ShopMethodsHero (hero banner + eyebrow + title + subtitle)
   *   02 — ShopMethodsGrid (5 category cards, each linking to
   *                         /shop-methods/[slug] for deep-linkable URLs)
   *
   * Phase 2 adds Buy Now expansion + NowPayments.io widget.
   * Phase 3 adds Telegram-style reviews section.
   * Phase 4 adds 3D scroll animations + polish.
   */
  export default function ShopMethodsPage() {
    return (
      <main className="relative">
        <EvadeImmersiveBg />
        <ShopMethodsHero hero={catalog.hero} />
        <ShopMethodsGrid categories={catalog.categories} />
      </main>
    );
  }
  