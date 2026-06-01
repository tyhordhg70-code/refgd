import Link from "next/link";
import EditableText from "@/components/EditableText";
import EditableImage from "@/components/EditableImage";
import CustomOrderForm from "@/components/shop/CustomOrderForm";

/**
 * /shop-methods/custom-order
 *
 * Unlisted product page — hidden from all category grids, accessible
 * only via direct link. The customer enters any price ≥ $1 and pays via
 * the same Telegram Stars pipeline as every other product.
 *
 * Inherits ShopLiquidParticles background from app/shop-methods/layout.tsx.
 * All copy and the product image are editable by admins via EditableText /
 * EditableImage — same as all other shop pages.
 *
 * robots: noindex keeps search engines from indexing this page.
 */
export const metadata = {
  title: "Custom Order — RefundGod",
  robots: { index: false, follow: false },
};

export default function CustomOrderPage() {
  return (
    <main className="relative z-10 pb-24 pt-8 sm:pt-14">
      <div className="container-wide relative max-w-2xl">

        {/* Back link */}
        <Link
          href="/shop-methods#categories"
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
        >
          <span aria-hidden>←</span> All Categories
        </Link>

        {/* Eyebrow badge */}
        <div className="mt-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/70 bg-violet-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-violet-700 sm:text-xs">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500"
            />
            <EditableText
              id="custom-order.eyebrow"
              defaultValue="custom order"
              as="span"
            />
          </span>
        </div>

        {/* Headline */}
        <EditableText
          id="custom-order.title"
          defaultValue="Name Your Price"
          as="h1"
          className="editorial-display mt-5 text-balance uppercase text-gray-900 txt-on-light text-[clamp(2rem,6vw,3.6rem)]"
          style={{ letterSpacing: "-0.025em", lineHeight: 1.12 }}
        />

        {/* Tagline */}
        <EditableText
          id="custom-order.tagline"
          defaultValue="Enter the amount you'd like to pay and checkout instantly via Telegram Stars."
          as="p"
          multiline
          className="mt-4 text-lg leading-[1.7] text-gray-700 txt-on-light"
        />

        {/* Product image */}
        <div className="my-8 overflow-hidden rounded-2xl border border-gray-100 bg-white p-6">
          <EditableImage
            id="custom-order.image"
            defaultSrc="/uploads/payment-pay.png"
            alt="Custom order"
            eager
            wrapperClassName="block w-full"
            className="mx-auto block h-auto max-h-[260px] w-auto max-w-full object-contain"
          />
        </div>

        {/* Description */}
        <div
          className="border-l-2 pl-5"
          style={{ borderColor: "rgba(109,40,217,0.5)" }}
        >
          <EditableText
            id="custom-order.description"
            defaultValue="Use this page to pay for any custom amount agreed with us directly — whether that's a bespoke mentorship, a bulk insert order, or anything else we've discussed. Simply enter the agreed price, pick your payment method, and complete checkout in seconds."
            as="p"
            multiline
            className="text-base leading-[1.8] text-gray-700 txt-on-light"
          />
        </div>

        {/* What's included block */}
        <div className="mt-6">
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.32em] text-gray-500">
            What&apos;s included
          </div>
          <EditableText
            id="custom-order.included"
            defaultValue="Whatever was agreed between us. This page is for direct custom payments only — reach out on Telegram before using it."
            as="p"
            multiline
            className="text-sm leading-[1.7] text-gray-600 txt-on-light"
          />
        </div>

        {/* Checkout form */}
        <CustomOrderForm />

      </div>
    </main>
  );
}
