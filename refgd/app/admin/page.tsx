import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import AdminLogin from "./AdminLogin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — RefundGod", robots: { index: false } };

export default async function AdminIndexPage() {
  const session = await readSession();
  if (session) redirect("/admin/dashboard");
  return (
    <div className="container-px grid min-h-[70vh] place-items-center py-12">
      <AdminLogin />
    </div>
  );
}
