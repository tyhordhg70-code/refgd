import Link from "next/link";
import { Reveal, Orb } from "@/components/Reveal";
import { ReorderableContainer, ReorderableSection } from "@/components/ReorderableSection";

export const metadata = {
  title: "Top-tier Methods — RefundGod",
  description: "Top-tier refunding & SE methods. Talk to us on Telegram for the latest list.",
};

export default function TopTierMethodsPage() {
  return (
    <ReorderableContainer pageId="top-tier-methods">
      <ReorderableSection sectionId="hero">
      <section className="relative isolate overflow-hidden">
        <Orb className="left-1/2 top-20 h-96 w-96 -translate-x-1/2" color="rgba(245,185,69,0.3)" />
        <div className="container-px relative grid min-h-[60vh] place-items-center py-24 text-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/85">
              Methods Vault
            </p>
            <h1 className="heading-display mt-3 text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Top-tier Methods
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/65">
              The latest top-tier methods are kept off the public site for safety.
              Hop in our Telegram group to access the live methods vault, ask
              questions and stay current.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <a href="https://t.me/+nwkW2Mw3959mZDc0" target="_blank" rel="noopener noreferrer" className="btn-primary">
                Join Group Chat
              </a>
              <Link href="/store-list" className="btn-ghost">
                Browse Store List →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
      </ReorderableSection>
    </ReorderableContainer>
  );
}
