export const dynamic = "force-dynamic";

import ShopMethodsHero from "@/components/shop/ShopMethodsHero";
import ShopMethodsGrid from "@/components/shop/ShopMethodsGrid";
import ShopFeatures from "@/components/shop/ShopFeatures";
import ShopFAQ from "@/components/shop/ShopFAQ";
import ShopVouchesModal from "@/components/shop/ShopVouchesModal";
import { getShopCatalog } from "@/lib/shop-catalog";

export const metadata = {
  title: "Shop Methods — RefundGod",
  description:
    "Books, exclusive mentorships, aged-order inserts, refund / SE methods and stealth / OPSec — the full RefundGod catalog.",
};

export default async function ShopMethodsPage() {
  const catalog = await getShopCatalog();
  return (
    <main className="relative">
      {/* The animated liquid-particles background and the .rg-ambient-bg
          suppression now live in the shared app/shop-methods/layout.tsx so they
          persist (and never restart) when navigating between this page and the
          category pages. */}
      <ShopMethodsHero hero={catalog.hero} />
      <ShopMethodsGrid categories={catalog.categories} />
      <ShopFeatures />
      <ShopFAQ />
      <ShopVouchesModal />
    </main>
  );
}
