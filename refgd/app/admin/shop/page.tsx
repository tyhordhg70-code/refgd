import { redirect } from "next/navigation";
  import Link from "next/link";
  import { readSession } from "@/lib/auth";
  import { getShopCatalog } from "@/lib/shop-catalog";
  import ShopAdmin from "./ShopAdmin";

  export const dynamic = "force-dynamic";
  export const metadata = { title: "Shop Admin — RefundGod", robots: { index: false } };

  export default async function ShopAdminPage() {
    const session = await readSession();
    if (!session) redirect("/admin");
    const catalog = await getShopCatalog();

    return (
      <div className="container-px py-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/85">Admin</p>
            <h1 className="heading-display mt-1 text-3xl font-bold text-white">Shop Catalog</h1>
            <p className="mt-1 text-sm text-white/60">
              Manage every product and category in /shop-methods. Edits go live immediately.
            </p>
          </div>
          <Link href="/admin/dashboard" className="text-sm text-white/60 hover:text-white">
            ← Dashboard
          </Link>
        </div>
        <ShopAdmin initialCategories={catalog.categories} />
      </div>
    );
  }
  