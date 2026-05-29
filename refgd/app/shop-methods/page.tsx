export const dynamic = "force-dynamic";

import ShopMethodsHero from "@/components/shop/ShopMethodsHero";
import ShopMethodsGrid from "@/components/shop/ShopMethodsGrid";
import ShopFeatures from "@/components/shop/ShopFeatures";
import ShopFAQ from "@/components/shop/ShopFAQ";
import ShopVouchesModal from "@/components/shop/ShopVouchesModal";
import ShopLiquidParticles from "@/components/shop/ShopLiquidParticles";
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
      {/* On this page the ShopLiquidParticles layer paints an OPAQUE liquid
          gradient over the whole viewport, so the global ambient background
          layers (WebGL galaxy + pulsating overlay + cosmic shapes) are fully
          hidden behind it — yet they keep compositing every scroll frame, and
          the galaxy's mix-blend-mode canvas in particular causes the page
          content (cards) to tear / vanish on scroll. Hiding them here removes
          that redundant compositing and fixes the scroll breakage. The rule
          only exists while this page is mounted, so other pages keep them. */}
      <style dangerouslySetInnerHTML={{ __html: ".rg-ambient-bg{display:none !important}" }} />
      <ShopLiquidParticles />
      <ShopMethodsHero hero={catalog.hero} />
      <ShopMethodsGrid categories={catalog.categories} />
      <ShopFeatures />
      <ShopFAQ />
      <ShopVouchesModal />
    </main>
  );
}
