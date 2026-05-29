"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import EditableText from "@/components/EditableText";
import { openVouches } from "@/components/shop/ShopVouchesModal";

/**
 * ShopFAQ — accordion FAQ band that sits on the shop landing page before the
 * vouches popup trigger. Every question and answer is admin-editable.
 */
const FAQS = [
  {
    q: "How do I receive my purchase?",
    a: "As soon as your crypto payment confirms on-chain, your product unlocks automatically and a copy is delivered to the email you enter at checkout. Most payments confirm within minutes.",
  },
  {
    q: "Which payment methods do you accept?",
    a: "We accept all major cryptocurrencies — BTC, ETH, LTC, USDT and more — through our automated checkout. No cards, no bank details, no middlemen.",
  },
  {
    q: "Are the methods kept up to date?",
    a: "Yes. When a method changes or gets patched we update the product and you receive the new version free for life. You never pay twice for the same method.",
  },
  {
    q: "Is buying from you anonymous?",
    a: "Completely. We never ask for ID, real names or accounts. The only optional field is an email for your receipt — and even that you can skip.",
  },
  {
    q: "Do you offer refunds?",
    a: "Because every product is digital and delivered instantly, all sales are final. Read the full description and ask us anything before you buy — we're happy to help.",
  },
  {
    q: "How do I get support?",
    a: "Join our Telegram group chat (linked in the top menu). Real operators are on hand 24/7 to walk you through any method, book or mentorship.",
  },
];

export default function ShopFAQ() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative z-10 overflow-x-clip py-16 sm:py-24">
      <div className="container-wide relative">
        <EditableText
          id="shop.faq.eyebrow"
          defaultValue="QUESTIONS"
          as="div"
          className="text-center text-xs font-bold uppercase tracking-[0.32em] text-cyan-300"
        />
        <EditableText
          id="shop.faq.title"
          defaultValue="Frequently asked."
          as="h2"
          className="editorial-display mx-auto mt-4 max-w-3xl text-balance text-center uppercase text-white text-[clamp(1.8rem,4.5vw,3.4rem)]"
          style={{ letterSpacing: "-0.025em", lineHeight: 1.15 }}
        />
        <EditableText
          id="shop.faq.subtitle"
          defaultValue="Everything you need to know before you buy. Still unsure? Our Telegram is one tap away."
          as="p"
          multiline
          className="mx-auto mt-5 max-w-2xl text-center text-base leading-[1.7] text-white/75"
        />

        <div className="mx-auto mt-12 max-w-3xl space-y-3 sm:mt-14">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.04]"
                >
                  <EditableText
                    id={`shop.faq.${i}.q`}
                    defaultValue={item.q}
                    as="span"
                    className="text-sm font-semibold text-white sm:text-base"
                  />
                  <span
                    aria-hidden
                    className={`shrink-0 text-lg text-cyan-300 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
                  >
                    ＋
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="a"
                      initial={reduced ? {} : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduced ? {} : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <EditableText
                        id={`shop.faq.${i}.a`}
                        defaultValue={item.a}
                        as="p"
                        multiline
                        className="border-t border-white/[0.06] px-5 py-4 text-sm leading-[1.7] text-white/70"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => openVouches()}
            className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-violet-100 transition hover:border-violet-300/50 hover:bg-violet-500/20"
          >
            ★ Read community vouches
          </button>
        </div>
      </div>
    </section>
  );
}
