export const dynamic = "force-dynamic";

  import { notFound } from "next/navigation";
  import Link from "next/link";
  import ShopCategoryHeader from "@/components/shop/ShopCategoryHeader";
  import ShopProductList from "@/components/shop/ShopProductList";
  import EvadeImmersiveBg from "@/components/EvadeImmersiveBg";
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
        <EvadeImmersiveBg />
        <ShopCategoryHeader category={category} />
        <ShopProductList category={category} />
        <div className="container-wide relative z-10 pb-20">
          <Link
            href="/shop-methods"
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
          >
            ← Back to all categories
          </Link>
        </div>
      </main>
    );
  }
  