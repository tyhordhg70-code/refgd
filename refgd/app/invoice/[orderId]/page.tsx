import { notFound } from "next/navigation";
import InvoiceMonitor from "@/components/shop/InvoiceMonitor";
import { getOrder } from "@/lib/delivery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Complete payment — RefundGod",
  robots: { index: false },
};

/**
 * /invoice/[orderId]
 *
 * Invoice monitoring page for Telegram Stars payments.
 * Reads the invoice URL(s) and payment type from search params
 * (set by ShopProductList when the buyer initiates a Stars checkout),
 * validates the order exists, then renders the client-side InvoiceMonitor
 * component which polls the status API and auto-redirects on completion.
 *
 * Search params:
 *   urls  — comma-separated Telegram invoice URLs, one per payment step
 *           (required). `url` / `url2` are still read for back-compat.
 *   type  — "app" (Apple/Google Pay) | "card" (Telegram Web)
 *   title — product title (display only, falls back to DB value)
 */
export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ urls?: string; url?: string; url2?: string; type?: string; title?: string }>;
}) {
  const { orderId } = await params;
  const { urls, url, url2, type, title } = await searchParams;

  // Prefer the multi-step `urls` list; fall back to legacy url/url2.
  const invoiceUrls = (urls ? urls.split(",") : [url, url2])
    .map((u) => (u ?? "").trim())
    .filter(Boolean);

  if (!orderId || invoiceUrls.length === 0) notFound();

  // Verify the order exists so the page can't be reached with a fake ID.
  const order = await getOrder(orderId);
  if (!order) notFound();

  const paymentType = type === "card" ? "card" : "app";
  const productTitle = title || order.productTitle;

  return (
    <InvoiceMonitor
      orderId={orderId}
      invoiceUrls={invoiceUrls}
      paymentType={paymentType}
      productTitle={productTitle}
    />
  );
}
