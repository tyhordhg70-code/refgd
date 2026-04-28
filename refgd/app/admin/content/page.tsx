import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { listContentBlocks } from "@/lib/content";
import ContentAdmin from "./ContentAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit content — Admin", robots: { index: false } };

export default async function AdminContentPage() {
  const s = await readSession();
  if (!s) redirect("/admin");
  const blocks = await listContentBlocks();
  return (
    <div className="container-px py-10">
      <ContentAdmin initial={blocks} />
    </div>
  );
}
