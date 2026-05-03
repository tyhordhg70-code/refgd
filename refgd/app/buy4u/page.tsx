"use client";

  /**
   * /buy4u — RefundGod's "we shop for you" service page.
   *
   * Top: pinned intro box with the 50% flat-rate offer + scheduling
   * disclaimer. Below: a pill nav bar (mirrors Trip.com style — see
   * attached_assets reference) that scrolls between service sections:
   * Flights, Food, Hotels, Trains, Cars, Attractions/Tours/Events,
   * Furniture, Gift Cards. Each section has BUY4U + REFUND tab modes
   * (sections that the user marked with an X, like Flights and Gift
   * Cards, render only the BUY4U mode). Inside each tab: a description
   * + disclaimer + a card grid of brand logos (auto-fetched via
   * Clearbit) or activity images.
   *
   * EDITABILITY: every visible string is an <EditableText id="buy4u.…">
   * and every per-card brand/title is also editable. Logos auto-derive
   * from the domain field via clearbit; admins can override the domain
   * to swap the logo. Images use <EditableImage id="buy4u.…"> so admins
   * can drop in a different photo.
   */

  import { useMemo, useState } from "react";
  import EditableText from "@/components/EditableText";
  import EditableImage from "@/components/EditableImage";
  import { useEditContext } from "@/lib/edit-context";

  /* ---------- Section configuration ---------- */

  type Card = {
    /** stable per-section item key */
    key: string;
    /** Brand or activity name (default; overridable per-card via EditableText). */
    name: string;
    /** Domain used for clearbit logo. Empty string means use `image`. */
    domain?: string;
    /** Image URL (defaults). Used when card is an activity, not a brand. */
    image?: string;
  };

  type Tab = {
    intro: string;
    disclaimer?: string;
    cards: Card[];
    /** When true, render a search box above the grid. */
    withSearch?: boolean;
  };

  type Section = {
    id: string;
    label: string;
    icon: string;
    /** When true the section has BOTH buy4u + refund tabs. */
    hasRefund: boolean;
    buy4u: Tab;
    refund?: Tab;
  };

  const SECTIONS: Section[] = [
    {
      id: "flights",
      label: "Flights",
      icon: "✈",
      hasRefund: false,
      buy4u: {
        intro:
          "We book your flights at our flat 50% service rate. We must be online and confirmed before any booking is started — message us a few days to a week in advance.",
        disclaimer:
          "If you do not see your desired airline, message us and we can look into it. Emirates Airline is NOT possible.",
        cards: [
          { key: "f01", name: "American Airlines", domain: "aa.com" },
          { key: "f02", name: "Copa Airlines", domain: "copaair.com" },
          { key: "f03", name: "Alaska Airlines", domain: "alaskaair.com" },
          { key: "f04", name: "Allegiant Air", domain: "allegiantair.com" },
          { key: "f05", name: "Frontier Airlines", domain: "flyfrontier.com" },
          { key: "f06", name: "Southwest Airlines", domain: "southwest.com" },
          { key: "f07", name: "Spirit Airlines", domain: "spirit.com" },
          { key: "f08", name: "Qatar Airways", domain: "qatarairways.com" },
          { key: "f09", name: "Breeze Airways", domain: "flybreeze.com" },
          { key: "f10", name: "KLM", domain: "klm.com" },
          { key: "f11", name: "Emirates (limited)", domain: "emirates.com" },
          { key: "f12", name: "Norse Atlantic", domain: "flynorse.com" },
          { key: "f13", name: "WestJet", domain: "westjet.com" },
          { key: "f14", name: "Finnair", domain: "finnair.com" },
          { key: "f15", name: "Porter Airlines", domain: "flyporter.com" },
          { key: "f16", name: "Air India (intl only)", domain: "airindia.com" },
          { key: "f17", name: "Japan Airlines", domain: "jal.co.jp" },
          { key: "f18", name: "Turkish Airlines", domain: "turkishairlines.com" },
          { key: "f19", name: "Korean Air", domain: "koreanair.com" },
          { key: "f20", name: "EVA Air", domain: "evaair.com" },
          { key: "f21", name: "Cathay Pacific", domain: "cathaypacific.com" },
          { key: "f22", name: "Vietnam Airlines", domain: "vietnamairlines.com" },
          { key: "f23", name: "Lufthansa", domain: "lufthansa.com" },
          { key: "f24", name: "Air Canada", domain: "aircanada.com" },
        ],
      },
    },
    {
      id: "food",
      label: "Food",
      icon: "🍔",
      hasRefund: true,
      buy4u: {
        intro:
          "Food pickup orders via DoorDash & Uber Eats. Uber Eats delivery works as well for up to $100. Instacart for groceries below $100.",
        disclaimer: "Make sure we are online before placing your order.",
        withSearch: true,
        cards: [
          { key: "fd01", name: "BJ's Restaurant & Brewhouse", domain: "bjsrestaurants.com" },
          { key: "fd02", name: "Blaze Pizza", domain: "blazepizza.com" },
          { key: "fd03", name: "Bojangles", domain: "bojangles.com" },
          { key: "fd04", name: "Buffalo Wild Wings", domain: "buffalowildwings.com" },
          { key: "fd05", name: "Burger King", domain: "bk.com" },
          { key: "fd06", name: "Carl's Jr.", domain: "carlsjr.com" },
          { key: "fd07", name: "Carrabba's Italian Grill", domain: "carrabbas.com" },
          { key: "fd08", name: "Cava", domain: "cava.com" },
          { key: "fd09", name: "Carvel", domain: "carvel.com" },
          { key: "fd10", name: "Charleys Cheesesteaks", domain: "charleys.com" },
          { key: "fd11", name: "Chicken Express", domain: "chickene.com" },
          { key: "fd12", name: "Chili's Grill & Bar", domain: "chilis.com" },
          { key: "fd13", name: "Chipotle", domain: "chipotle.com" },
          { key: "fd14", name: "Cold Stone Creamery", domain: "coldstonecreamery.com" },
          { key: "fd15", name: "Coney Island", domain: "coneyisland.com" },
          { key: "fd16", name: "Cracker Barrel", domain: "crackerbarrel.com" },
          { key: "fd17", name: "Crumbl Cookies", domain: "crumblcookies.com" },
          { key: "fd18", name: "Culver's", domain: "culvers.com" },
          { key: "fd19", name: "Dairy Queen", domain: "dairyqueen.com" },
          { key: "fd20", name: "Dave & Buster's", domain: "daveandbusters.com" },
          { key: "fd21", name: "Dave's Hot Chicken", domain: "daveshotchicken.com" },
          { key: "fd22", name: "Denny's", domain: "dennys.com" },
          { key: "fd23", name: "El Pollo Loco", domain: "elpolloloco.com" },
          { key: "fd24", name: "First Watch", domain: "firstwatch.com" },
          { key: "fd25", name: "DoorDash", domain: "doordash.com" },
          { key: "fd26", name: "Uber Eats", domain: "ubereats.com" },
          { key: "fd27", name: "Instacart", domain: "instacart.com" },
        ],
      },
    },
    {
      id: "hotels",
      label: "Hotels",
      icon: "🛏",
      hasRefund: true,
      buy4u: {
        intro:
          "We can book hotels for you from Expedia.com or Booking.com.",
        disclaimer:
          "Use this service if your booking does not meet our minimum price for the refund service.",
        cards: [
          { key: "h01", name: "Expedia", domain: "expedia.com" },
          { key: "h02", name: "Booking.com", domain: "booking.com" },
          { key: "h03", name: "Hotels.com", domain: "hotels.com" },
          { key: "h04", name: "Trip.com", domain: "trip.com" },
          { key: "h05", name: "Agoda", domain: "agoda.com" },
        ],
      },
      refund: {
        intro:
          "HOTELS.com / EXPEDIA / AGODA / TRIP.COM — INSIDER INSTANT REFUNDS. Enjoy your vacation at a fraction of the price. Fresh accounts OK. No limits, any property works (Agoda: hotels only, no apartments/houses). Confirm with us prior to booking. MUST be paid in full online — do NOT select pay-later or pay-at-property. ⚠ Refund is processed on first day of check-in OR before checkout for safety. Booking can be as far in advance as you like — handled via our private insider, totally safe.",
        disclaimer:
          "💲1,000 minimum fee · 💲2,000 minimum booking · 50% service fee. For the extra paranoid, refund-after-checkout is possible with an upfront payment.",
        cards: [
          { key: "rh01", name: "Hotels.com", domain: "hotels.com" },
          { key: "rh02", name: "Expedia", domain: "expedia.com" },
          { key: "rh03", name: "Agoda", domain: "agoda.com" },
          { key: "rh04", name: "Trip.com", domain: "trip.com" },
        ],
      },
    },
    {
      id: "trains",
      label: "Trains",
      icon: "🚆",
      hasRefund: false,
      buy4u: {
        intro: "Long-distance bus + train ticket bookings.",
        cards: [
          { key: "t01", name: "Amtrak", domain: "amtrak.com" },
          { key: "t02", name: "Greyhound", domain: "greyhound.com" },
        ],
      },
    },
    {
      id: "cars",
      label: "Cars",
      icon: "🚗",
      hasRefund: false,
      buy4u: {
        intro: "Car rental bookings handled in advance.",
        cards: [
          { key: "c01", name: "Avis", domain: "avis.com" },
          { key: "c02", name: "Budget", domain: "budget.com" },
        ],
      },
    },
    {
      id: "attractions",
      label: "Attractions & Tours",
      icon: "🎡",
      hasRefund: true,
      buy4u: {
        intro:
          "Theme parks, concerts, tours, cruises, sports games, museums, and more — booked through us at the flat 50% service rate.",
        disclaimer:
          "Other recreational activities & many more — open a ticket for custom requests.",
        cards: [
          { key: "a01", name: "Knott's Berry Farm", image: "https://images.unsplash.com/photo-1583416750470-965b2707b355?w=600" },
          { key: "a02", name: "Six Flags", image: "https://images.unsplash.com/photo-1597466765990-64ad1c35dafc?w=600" },
          { key: "a03", name: "SeaWorld", image: "https://images.unsplash.com/photo-1583416750470-965b2707b355?w=600" },
          { key: "a04", name: "LEGOLAND", image: "https://images.unsplash.com/photo-1517242810446-cc8951b2be40?w=600" },
          { key: "a05", name: "Hershey Park", image: "https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=600" },
          { key: "a06", name: "Disney", image: "https://images.unsplash.com/photo-1610465299993-e6675c9f9efa?w=600" },
          { key: "a07", name: "Universal Studios", image: "https://images.unsplash.com/photo-1604542030723-9a85d4bdfb6f?w=600" },
          { key: "a08", name: "Cruises", image: "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=600" },
          { key: "a09", name: "Ski & Winter Sports", image: "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=600" },
          { key: "a10", name: "Jet Skis & Boat Rentals", image: "https://images.unsplash.com/photo-1542657625-46b46c1f8b8a?w=600" },
          { key: "a11", name: "Sports Games", image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600" },
          { key: "a12", name: "Concerts & Festivals", image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600" },
          { key: "a13", name: "Aquariums", image: "https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=600" },
          { key: "a14", name: "Museums", image: "https://images.unsplash.com/photo-1565060169187-8e6e0b4c6c95?w=600" },
          { key: "a15", name: "Edge NYC", image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600" },
          { key: "a16", name: "Empire State Building", image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600" },
          { key: "a17", name: "Helicopter Tours", image: "https://images.unsplash.com/photo-1559113202-c916b8e44373?w=600" },
          { key: "a18", name: "Sky Diving", image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600" },
          { key: "a19", name: "Escape Rooms", image: "https://images.unsplash.com/photo-1574169208507-84376144848b?w=600" },
          { key: "a20", name: "Bowling", image: "https://images.unsplash.com/photo-1538511206890-a8e1b71b46a3?w=600" },
        ],
      },
      refund: {
        intro:
          "Book from Viator.com, Agoda.com or Trip.com. 🎟 No ticket limit (must be same event). 💸 Price limit $7,000. ⏳ Time frame: INSTANT. Fee 35%. Minimum order $500. Minimum fee $250. 💬 Message at least a day or 1–2 hours before the event and make sure we are ONLINE.",
        cards: [
          { key: "ra01", name: "Viator", domain: "viator.com" },
          { key: "ra02", name: "Agoda", domain: "agoda.com" },
          { key: "ra03", name: "Trip.com", domain: "trip.com" },
        ],
      },
    },
    {
      id: "furniture",
      label: "Furniture",
      icon: "🛋",
      hasRefund: true,
      buy4u: {
        intro: "Furniture orders booked through us — IKEA only.",
        cards: [{ key: "fu01", name: "IKEA", domain: "ikea.com" }],
      },
      refund: {
        intro:
          "For furniture refunds, head to our full Store List for the supported retailers.",
        cards: [],
      },
    },
    {
      id: "giftcards",
      label: "Gift Cards",
      icon: "🎁",
      hasRefund: false,
      buy4u: {
        intro:
          "Gift card catalog (sourced from spawngc.gg) is being indexed — full filterable list with category + state filters is in progress and will appear here.",
        cards: [],
      },
    },
  ];

  /* ---------- UI ---------- */

  function logoFor(domain?: string): string | null {
    if (!domain) return null;
    return `https://logo.clearbit.com/${domain}`;
  }

  function BrandCard({ secId, mode, card }: { secId: string; mode: "buy4u" | "refund"; card: Card }) {
    const id = `buy4u.${secId}.${mode}.${card.key}`;
    const logo = logoFor(card.domain);
    return (
      <div className="group flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:-translate-y-0.5 hover:border-amber-300/40 hover:bg-white/[0.07]">
        {card.image ? (
          <EditableImage
            id={`${id}.image`}
            defaultSrc={card.image}
            alt={card.name}
            wrapperClassName="block w-full"
            className="aspect-[4/3] w-full rounded-xl object-cover"
          />
        ) : logo ? (
          <div className="grid aspect-square w-16 place-items-center overflow-hidden rounded-xl bg-white p-1.5">
            {/* Logos are auto-fetched via clearbit; admin can override the
                domain via the .domain editable below to swap the logo. */}
            <img
              src={logo}
              alt={card.name}
              className="h-full w-full object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        ) : (
          <div className="grid aspect-square w-16 place-items-center rounded-xl bg-white/10 text-2xl">📦</div>
        )}
        <EditableText
          id={`${id}.name`}
          defaultValue={card.name}
          as="p"
          className="mt-2 text-center text-xs font-semibold leading-tight text-white"
        />
        {card.domain !== undefined && (
          <EditableText
            id={`${id}.domain`}
            defaultValue={card.domain || ""}
            as="p"
            className="mt-0.5 text-center font-mono text-[10px] text-white/45"
            placeholder="domain.com"
          />
        )}
      </div>
    );
  }

  function CardGrid({ secId, mode, cards }: { secId: string; mode: "buy4u" | "refund"; cards: Card[] }) {
    if (cards.length === 0) return null;
    return (
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {cards.map((c) => <BrandCard key={c.key} secId={secId} mode={mode} card={c} />)}
      </div>
    );
  }

  function SearchableGrid({ secId, mode, cards }: { secId: string; mode: "buy4u" | "refund"; cards: Card[] }) {
    const [q, setQ] = useState("");
    const filtered = useMemo(() => {
      const needle = q.trim().toLowerCase();
      if (!needle) return cards;
      return cards.filter((c) => c.name.toLowerCase().includes(needle) || (c.domain ?? "").toLowerCase().includes(needle));
    }, [q, cards]);
    return (
      <>
        <div className="mt-4">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search restaurants & brands…"
            className="w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-amber-300/60"
          />
          <p className="mt-1 text-xs text-white/45">{filtered.length} of {cards.length} brands</p>
        </div>
        <CardGrid secId={secId} mode={mode} cards={filtered} />
      </>
    );
  }

  function TabBody({ section, mode }: { section: Section; mode: "buy4u" | "refund" }) {
    const tab = mode === "buy4u" ? section.buy4u : (section.refund ?? section.buy4u);
    return (
      <div>
        <EditableText
          id={`buy4u.${section.id}.${mode}.intro`}
          defaultValue={tab.intro}
          as="p"
          multiline
          className="text-base leading-relaxed text-white/85"
        />
        {tab.disclaimer && (
          <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-400/[0.06] px-4 py-3">
            <EditableText
              id={`buy4u.${section.id}.${mode}.disclaimer`}
              defaultValue={tab.disclaimer}
              as="p"
              multiline
              className="text-sm text-amber-100"
            />
          </div>
        )}
        {tab.withSearch
          ? <SearchableGrid secId={section.id} mode={mode} cards={tab.cards} />
          : <CardGrid secId={section.id} mode={mode} cards={tab.cards} />}
      </div>
    );
  }

  function SectionBlock({ section }: { section: Section }) {
    const [mode, setMode] = useState<"buy4u" | "refund">("buy4u");
    return (
      <section
        id={`buy4u-${section.id}`}
        className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">{section.icon}</span>
            <h2 className="heading-display text-2xl font-bold uppercase tracking-tight text-white">
              <EditableText id={`buy4u.${section.id}.label`} defaultValue={section.label} />
            </h2>
          </div>
          {section.hasRefund && section.refund && (
            <div className="inline-flex rounded-full border border-white/10 bg-ink-900 p-1">
              {(["buy4u", "refund"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                    mode === m
                      ? "bg-amber-400 text-ink-950 shadow-[0_0_18px_-4px_rgba(245,185,69,0.6)]"
                      : "text-white/65 hover:text-white"
                  }`}
                >
                  {m === "buy4u" ? "BUY4U" : "REFUND"}
                </button>
              ))}
            </div>
          )}
        </div>
        <TabBody section={section} mode={section.hasRefund ? mode : "buy4u"} />
      </section>
    );
  }

  function SectionPillNav() {
    return (
      <nav aria-label="Buy4U sections" className="sticky top-16 z-20 -mx-4 mb-8 overflow-x-auto border-y border-white/10 bg-ink-950/85 px-4 py-3 backdrop-blur-xl">
        <ul className="flex min-w-max items-center gap-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#buy4u-${s.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/85 transition hover:border-amber-300/60 hover:bg-amber-400/10 hover:text-white"
              >
                <span aria-hidden="true">{s.icon}</span>
                <span>{s.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  export default function Buy4uPage() {
    const { isAdmin } = useEditContext();
    return (
      <main className="container-px py-12">
        <header className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/85">
            <EditableText id="buy4u.kicker" defaultValue="we shop for you" />
          </p>
          <h1 className="heading-display mt-2 text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl">
            <EditableText id="buy4u.title" defaultValue="Buy 4 U" />
          </h1>
        </header>

        {/* Intro box (matches the spec verbatim — admin-editable) */}
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-300/35 bg-gradient-to-br from-amber-400/[0.10] to-transparent p-6 sm:p-8 shadow-[0_0_60px_-20px_rgba(245,185,69,0.45)]">
          <EditableText
            id="buy4u.intro.headline"
            defaultValue="⭐️ Introducing our service where we shop for you at a flat 50% discount rate ⭐️"
            as="p"
            multiline
            className="text-center text-xl font-bold text-amber-100"
          />
          <EditableText
            id="buy4u.intro.body"
            defaultValue="We place the order/booking for you and upon confirmation you simply pay us our fee."
            as="p"
            multiline
            className="mt-4 text-center text-base text-white/85"
          />
          <div className="mt-5 rounded-2xl border border-white/10 bg-ink-900/60 p-4">
            <EditableText
              id="buy4u.intro.notice"
              defaultValue="Note: We require at least 24 hours prior notice to be able to attend to your booking in a timely manner, so please schedule in advance accordingly. Thank you!"
              as="p"
              multiline
              className="text-sm leading-relaxed text-white/75"
            />
          </div>
          <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/[0.06] p-4">
            <EditableText
              id="buy4u.intro.warning"
              defaultValue="FOR ANY OF YOUR BOOKING NEEDS KINDLY MESSAGE US A FEW DAYS OR A WEEK PRIOR! IF YOUR BOOKING IS MONTHS UP AHEAD, PLEASE DON'T SHARE DETAILS SO FAR IN ADVANCE! WE DO NOT OFFER THIS FOR STANDARD RETAIL STORES LIKE APPLE, AMAZON — DO NOT ASK!"
              as="p"
              multiline
              className="text-sm font-semibold uppercase leading-relaxed tracking-wide text-rose-200"
            />
          </div>
        </div>

        <SectionPillNav />

        <div className="space-y-8">
          {SECTIONS.map((s) => <SectionBlock key={s.id} section={s} />)}
        </div>

        {isAdmin && (
          <p className="mt-10 text-center text-xs text-white/35">
            Admin: every label, intro, disclaimer, brand name, brand domain, and
            activity image on this page is editable. Click any text or image
            while in edit mode to modify it.
          </p>
        )}
      </main>
    );
  }
  