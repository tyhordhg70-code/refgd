export const dynamic = "force-dynamic";

  import ShopMethodsHero from "@/components/shop/ShopMethodsHero";
  import ShopMethodsGrid from "@/components/shop/ShopMethodsGrid";
  import ShopReviewsTelegram from "@/components/shop/ShopReviewsTelegram";
  import ShopReviewsFab from "@/components/shop/ShopReviewsFab";
  import EvadeImmersiveBg from "@/components/EvadeImmersiveBg";
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
        <EvadeImmersiveBg />
        <ShopMethodsHero hero={catalog.hero} />
        <ShopMethodsGrid categories={catalog.categories} />
        <ShopReviewsTelegram editIdPrefix="shop.reviews.home" />
        <ShopReviewsFab />
      </main>
    );
  }
  