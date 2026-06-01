"use client";

  import { motion, useReducedMotion } from "framer-motion";
  import Image from "next/image";
  import EditableText from "@/components/EditableText";
  import KineticText from "@/components/KineticText";
  import { openVouches, useVouchesOpen } from "@/components/shop/ShopVouchesModal";

  import type { ShopHero as Hero } from "@/lib/shop-catalog";

  /**
   * ShopMethodsHero — tight hero designed to keep the entire boxcard visible
   * on first page load with no scrolling:
   *
   *   • Banner height shortened (180px mobile / 260px desktop) so it doesn't
   *     push the title block below the fold.
   *   • Title block pulls up hard with negative margin (-mt-32 mobile / -mt-52
   *     desktop) so most of the banner is hidden behind the card.
   *   • Compact title-block padding (p-4 / sm:p-8) and smaller crypto image
   *     (max-w-[160px]) so the whole card + button fits a 667px viewport.
   *   • Glow uses OUTWARD positive box-shadow spread — visible against the
   *     white background. Border also changed to violet so the ring reads.
   */
  export default function ShopMethodsHero({ hero }: { hero: Hero }) {
    const reduced = useReducedMotion();
    const frozen = useVouchesOpen();

    return (
      <section className="relative z-10 pt-0 pb-8 sm:pt-4 sm:pb-12 overflow-x-clip">
        <div className="container-wide relative">
          {/* Title block */}
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 30, scale: 0.97 }}
            animate={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.3 }}
            className="relative z-10 mx-auto max-w-4xl"
          >
            {/* Inner wrapper floats the whole boxcard gently (paused while the
                vouches modal is open so its blur stays cheap). */}
            <motion.div
              animate={reduced || frozen ? { y: 0 } : { y: [0, -8, 0] }}
              transition={
                reduced || frozen
                  ? { duration: 0.4 }
                  : { duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }
              }
              className="rounded-[1.75rem] border border-violet-400/60 bg-[rgba(8,6,20,0.90)] p-4 text-center backdrop-blur-md sm:p-8"
              style={{
                boxShadow:
                  "0 0 0 1px rgba(139,92,246,0.35), 0 0 32px 6px rgba(139,92,246,0.55), 0 0 90px 24px rgba(139,92,246,0.22), 0 30px 80px -20px rgba(0,0,0,0.8)",
              }}
            >
            {/* Crypto illustration — sized to keep the whole card in view on desktop */}
            <motion.div
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mb-4 w-full max-w-[190px] select-none sm:mb-5 sm:max-w-[230px]"
              aria-hidden="true"
            >
              <Image
                src="/shop-images/crypto-academy.png"
                alt=""
                width={740}
                height={493}
                className="w-full"
                style={{ filter: "drop-shadow(0 12px 36px rgba(139,92,246,0.55))" }}
                priority
                unoptimized
              />
            </motion.div>

            <KineticText
              as="h1"
              text={hero.title}
              editId="shop.hero.title"
              className="editorial-display mt-1 text-balance uppercase text-white text-[clamp(1.7rem,4vw,3rem)]"
              style={{
                textShadow: "0 4px 24px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.95)",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            />
            <EditableText
              id="shop.hero.subtitle"
              defaultValue={hero.subtitle}
              as="p"
              multiline
              className="mx-auto mt-4 max-w-2xl text-sm leading-[1.65] text-white/80 sm:mt-5 sm:text-base sm:leading-[1.7]"
              style={{ textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}
            />

            <div className="mt-6 flex justify-center">
              <motion.button
                type="button"
                onClick={() => openVouches()}
                onTap={() => openVouches()}
                initial={false}
                whileHover={reduced ? {} : { scale: 1.03 }}
                whileTap={reduced ? {} : { scale: 0.97 }}
                animate={
                  reduced || frozen
                    ? {}
                    : {
                        boxShadow: [
                          "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(139,92,246,0.45), 0 0 22px -4px rgba(139,92,246,0.55), 0 0 48px -10px rgba(20,170,245,0.40)",
                          "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(139,92,246,0.80), 0 0 40px 2px rgba(139,92,246,0.85), 0 0 80px -4px rgba(20,170,245,0.60)",
                          "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(139,92,246,0.45), 0 0 22px -4px rgba(139,92,246,0.55), 0 0 48px -10px rgba(20,170,245,0.40)",
                        ],
                        transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
                      }
                }
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-violet-300/40 bg-white/[0.07] px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md transition-colors duration-300 hover:border-white/45 hover:bg-white/[0.12]"
                style={{
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/12 to-transparent transition-transform duration-[900ms] group-hover:translate-x-full"
                />
                <span
                  aria-hidden
                  className="relative grid h-6 w-6 place-items-center rounded-full bg-amber-300/15 text-[13px] text-amber-300"
                >
                  ★
                </span>
                <span className="relative">Read community vouches</span>
                <span
                  aria-hidden
                  className="relative text-white/45 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white"
                >
                  →
                </span>
              </motion.button>
            </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    );
  }
