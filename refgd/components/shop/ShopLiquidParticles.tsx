"use client";

/**
 * ShopLiquidParticles — full-page ambient background for every shop page.
 *
 * PERFORMANCE-FIRST rewrite. The previous version animated `borderRadius`
 * and carried large blurred `box-shadow`s, animated by framer-motion on the
 * MAIN THREAD. Both force a full repaint every frame, which made scrolling
 * and the product-modal transition janky on mobile.
 *
 * This version is GPU/compositor-only:
 *   • Each blob is a soft radial-gradient disc with `filter: blur()` for the
 *     glow (no box-shadow, no per-frame repaint).
 *   • Only `transform` (translate3d + rotate + scale) is animated, via pure
 *     CSS @keyframes — these run on the compositor thread and never block
 *     scrolling. Rotating an asymmetric border-radius gives the "liquid"
 *     morph illusion for free.
 *   • A soft tinted gradient base fills the page so it never looks blankly
 *     white, while the blobs add vivid colour.
 *
 * `prefers-reduced-motion` users get the static composition (no animation).
 */

type Blob = {
  size: number;
  left: string;
  top: string;
  rgb: [number, number, number];
  radius: string;
  blur: number;
  /** keyframe transform path */
  kf: string;
  dur: number;
};

const BLOBS: Blob[] = [
  {
    size: 540, left: "-10%", top: "-6%", rgb: [130, 60, 255],
    radius: "62% 38% 56% 44% / 54% 46% 54% 46%", blur: 44, dur: 26,
    kf: `0%,100%{transform:translate3d(0,0,0) rotate(0deg) scale(1)}
         33%{transform:translate3d(40px,30px,0) rotate(120deg) scale(1.08)}
         66%{transform:translate3d(-18px,46px,0) rotate(240deg) scale(0.94)}`,
  },
  {
    size: 500, left: "68%", top: "-8%", rgb: [20, 170, 245],
    radius: "44% 56% 62% 38% / 58% 42% 58% 42%", blur: 46, dur: 30,
    kf: `0%,100%{transform:translate3d(0,0,0) rotate(0deg) scale(1)}
         33%{transform:translate3d(-36px,34px,0) rotate(-130deg) scale(1.06)}
         66%{transform:translate3d(22px,18px,0) rotate(-250deg) scale(0.96)}`,
  },
  {
    size: 480, left: "60%", top: "58%", rgb: [220, 55, 200],
    radius: "54% 46% 48% 52% / 42% 58% 48% 52%", blur: 48, dur: 28,
    kf: `0%,100%{transform:translate3d(0,0,0) rotate(0deg) scale(1)}
         33%{transform:translate3d(30px,-28px,0) rotate(140deg) scale(1.05)}
         66%{transform:translate3d(-26px,16px,0) rotate(250deg) scale(0.93)}`,
  },
  {
    size: 460, left: "-8%", top: "62%", rgb: [10, 195, 135],
    radius: "50% 50% 58% 42% / 60% 40% 50% 50%", blur: 50, dur: 34,
    kf: `0%,100%{transform:translate3d(0,0,0) rotate(0deg) scale(1)}
         33%{transform:translate3d(36px,-24px,0) rotate(-120deg) scale(1.07)}
         66%{transform:translate3d(14px,22px,0) rotate(-240deg) scale(0.95)}`,
  },
  {
    size: 400, left: "32%", top: "36%", rgb: [255, 120, 40],
    radius: "46% 54% 60% 40% / 52% 48% 46% 54%", blur: 52, dur: 32,
    kf: `0%,100%{transform:translate3d(0,0,0) rotate(0deg) scale(1)}
         33%{transform:translate3d(-24px,-30px,0) rotate(130deg) scale(1.06)}
         66%{transform:translate3d(28px,12px,0) rotate(250deg) scale(0.92)}`,
  },
];

function blobCss(i: number, b: Blob): string {
  return `@keyframes shopBlob${i}{${b.kf}}`;
}

export default function ShopLiquidParticles() {
  const css =
    BLOBS.map((b, i) => blobCss(i, b)).join("\n") +
    `\n@media (prefers-reduced-motion: reduce){.shop-blob{animation:none !important}}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{
        zIndex: 0,
        background: "transparent",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {BLOBS.map((b, i) => {
        const [r, g, bl] = b.rgb;
        return (
          <div
            key={i}
            className="shop-blob"
            style={{
              position: "absolute",
              width: b.size,
              height: b.size,
              left: b.left,
              top: b.top,
              borderRadius: b.radius,
              background: `radial-gradient(circle at 32% 30%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.55) 9%, rgba(${r},${g},${bl},0.72) 26%, rgba(${r},${g},${bl},0.5) 52%, rgba(${r},${g},${bl},0.12) 78%, transparent 100%)`,
              filter: `blur(${b.blur}px)`,
              willChange: "transform",
              transform: "translateZ(0)",
              animation: `shopBlob${i} ${b.dur}s ease-in-out infinite`,
            }}
          />
        );
      })}
    </div>
  );
}
