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
    q: "I'm not from USA, will the mentorship/bypass methods work for me?",
    a: "Yes. Most of our methods and mentorships are built around the platforms themselves — Amazon, Walmart, Target, Apple and more — so they apply no matter where you're based, and plenty of our members are outside the USA. A few store-specific methods do depend on your region, so message us before you buy and we'll confirm exactly what works for your country.",
  },
  {
    q: "Amazon keeps asking me to verify documents, does the Evasion Book help with this?",
    a: "Yes. The Evasion Book breaks down how each store's anti-fraud system works and how to get around it — including how to handle document and verification requests — so your orders stop getting flagged and canceled.",
  },
  {
    q: "What's the difference between Evasion Book Level 1 and Level 2?",
    a: "Level 1 teaches the fundamentals: how a store's anti-fraud system and fraud score work, and how to place orders that don't get canceled — even if you're not banned. Level 2 is the advanced follow-up for when you've exhausted your stores or one specific store (Walmart, Amazon, Target, Apple…) keeps canceling on you, going deeper into store-specific evasion.",
  },
  {
    q: "What's the difference between Mentorship Level 1 and Level 2?",
    a: "Level 1 is our private mentorship covering all the fundamentals of refunding and social engineering, plus the most up-to-date top-tier methods — no filler like boxing, DNA or FTID. Level 2 builds directly on it (read Level 1 first) with more specific, proven store methods and how to handle advanced scenarios and investigations.",
  },
  {
    q: "How do I get started to use your service?",
    a: "Pick a category, open a product to read the full details, then check out paying with crypto. Delivery is instant — your product unlocks to your email and dashboard the moment payment confirms — and every purchase includes lifetime 24/7 support through our Telegram.",
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
          defaultValue="Frequently asked customer questions we've answered. Still unsure? Our Telegram is one tap away."
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
