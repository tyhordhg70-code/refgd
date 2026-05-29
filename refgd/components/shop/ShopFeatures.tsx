"use client";

import { motion, useReducedMotion } from "framer-motion";
import EditableText from "@/components/EditableText";

/**
 * ShopFeatures — the "why buy here" value-prop grid that sits on the shop
 * landing page (before the vouches popup trigger). Matches the source store's
 * features band; every string is admin-editable.
 */
const FEATURES = [
  {
    icon: "⚡",
    title: "Instant Access",
    body: "Your method or book unlocks the moment your crypto payment confirms on-chain — no waiting, no manual delivery.",
  },
  {
    icon: "🛡️",
    title: "Fully Anonymous",
    body: "No KYC, no real names, no accounts to dox you. Pay in crypto and stay private end-to-end.",
  },
  {
    icon: "🔄",
    title: "Lifetime Updates",
    body: "When a method gets patched or refreshed you keep every future revision for free — forever.",
  },
  {
    icon: "🔬",
    title: "Battle-Tested",
    body: "Everything listed is run daily by us and the inner circle before it ever reaches the store.",
  },
  {
    icon: "💬",
    title: "24/7 Support",
    body: "Stuck on a step? Our Telegram is open around the clock with real people who run these methods.",
  },
  {
    icon: "🏆",
    title: "Proven Track Record",
    body: "Hundreds of verified vouches from real operators across years of releases — read them yourself.",
  },
];

export default function ShopFeatures() {
  const reduced = useReducedMotion();

  return (
    <section className="relative z-10 overflow-x-clip py-16 sm:py-24">
      <div className="container-wide relative">
        <EditableText
          id="shop.features.eyebrow"
          defaultValue="WHY REFUNDGOD"
          as="div"
          className="text-center text-xs font-bold uppercase tracking-[0.32em] text-violet-300"
        />
        <EditableText
          id="shop.features.title"
          defaultValue="Built for operators."
          as="h2"
          className="editorial-display mx-auto mt-4 max-w-3xl text-balance text-center uppercase text-white text-[clamp(1.8rem,4.5vw,3.4rem)]"
          style={{ letterSpacing: "-0.025em", lineHeight: 1.15 }}
        />
        <EditableText
          id="shop.features.subtitle"
          defaultValue="Every product on this store ships with the same standard — fast, private and backed by a community that actually runs what it sells."
          as="p"
          multiline
          className="mx-auto mt-5 max-w-2xl text-center text-base leading-[1.7] text-white/75"
        />

        <div className="mt-12 grid gap-5 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={reduced ? {} : { opacity: 0, y: 40, scale: 0.96 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.05 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="group relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.03] p-6 transition-colors hover:border-white/25 hover:bg-white/[0.05]"
              style={{ boxShadow: "0 24px 60px -30px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)" }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/12 bg-gradient-to-br from-violet-500/25 to-blue-500/15 text-2xl">
                {f.icon}
              </div>
              <EditableText
                id={`shop.features.${i}.title`}
                defaultValue={f.title}
                as="h3"
                className="editorial-display mt-5 text-lg uppercase text-white"
                style={{ letterSpacing: "-0.01em" }}
              />
              <EditableText
                id={`shop.features.${i}.body`}
                defaultValue={f.body}
                as="p"
                multiline
                className="mt-2.5 text-sm leading-[1.65] text-white/70"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
