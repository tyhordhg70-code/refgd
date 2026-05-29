"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import EditableText from "@/components/EditableText";
import { useEditContext } from "@/lib/edit-context";
import { openVouches } from "@/components/shop/ShopVouchesModal";

/**
 * ShopFAQ — accordion FAQ band that sits on the shop landing page before the
 * vouches popup trigger.
 *
 * Admin editing model
 * ───────────────────
 * Every question and answer is admin-editable inline via <EditableText>.
 * The LIST of FAQ items (not just their text) is also admin-editable: the
 * ordered list of item ids is persisted as a JSON content block under
 * `shop.faq.items`, and each item stores its question/answer under
 * `shop.faq.<itemId>.q` / `shop.faq.<itemId>.a`.
 *
 * Adding a question appends a new unique id to the list AND seeds its q/a
 * content blocks, so all three values enter the pending edit queue and are
 * persisted together on the global Save (flush → PUT /api/admin/content).
 * That guarantees newly-added FAQs survive a reload instead of vanishing.
 * Removing a question drops its id from the list (its orphaned q/a blocks
 * are simply no longer rendered).
 */

const ITEMS_ID = "shop.faq.items";

// Seed FAQ items. Their ids ("0".."4") match the historical content-block
// keys so any previously-saved edits keep resolving.
const SEED: { id: string; q: string; a: string }[] = [
  {
    id: "0",
    q: "I'm not from USA, will the mentorship/bypass methods work for me?",
    a: "Yes! Both the Evasion Books and Refund/SE mentorship works WORLDWIDE",
  },
  {
    id: "1",
    q: "Amazon keeps asking me to verify documents, does the Evasion Book help with this?",
    a: "Yes, it does.",
  },
  {
    id: "2",
    q: "What's the difference between Evasion Book Level 1 and Level 2",
    a: "Evasion Book - Level 2 is the latest and most refined version of our comprehensive guide to store tracing techniques. With over 48 pages of meticulously curated content, our Evasion Book level 2 offers a wealth of in-depth detail without any filler content, ensuring that every aspect of the subject is covered thoroughly. Unlike its predecessor, Evasion Book Level 1, which focuses on a single solution across approximately 10 pages, Bypass V2 provides a more expansive approach, catering to both short-term and long-term needs, revolving around multiple solutions. For those seeking a quick and effective solution, Evasion Book Level 1 is ideal, offering concise yet effective guidance for creating an account to place legitimate orders for everyday purposes. On the other hand, Evasion Book Level 2 is designed for individuals looking for a more comprehensive and long-term solution. It encompasses multiple strategies, including free alternatives and paid shortcuts, making it perfect for those aiming to elevate their order placement to the next level and engage in multi-accounting while skillfully evading suspension. Whether you're a casual user or a seasoned professional, Evasion Book Level 2 equips you with the knowledge and strategies needed to navigate store tracing techniques with confidence and precision.",
  },
  {
    id: "3",
    q: "What's the difference between Mentorship Level 1 and Level 2",
    a: "The mentorship is divided into two levels, with the first level concluding and providing the necessary fundamentals for specific stores and methods. It aims to prepare individuals to handle specific scenarios and deal with situations where methods may go wrong or cause trouble. On the other hand, the Level 2 mentorship focuses on specific stores and covers how to approach each order correctly with more advanced approaches, handle specific situations, deal with investigations, fix failed orders, find private stores, how to scale, scripts to automate the process, and much more! The Level 2 mentorship is a follow-up and conclusion to the first part, and it is highly recommended to look into it as such. The mentorship level 2 is designed to provide knowledge and fundamentals so that individuals can navigate their own stores and even find private stores to engage with. It includes a list of methods for the top stores as well as rather a general mentorship to enable success across a wide range of other unlisted/new stores. The mentorship level 2 includes guidance on investigations, reports, claims, handling cases, advance replacement, and agent manipulation, among other crucially important traits for successfully completing orders. Lifetime 1:1 support included!",
  },
  {
    id: "4",
    q: "How do i get started to use your service?",
    a: "Simply purchase the product you deem most beneficial for your use case.",
  },
];

const DEFAULT_IDS = SEED.map((s) => s.id);
const SEED_BY_ID: Record<string, { q: string; a: string }> = Object.fromEntries(
  SEED.map((s) => [s.id, { q: s.q, a: s.a }]),
);

export default function ShopFAQ() {
  const reduced = useReducedMotion();
  const { isAdmin, editMode, getValue, setValue } = useEditContext();
  const [open, setOpen] = useState<string | null>(DEFAULT_IDS[0] ?? null);

  const canEdit = isAdmin && editMode;

  const stored = getValue(ITEMS_ID, "");
  const items = useMemo<string[]>(() => {
    if (!stored) return DEFAULT_IDS;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const seen = new Set<string>();
        const clean: string[] = [];
        for (const x of parsed) {
          if (typeof x !== "string") continue;
          const t = x.trim();
          if (!t || !/^[A-Za-z0-9_-]+$/.test(t) || seen.has(t)) continue;
          seen.add(t);
          clean.push(t);
        }
        return clean.length ? clean : DEFAULT_IDS;
      }
    } catch {
      /* fall through to defaults */
    }
    return DEFAULT_IDS;
  }, [stored]);

  const addItem = () => {
    const newId = `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    setValue(ITEMS_ID, JSON.stringify([...items, newId]));
    // Seed the q/a so they enter the pending queue and persist on Save.
    setValue(`shop.faq.${newId}.q`, "New question?");
    setValue(`shop.faq.${newId}.a`, "Answer goes here.");
    setOpen(newId);
  };

  const removeItem = (id: string) => {
    setValue(ITEMS_ID, JSON.stringify(items.filter((x) => x !== id)));
    if (open === id) setOpen(null);
  };

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
          {items.map((id) => {
            const isOpen = open === id;
            const seed = SEED_BY_ID[id] ?? {
              q: "New question?",
              a: "Answer goes here.",
            };
            return (
              <div
                key={id}
                className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.03]"
              >
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => removeItem(id)}
                    aria-label="Remove this question"
                    title="Remove this question"
                    className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-red-400/40 bg-red-500/15 text-sm text-red-200 transition hover:border-red-300/70 hover:bg-red-500/30"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : id)}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.04] ${canEdit ? "pr-14" : ""}`}
                >
                  <EditableText
                    id={`shop.faq.${id}.q`}
                    defaultValue={seed.q}
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
                        id={`shop.faq.${id}.a`}
                        defaultValue={seed.a}
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

        {canEdit && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/70 hover:bg-cyan-500/20"
            >
              ＋ Add question
            </button>
            <p className="mt-2 text-xs text-white/40">
              New questions save with the rest of your edits when you press Save.
            </p>
          </div>
        )}

        <div className="mt-12 flex justify-center">
          <motion.button
            type="button"
            onClick={() => openVouches()}
            initial={false}
            whileHover={reduced ? {} : { scale: 1.04 }}
            whileTap={reduced ? {} : { scale: 0.97 }}
            animate={
              reduced
                ? {}
                : {
                    boxShadow: [
                      "0 0 22px -4px rgba(167,139,250,0.55), 0 0 50px -10px rgba(34,211,238,0.45)",
                      "0 0 40px 2px rgba(167,139,250,0.85), 0 0 80px -4px rgba(34,211,238,0.7)",
                      "0 0 22px -4px rgba(167,139,250,0.55), 0 0 50px -10px rgba(34,211,238,0.45)",
                    ],
                  }
            }
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full border border-violet-300/50 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-8 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white"
          >
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
            <span aria-hidden className="relative text-amber-200 drop-shadow-[0_0_6px_rgba(252,211,77,0.9)]">★</span>
            <span className="relative">Read community vouches</span>
            <span aria-hidden className="relative transition-transform duration-300 group-hover:translate-x-1">→</span>
          </motion.button>
        </div>
      </div>
    </section>
  );
}
