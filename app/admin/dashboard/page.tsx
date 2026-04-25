import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { listStores, regionCounts } from "@/lib/stores";
import { listContentBlocks } from "@/lib/content";
import LogoutButton from "../LogoutButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Dashboard — RefundGod", robots: { index: false } };

export default async function AdminDashboard() {
  const session = await readSession();
  if (!session) redirect("/admin");
  const stores = listStores();
  const counts = regionCounts();
  const content = listContentBlocks();

  return (
    <div className="container-px py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/85">Admin</p>
          <h1 className="heading-display mt-1 text-3xl font-bold text-white">
            Welcome back, {session.username}
          </h1>
        </div>
        <LogoutButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total stores" value={stores.length} />
        <Stat label="USA" value={counts.USA} />
        <Stat label="CAD" value={counts.CAD} />
        <Stat label="EU + UK" value={counts.EU + counts.UK} />
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <Link
          href="/admin/stores"
          className="group rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/15 to-transparent p-6 transition hover:border-amber-300/40"
        >
          <h2 className="heading-display text-xl font-bold text-white">Manage stores →</h2>
          <p className="mt-2 text-sm text-white/65">
            Add, edit, delete stores. Toggle prismatic glow. Auto-fetch logos.
          </p>
        </Link>
        <Link
          href="/admin/content"
          className="group rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/15 to-transparent p-6 transition hover:border-violet-300/40"
        >
          <h2 className="heading-display text-xl font-bold text-white">Edit content →</h2>
          <p className="mt-2 text-sm text-white/65">
            Hero copy, banner text, CTAs, telegram URL. {content.length} blocks
            available.
          </p>
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-white/55">{label}</div>
      <div className="heading-display mt-2 text-3xl font-bold text-white">{value}</div>
    </div>
  );
}
