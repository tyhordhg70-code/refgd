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
 *   url   — Telegram invoice URL for Part 1 (required)
 *   url2  — Telegram invoice URL for Part 2 (split payments only)
 *   type  — "app" (Apple/Google Pay) | "card" (Telegram Web)
 *   title — product title (display only, falls back to DB value)
 */
export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ url?: string; url2?: string; type?: string; title?: string }>;
}) {
  const { orderId } = await params;
  const { url, url2, type, title } = await searchParams;

  if (!orderId || !url) notFound();

  // Verify the order exists so the page can't be reached with a fake ID.
  const order = await getOrder(orderId);
  if (!order) notFound();

  const paymentType = type === "card" ? "card" : "app";
  const productTitle = title || order.productTitle;

  return (
    <InvoiceMonitor
      orderId={orderId}
      invoiceUrl={url}
      invoiceUrl2={url2}
      paymentType={paymentType}
      productTitle={productTitle}
    />
  );
}
