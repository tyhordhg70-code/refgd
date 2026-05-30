import ShopLiquidParticles from "@/components/shop/ShopLiquidParticles";

/**
 * Shared layout for the whole /shop-methods segment (the category landing page
 * AND every /shop-methods/[slug] product page).
 *
 * Why this exists: in the App Router a layout instance is PRESERVED across
 * navigations between its child routes — it does not unmount/remount. Putting
 * the persistent chrome here (the animated liquid-particles background + the
 * global ambient-bg suppression) means that clicking into a category and back
 * keeps the exact same background mounted. Previously each page rendered its
 * own <ShopLiquidParticles />, so every navigation tore the background down and
 * rebuilt it — restarting its animation from frame 0 and forcing the page to
 * re-mount and re-paint (the "images reload on back" flash the user reported).
 *
 * The `.rg-ambient-bg` suppression lives here too so it applies to the entire
 * segment and is cleanly removed the moment the user navigates away from
 * /shop-methods (the layout unmounts), restoring the global galaxy elsewhere.
 */
export default function ShopMethodsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ".rg-ambient-bg{display:none !important}" }} />
      <ShopLiquidParticles />
      {children}
    </>
  );
}
