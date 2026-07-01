import { Reveal, Orb } from "@/components/Reveal";
import { listVouches } from "@/lib/community";
import CommunityFeed, {
  type FeedSection,
} from "@/components/community/CommunityFeed";

/* DB-backed, never statically cached — the bot ingests posts continuously. */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Community — RefundGod",
  description:
    "Client testimonials, BUY4U vouches and announcements from the RefundGod community.",
};

export default async function CommunityPage() {
  const [testimonials, buy4u, announcements] = await Promise.all([
    listVouches("testimonials"),
    listVouches("buy4u"),
    listVouches("announcements"),
  ]);

  const sections: FeedSection[] = [
    {
      key: "testimonials",
      label: "Client Testimonials",
      blurb: "Real customers, real refunds — straight from the group.",
      vouches: testimonials,
    },
    {
      key: "buy4u",
      label: "BUY4U Vouches",
      blurb: "Proof from our BUY4U concierge orders.",
      vouches: buy4u,
    },
    {
      key: "announcements",
      label: "Announcements",
      blurb: "Official updates from the RefundGod team.",
      vouches: announcements,
    },
  ];

  return (
    <main className="relative isolate min-h-screen">
      <section className="relative overflow-hidden">
        <Orb className="left-10 top-10 h-96 w-96" color="rgba(34,211,238,0.22)" />
        <Orb className="right-10 top-40 h-72 w-72" color="rgba(245,185,69,0.22)" />
        <div className="container-px relative pt-24 pb-8 text-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/85">
              The RefundGod Community
            </p>
            <h1 className="heading-display mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Community
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/65">
              Testimonials, BUY4U vouches and announcements — posted live and
              kept forever. This is the public window into our Telegram group.
            </p>
          </Reveal>
        </div>
      </section>

      <CommunityFeed sections={sections} />
    </main>
  );
}
