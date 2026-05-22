export const dynamic = "force-dynamic";

  import { notFound } from "next/navigation";
  import Link from "next/link";
  import ShopCategoryHeader from "@/components/shop/ShopCategoryHeader";
  import ShopProductList from "@/components/shop/ShopProductList";
  import EvadeImmersiveBg from "@/components/EvadeImmersiveBg";
  import catalog from "@/data/shop-methods.json";

  type Props = { params: Promise<{ slug: string }> };

  export async function generateMetadata({ params }: Props) {
    const { slug } = await params;
    const cat = catalog.categories.find((c) => c.slug === slug);
    if (!cat) return { title: "Not found" };
    return {
      title: `${cat.title} — RefundGod`,
      description: cat.tagline,
    };
  }

  export function generateStaticParams() {
    return catalog.categories.map((c) => ({ slug: c.slug }));
  }

  /**
   * /shop-methods/[slug] — category detail (Phase 1A).
   *
   * Each category from refundgod.bgng.io gets its own deep-linkable URL:
   *   /shop-methods/evasion-books
   *   /shop-methods/exclusive-mentorships
   *   /shop-methods/insert-aged-orders
   *   /shop-methods/refund-se-methods
   *   /shop-methods/stealth-opsec
   *
   * Products inside each category are placeholders that the user fills in
   * via the admin editor or by replacing the `products` array in
   * /refgd/data/shop-methods.json.
   *
   * Phase 2 will replace the simple product card with an expandable Buy Now
   * panel (full description + NowPayments widget inline).
   */
  export default async function CategoryPage({ params }: Props) {
    const { slug } = await params;
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
  