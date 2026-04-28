import { redirect } from "next/navigation";

/**
 * Our Service has been merged into the Store List page so visitors can scroll
 * straight from the service explanation into the regional store grid.
 */
export const dynamic = "force-static";

export default function OurServicePage() {
  redirect("/store-list#service");
}
