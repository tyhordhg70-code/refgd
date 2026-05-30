import { redirect } from "next/navigation";
import Link from "next/link";
import { readSession } from "@/lib/auth";
import { getShopCatalog } from "@/lib/shop-catalog";
import { listProductDeliveries, listOrders } from "@/lib/delivery";
import DeliveriesAdmin from "./DeliveriesAdmin";
import LogoutButton from "../LogoutButton";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "Deliveries — RefundGod", robots: { index: false } };

export default async function DeliveriesPage() {
  const session = await readSession();
  if (!session) redirect("/admin");

  const cat = await getShopCatalog();
  const seen = new Map<string, { id: string; title: string; image: string | null }>();
  for (const c of cat.categories) {
    for (const p of c.products) {
      if (!seen.has(p.id)) seen.set(p.id, { id: p.id, title: p.title, image: p.image });
    }
  }
  const [deliveries, orders] = await Promise.all([
    listProductDeliveries(),
    listOrders(60),
  ]);

  return (
    <div className="container-px py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/dashboard"
            className="text-xs font-semibold uppercase tracking-widest text-white/45 transition hover:text-white/70"
          >
            ← Dashboard
          </Link>
          <h1 className="heading-display mt-1 text-3xl font-bold text-white">
            Auto-delivery
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-white/60">
            Configure what each product delivers after payment. When a NOWPayments
            invoice is paid, the buyer is sent their product automatically by email or
            Telegram — no manual work.
          </p>
        </div>
        <LogoutButton />
      </div>

      <DeliveriesAdmin
        initialProducts={Array.from(seen.values())}
        initialDeliveries={deliveries}
        initialOrders={orders}
      />
    </div>
  );
}
