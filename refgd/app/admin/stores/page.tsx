import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { listStores } from "@/lib/stores";
import StoresAdmin from "./StoresAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage Stores — Admin", robots: { index: false } };

export default async function AdminStoresPage() {
  const s = await readSession();
  if (!s) redirect("/admin");
  const stores = await listStores();
  return (
    <div className="container-px py-10">
      <StoresAdmin initialStores={stores} />
    </div>
  );
}
