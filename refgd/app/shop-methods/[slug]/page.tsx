export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import ShopCategoryHeader from "@/components/shop/ShopCategoryHeader";
import ShopProductList from "@/components/shop/ShopProductList";
import ShopLiquidParticles from "@/components/shop/ShopLiquidParticles";
import { getShopCatalog } from "@/lib/shop-catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const catalog = await getShopCatalog();
  const cat = catalog.categories.find((c) => c.slug === slug);
  if (!cat) return { title: "Not found" };
  return { title: `${cat.title} — RefundGod`, description: cat.tagline };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const catalog = await getShopCatalog();
  const category = catalog.categories.find((c) => c.slug === slug);
  if (!category) notFound();

  return (
    <main className="relative">
      {/* Same ambient-bg suppression as the main shop page — the liquid blobs
          provide the full background so the dark global galaxy beneath must be
          hidden to stop scroll-tear and colour clash. */}
      <style dangerouslySetInnerHTML={{ __html: ".rg-ambient-bg{display:none !important}" }} />
      <ShopLiquidParticles />
      <ShopCategoryHeader category={category} />
      <ShopProductList category={category} />
      <div className="container-wide relative z-10 pb-20 pt-2">
        <Link
          href="/shop-methods#categories"
          className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white/80 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-700 shadow-sm transition hover:border-violet-300 hover:bg-white hover:text-violet-700"
        >
          <span aria-hidden>←</span> Back to all categories
        </Link>
      </div>
    </main>
  );
}
