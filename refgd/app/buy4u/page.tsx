"use client";

import { useMemo, useState, useCallback } from "react";
import EditableText from "@/components/EditableText";
import EditableImage from "@/components/EditableImage";
import { useEditContext } from "@/lib/edit-context";

type CardKind = "brand" | "category" | "image";
type Card = {
  key: string; name: string; kind: CardKind; value: string; gradient?: string;
};
type Tab = { intro: string; disclaimer?: string; cards: Card[]; withSearch?: boolean; };
type Section = { id: string; label: string; icon: string; hasRefund: boolean; buy4u: Tab; refund?: Tab; };

const B = (key: string, name: string, domain: string): Card => ({ key, name, kind: "brand", value: domain });
const C = (key: string, name: string, emoji: string, gradient = "from-violet-600/40 to-fuchsia-600/40"): Card => ({ key, name, kind: "category", value: emoji, gradient });

const SECTIONS: Section[] = [
  { id:"flights",label:"Flights",icon:"✈",hasRefund:false,buy4u:{
    intro:"We book your flights at a flat 50% service rate. Message us a few days to a week in advance — confirm we are online before any booking starts.",
    disclaimer:"If you do not see your desired airline, message us and we can look into it. Note: Emirates Airline is NOT possible.",
    cards:[
      B("f01","American Airlines","aa.com"),
      B("f02","Copa Airlines","copaair.com"),
      B("f03","Alaska Airlines","alaskaair.com"),
      B("f04","Allegiant Air","allegiantair.com"),
      B("f05","Frontier Airlines","flyfrontier.com"),
      B("f06","Southwest Airlines","southwest.com"),
      B("f07","Spirit Airlines","spirit.com"),
      B("f08","Qatar Airways","qatarairways.com"),
      B("f09","Breeze Airways","flybreeze.com"),
      B("f10","KLM","klm.com"),
      B("f11","Norse Atlantic","flynorse.com"),
      B("f12","WestJet","westjet.com"),
      B("f13","Finnair","finnair.com"),
      B("f14","Porter Airlines","flyporter.com"),
      B("f15","Air India (Intl Only)","airindia.com"),
      B("f16","Japan Airlines","jal.co.jp"),
      B("f17","Turkish Airlines","turkishairlines.com"),
      B("f18","Korean Air","koreanair.com"),
      B("f19","EVA Air","evaair.com"),
      B("f20","Cathay Pacific","cathaypacific.com"),
      B("f21","Vietnam Airlines","vietnamairlines.com"),
      B("f22","Lufthansa","lufthansa.com"),
      B("f23","Air Canada","aircanada.com"),
    ],
  }},
  { id:"food",label:"Food",icon:"🍔",hasRefund:true,buy4u:{
    intro:"Food pickup via DoorDash & Uber Eats. Uber Eats delivery up to $100. Instacart for groceries below $100.",
    disclaimer:"Make sure we are ONLINE before placing your order.",
    withSearch:true,
    cards:[
      B("fd01","Applebee's","applebees.com"),
      B("fd02","Arby's","arbys.com"),
      B("fd03","BJ's Restaurant & Brewhouse","bjsrestaurants.com"),
      B("fd04","Blaze Pizza","blazepizza.com"),
      B("fd05","Bojangles","bojangles.com"),
      B("fd06","Buffalo Wild Wings","buffalowildwings.com"),
      B("fd07","Burger King","bk.com"),
      B("fd08","Carl's Jr.","carlsjr.com"),
      B("fd09","Carrabba's Italian Grill","carrabbas.com"),
      B("fd10","Carvel","carvel.com"),
      B("fd11","Cava","cava.com"),
      B("fd12","Charleys Cheesesteaks","charleys.com"),
      B("fd13","Cheesecake Factory","thecheesecakefactory.com"),
      B("fd14","Chicken Express","chickene.com"),
      B("fd15","Chili's Grill & Bar","chilis.com"),
      B("fd16","Chipotle","chipotle.com"),
      B("fd17","Cold Stone Creamery","coldstonecreamery.com"),
      B("fd18","Cracker Barrel","crackerbarrel.com"),
      B("fd19","Crumbl Cookies","crumblcookies.com"),
      B("fd20","Culver's","culvers.com"),
      B("fd21","Dairy Queen","dairyqueen.com"),
      B("fd22","Dave & Buster's","daveandbusters.com"),
      B("fd23","Dave's Hot Chicken","daveshotchicken.com"),
      B("fd24","Denny's","dennys.com"),
      B("fd25","Domino's","dominos.com"),
      B("fd26","Dunkin' Donuts","dunkindonuts.com"),
      B("fd27","El Pollo Loco","elpolloloco.com"),
      B("fd28","First Watch","firstwatch.com"),
      B("fd29","Five Guys","fiveguys.com"),
      B("fd30","Fresh Kitchen","thefreshkitchen.com"),
      B("fd31","Habit Burger Grill","habitburger.com"),
      B("fd32","Hardee's","hardees.com"),
      B("fd33","Hooters","hooters.com"),
      B("fd34","IHOP","ihop.com"),
      B("fd35","Insomnia Cookies","insomniacookies.com"),
      B("fd36","Jack in the Box","jackinthebox.com"),
      B("fd37","Jersey Mike's Subs","jerseymikes.com"),
      B("fd38","Jet's Pizza","jetspizza.com"),
      B("fd39","Jimmy John's","jimmyjohns.com"),
      B("fd40","Jollibee","jollibeeusa.com"),
      B("fd41","Just Salad","justsalad.com"),
      B("fd42","KFC","kfc.com"),
      B("fd43","Little Caesars","littlecaesars.com"),
      B("fd44","Marco's Pizza","marcos.com"),
      B("fd45","McDonald's","mcdonalds.com"),
      B("fd46","Mellow Mushroom","mellowmushroom.com"),
      B("fd47","Miller's Ale House","millersalehouse.com"),
      B("fd48","Moe's Southwest Grill","moes.com"),
      B("fd49","Noodles & Company","noodles.com"),
      B("fd50","Outback Steakhouse","outback.com"),
      B("fd51","P.F. Chang's","pfchangs.com"),
      B("fd52","Panda Express","pandaexpress.com"),
      B("fd53","Panera Bread","panerabread.com"),
      B("fd54","Papa John's Pizza","papajohns.com"),
      B("fd55","Paris Baguette","parisbaguette.com"),
      B("fd56","Pizza Hut","pizzahut.com"),
      B("fd57","Playa Bowls","playabowls.com"),
      B("fd58","Popeyes","popeyes.com"),
      B("fd59","Portillo's Hot Dogs","portillos.com"),
      B("fd60","Qdoba","qdoba.com"),
      B("fd61","Red Lobster","redlobster.com"),
      B("fd62","Red Robin","redrobin.com"),
      B("fd63","Shake Shack","shakeshack.com"),
      B("fd64","Smashburger","smashburger.com"),
      B("fd65","Sonic","sonicdrivein.com"),
      B("fd66","Steak 'n Shake","steaknshake.com"),
      B("fd67","Subway","subway.com"),
      B("fd68","Sweetgreen","sweetgreen.com"),
      B("fd69","Taco Bell","tacobell.com"),
      B("fd70","Texas de Brazil","texasdebrazil.com"),
      B("fd71","Texas Roadhouse","texasroadhouse.com"),
      B("fd72","TGI Fridays","tgifridays.com"),
      B("fd73","Tropical Smoothie Café","tropicalsmoothie.com"),
      B("fd74","Wendy's","wendys.com"),
      B("fd75","Whataburger","whataburger.com"),
      B("fd76","White Castle","whitecastle.com"),
      B("fd77","Wingstop","wingstop.com"),
      B("fd78","Zaxby's","zaxbys.com"),
      B("fd79","DoorDash","doordash.com"),
      B("fd80","Uber Eats","ubereats.com"),
      B("fd81","Instacart","instacart.com"),
      C("fd99","+ Any Other Chain Restaurant!","🍽","from-amber-600/40 to-orange-600/40"),
    ],
  },refund:{ intro:"We can also help place food orders on your behalf. Contact us for more details.", cards:[] },},
  { id:"hotels",label:"Hotels",icon:"🛏",hasRefund:true,buy4u:{
    intro:"We can book hotels for you from Expedia.com or Booking.com.",
    disclaimer:"Use this service if your booking does not meet our minimum price for the refund service.",
    cards:[B("h01","Expedia","expedia.com"),B("h02","Booking.com","booking.com"),B("h03","Hotels.com","hotels.com")],
  },refund:{
    intro:"HOTELS.com / EXPEDIA / AGODA / TRIP.COM — INSIDER INSTANT REFUNDS. Enjoy your vacation at a fraction of the price. Fresh accounts OK. No limit, any property works (Agoda: hotels only — no apartments or houses). Confirm with us BEFORE booking. MUST be paid in full online — do NOT select pay-later or pay-at-property. ⚠️ Refund is done on first day of check-in OR before checkout. YES it is 10000% SAFE! Handled via our private insider.",
    disclaimer:"💲1,000 minimum fee · 💲2,000 minimum booking · 50% service fee. For the extra paranoid, refund after checkout is possible with an upfront payment.",
    cards:[B("rh01","Hotels.com","hotels.com"),B("rh02","Expedia","expedia.com"),B("rh03","Agoda","agoda.com"),B("rh04","Trip.com","trip.com")],
  }},
  { id:"trains",label:"Trains",icon:"🚆",hasRefund:false,buy4u:{ intro:"Long-distance train and bus ticket bookings.", cards:[B("t01","Amtrak","amtrak.com"),B("t02","Greyhound","greyhound.com")] }},
  { id:"cars",label:"Cars",icon:"🚗",hasRefund:false,buy4u:{ intro:"Car rental bookings — confirm availability before we book.", cards:[B("c01","Avis","avis.com"),B("c02","Budget","budget.com")] }},
  { id:"attractions",label:"Attractions & Tours",icon:"🎡",hasRefund:true,buy4u:{
    intro:"Theme parks, concerts, cruises, tours, sports games, ski resorts, water parks — booked at the flat 50% service rate.",
    disclaimer:"Other recreational activities & many more — open a ticket for custom requests.",
    cards:[
      B("a01","Knott's Berry Farm","knotts.com"),B("a02","Kings Dominion","kingsdominion.com"),
      B("a03","Carowinds","carowinds.com"),B("a04","Six Flags","sixflags.com"),
      B("a05","SeaWorld","seaworld.com"),B("a06","LEGOLAND","legoland.com"),
      B("a07","Sesame Place","sesameplace.com"),B("a08","Nickelodeon Universe","nickelodeonuniverse.com"),
      B("a09","Hershey Park","hersheypark.com"),B("a10","Disney","disney.com"),
      B("a11","Universal Studios","universalstudios.com"),B("a12","Viator","viator.com"),
      C("a13","Safari Parks & Zoos","🦁","from-emerald-600/40 to-green-600/40"),
      C("a14","Water Parks","💦","from-blue-500/40 to-cyan-500/40"),
      C("a15","Bounce Houses","🎪","from-pink-500/40 to-fuchsia-500/40"),
      C("a16","Theme Parks","🎢","from-orange-500/40 to-amber-500/40"),
      C("a17","Concerts & Festivals","🎵","from-purple-600/40 to-violet-600/40"),
      C("a18","Sports Games","🏆","from-green-600/40 to-teal-600/40"),
      C("a19","Movie Tickets","🎬","from-slate-600/40 to-zinc-600/40"),
      C("a20","Cruises","⛴","from-sky-600/40 to-blue-600/40"),
      C("a21","Ski & Winter Sports","⛷","from-blue-300/40 to-cyan-300/40"),
      C("a22","Jet Skis & Boat Rentals","🚤","from-cyan-500/40 to-teal-500/40"),
      C("a23","Golfing Reservations","⛳","from-green-500/40 to-lime-500/40"),
      C("a24","Excursions","🗺","from-amber-500/40 to-yellow-500/40"),
      C("a25","Parasailing","🪂","from-sky-500/40 to-indigo-500/40"),
      C("a26","Food Subscriptions","📦","from-orange-400/40 to-red-400/40"),
      C("a27","Helicopter Tours","🚁","from-gray-600/40 to-slate-600/40"),
      C("a28","Sky Diving","🪂","from-indigo-500/40 to-violet-500/40"),
      C("a29","Escape Rooms","🔐","from-rose-600/40 to-pink-600/40"),
      C("a30","Aquariums","🐠","from-blue-600/40 to-teal-600/40"),
      C("a31","Museums","🏛","from-stone-500/40 to-amber-700/40"),
      C("a32","Bowling","🎳","from-red-500/40 to-orange-500/40"),
      C("a33","Edge NYC","🏙","from-slate-700/40 to-zinc-700/40"),
      C("a34","Empire State Building","🗽","from-gray-500/40 to-stone-500/40"),
      C("a35","Conventions","🎤","from-violet-600/40 to-purple-600/40"),
      C("a36","Tours (Any)","🧭","from-teal-500/40 to-green-500/40"),
      C("a37","Radiate","✨","from-yellow-400/40 to-amber-400/40"),
      C("a38","Train Tickets","🚆","from-zinc-600/40 to-slate-600/40"),
    ],
  },refund:{
    intro:"Book from Viator.com, Agoda.com or Trip.com. 🎟 Ticket Limit: NO LIMIT (same event). 💸 Price Limit: $7,000. ⏳ Time Frame: INSTANT. Fee 35%. Minimum Order: $500. Minimum Fee: $250. 💬 Message at least a day or 1–2 hours before the event — make sure we are ONLINE.",
    cards:[B("ra01","Viator","viator.com"),B("ra02","Agoda","agoda.com"),B("ra03","Trip.com","trip.com")],
  }},
  { id:"furniture",label:"Furniture",icon:"🛋",hasRefund:true,
    buy4u:{ intro:"Furniture orders booked through us — IKEA only.", cards:[B("fu01","IKEA","ikea.com")] },
    refund:{ intro:"For furniture refunds, head to our full Store List for the supported retailers.", cards:[] },
  },
  { id:"giftcards",label:"Gift Cards",icon:"🎁",hasRefund:false,buy4u:{ intro:"", cards:[] } },
];

const BADGE_COLOURS = ["bg-amber-500","bg-violet-600","bg-cyan-600","bg-rose-600","bg-emerald-600","bg-orange-500","bg-fuchsia-600","bg-sky-600"];
function badgeColor(key: string): string {
  let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return BADGE_COLOURS[Math.abs(h) % BADGE_COLOURS.length];
}
function logoUrl(d: string) { return `https://logo.clearbit.com/${d}`; }

function BrandLogo({ domain, name, cardKey }: { domain: string; name: string; cardKey: string }) {
  const [err, setErr] = useState(false);
  const onErr = useCallback(() => setErr(true), []);
  if (err || !domain) return (
    <div className={`grid h-14 w-14 place-items-center rounded-xl ${badgeColor(cardKey)} text-xl font-extrabold text-white`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
  return (
    <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl bg-white p-1">
      <img src={logoUrl(domain)} alt={name} className="h-full w-full object-contain" onError={onErr} loading="lazy" />
    </div>
  );
}

function BrandCard({ secId, mode, card }: { secId: string; mode: "buy4u" | "refund"; card: Card }) {
  const id = `buy4u.${secId}.${mode}.${card.key}`;
  const { isAdmin, editMode } = useEditContext();
  return (
    <div className="group relative flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:-translate-y-0.5 hover:border-amber-300/40 hover:bg-white/[0.07]" style={{ overflow:"visible", minHeight:"100px" }}>
      {card.kind === "image" ? (
        <EditableImage id={`${id}.img`} defaultSrc={card.value} alt={card.name} wrapperClassName="block w-full" className="aspect-[4/3] w-full rounded-xl object-cover" />
      ) : card.kind === "category" ? (
        <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${card.gradient ?? "from-violet-600/40 to-fuchsia-600/40"} text-3xl`}>{card.value}</div>
      ) : (
        <BrandLogo domain={card.value} name={card.name} cardKey={card.key} />
      )}
      <div className="relative w-full" style={{ minHeight:"28px" }}>
        <EditableText id={`${id}.name`} defaultValue={card.name} as="p" className="text-center text-xs font-semibold leading-tight text-white" />
      </div>
      {isAdmin && editMode && (
        <EditableText id={`${id}.domain`} defaultValue={card.value} as="p" className="w-full text-center font-mono text-[10px] text-white/35" placeholder="clearbit domain…" />
      )}
    </div>
  );
}

function CardGrid({ secId, mode, cards }: { secId: string; mode: "buy4u"|"refund"; cards: Card[] }) {
  if (!cards.length) return null;
  return <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">{cards.map(c => <BrandCard key={c.key} secId={secId} mode={mode} card={c} />)}</div>;
}

function SearchableGrid({ secId, mode, cards }: { secId: string; mode: "buy4u"|"refund"; cards: Card[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => { const n = q.trim().toLowerCase(); return n ? cards.filter(c => c.name.toLowerCase().includes(n) || c.value.toLowerCase().includes(n)) : cards; }, [q, cards]);
  return (<>
    <div className="mt-4">
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search restaurants & brands…" className="w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-amber-300/60" />
      <p className="mt-1 text-xs text-white/45">{filtered.length} of {cards.length} brands</p>
    </div>
    <CardGrid secId={secId} mode={mode} cards={filtered} />
  </>);
}

function TabBody({ section, mode }: { section: Section; mode: "buy4u"|"refund" }) {
  const tab = mode === "buy4u" ? section.buy4u : (section.refund ?? section.buy4u);
  return (<div>
    <EditableText id={`buy4u.${section.id}.${mode}.intro`} defaultValue={tab.intro} as="p" multiline className="text-base leading-relaxed text-white/85" />
    {tab.disclaimer && <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-400/[0.06] px-4 py-3"><EditableText id={`buy4u.${section.id}.${mode}.disclaimer`} defaultValue={tab.disclaimer} as="p" multiline className="text-sm text-amber-100" /></div>}
    {tab.withSearch ? <SearchableGrid secId={section.id} mode={mode} cards={tab.cards} /> : <CardGrid secId={section.id} mode={mode} cards={tab.cards} />}
  </div>);
}

function SectionBlock({ section }: { section: Section }) {
  const [mode, setMode] = useState<"buy4u"|"refund">("buy4u");
  return (
    <section id={`buy4u-${section.id}`} className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">{section.icon}</span>
          <h2 className="heading-display text-2xl font-bold uppercase tracking-tight text-white"><EditableText id={`buy4u.${section.id}.label`} defaultValue={section.label} /></h2>
        </div>
        {section.hasRefund && section.refund && (
          <div className="inline-flex rounded-full border border-white/10 bg-ink-900 p-1">
            {(["buy4u","refund"] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${mode===m ? "bg-amber-400 text-ink-950 shadow-[0_0_18px_-4px_rgba(245,185,69,0.6)]" : "text-white/65 hover:text-white"}`}>{m==="buy4u"?"BUY4U":"REFUND"}</button>
            ))}
          </div>
        )}
      </div>
      <TabBody section={section} mode={section.hasRefund ? mode : "buy4u"} />
    </section>
  );
}

const SPAWNGC_CATEGORIES = ["Food And Restaurants","Gas Stations","Retail","Groceries","Entertainment"];
const SPAWNGC_AVAILABILITY = ["In Stock","Best Selling","Instant Delivery","PIN","PDF","Pass2U","Online","In-Store"];
const SPAWNGC_STATES = ["AL","AK","AS","AZ","AR","CA","CO","CT","DE","DC","FM","FL","GA","GU","HI","ID","IL","IN","IA","KS","KY","LA","ME","MH","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","MP","OH","OK","OR","PW","PA","PR","RI","SC","SD","TN","TX","UT","VT","VI","VA","WA","WV","WI","WY"];
type GiftCard = { key: string; name: string; brand: string; category: string; state?: string; availability: string[]; image?: string; price?: string };
const SPAWNGC_CARDS: GiftCard[] = [];

function GiftCardsSection() {
  const [cat, setCat] = useState("");
  const [state, setState] = useState("");
  const [avail, setAvail] = useState("");
  const [q, setQ] = useState("");
  const filtered = useMemo(() => SPAWNGC_CARDS.filter(c => {
    if (cat && c.category !== cat) return false;
    if (state && c.state !== state) return false;
    if (avail && !c.availability.includes(avail)) return false;
    if (q && !c.name.toLowerCase().includes(q.toLowerCase()) && !c.brand.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [cat, state, avail, q]);
  return (
    <section id="buy4u-giftcards" className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-3"><span className="text-3xl">🎁</span>
        <h2 className="heading-display text-2xl font-bold uppercase tracking-tight text-white"><EditableText id="buy4u.giftcards.label" defaultValue="Gift Cards" /></h2>
      </div>
      <EditableText id="buy4u.giftcards.intro" defaultValue="Gift card catalog mirrored from spawngc.gg. Full inventory population is in progress (spawngc requires login). Filters below match the real category, state, and availability lists from spawngc.gg." as="p" multiline className="text-base leading-relaxed text-white/85" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wider text-white/55">Category</span>
          <select value={cat} onChange={e=>setCat(e.target.value)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/60"><option value="">All categories</option>{SPAWNGC_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wider text-white/55">State</span>
          <select value={state} onChange={e=>setState(e.target.value)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/60"><option value="">All states</option>{SPAWNGC_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wider text-white/55">Availability</span>
          <select value={avail} onChange={e=>setAvail(e.target.value)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/60"><option value="">Any availability</option>{SPAWNGC_AVAILABILITY.map(a=><option key={a} value={a}>{a}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wider text-white/55">Search</span>
          <input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Brand or name…" className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-amber-300/60" /></label>
      </div>
      {SPAWNGC_CARDS.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-400/[0.06] px-5 py-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-200">Catalog being indexed</p>
          <p className="mt-2 text-sm text-white/75">spawngc.gg requires login to view inventory. The full catalog will appear here once a scrape pass with credentials is run. Filters above already use the real category, state, and availability lists from spawngc.gg.</p>
        </div>
      ) : (<><p className="mt-3 text-xs text-white/55">{filtered.length} of {SPAWNGC_CARDS.length} cards</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{filtered.map(c => <div key={c.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">{c.image&&<img src={c.image} alt={c.name} className="aspect-[4/3] w-full rounded-xl object-cover" />}<p className="mt-2 text-center text-xs font-semibold text-white">{c.name}</p>{c.price&&<p className="mt-1 text-center text-[11px] text-white/55">{c.price}</p>}</div>)}</div>
      </>)}
    </section>
  );
}

function SectionPillNav() {
  return (
    <nav aria-label="Buy4U sections" className="sticky top-16 z-20 -mx-4 mb-8 overflow-x-auto border-y border-white/10 bg-ink-950/85 px-4 py-3 backdrop-blur-xl">
      <ul className="flex min-w-max items-center gap-2">
        {SECTIONS.map(s => <li key={s.id}><a href={`#buy4u-${s.id}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/85 transition hover:border-amber-300/60 hover:bg-amber-400/10 hover:text-white"><span aria-hidden="true">{s.icon}</span><span>{s.label}</span></a></li>)}
      </ul>
    </nav>
  );
}

export default function Buy4uPage() {
  const { isAdmin } = useEditContext();
  return (
    <main className="container-px py-12">
      <header className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/85"><EditableText id="buy4u.kicker" defaultValue="we shop for you" /></p>
        <h1 className="heading-display mt-2 text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl"><EditableText id="buy4u.title" defaultValue="Buy 4 U" /></h1>
      </header>
      <div className="mx-auto max-w-3xl rounded-3xl border border-amber-300/35 bg-gradient-to-br from-amber-400/[0.10] to-transparent p-6 sm:p-8 shadow-[0_0_60px_-20px_rgba(245,185,69,0.45)]">
        <EditableText id="buy4u.intro.headline" defaultValue="⭐️ Introducing our service where we shop for you at a flat 50% discount rate ⭐️" as="p" multiline className="text-center text-xl font-bold text-amber-100" />
        <EditableText id="buy4u.intro.body" defaultValue="We place the order/booking for you and upon confirmation you simply pay us our fee." as="p" multiline className="mt-4 text-center text-base text-white/85" />
        <div className="mt-5 rounded-2xl border border-white/10 bg-ink-900/60 p-4">
          <EditableText id="buy4u.intro.notice" defaultValue="Note: We require at least 24 hours prior notice to be able to attend to your booking in a timely manner, so please schedule in advance accordingly. Thank you!" as="p" multiline className="text-sm leading-relaxed text-white/75" />
        </div>
        <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/[0.06] p-4">
          <EditableText id="buy4u.intro.warning" defaultValue="FOR ANY OF YOUR BOOKING NEEDS KINDLY MESSAGE US A FEW DAYS OR A WEEK PRIOR! IF YOUR BOOKING IS MONTHS UP AHEAD, PLEASE DON'T SHARE DETAILS SO FAR IN ADVANCE! WE DO NOT OFFER THIS FOR STANDARD RETAIL STORES LIKE APPLE, AMAZON — DO NOT ASK!" as="p" multiline className="text-sm font-semibold uppercase leading-relaxed tracking-wide text-rose-200" />
        </div>
      </div>
      <SectionPillNav />
      <div className="space-y-8">
        {SECTIONS.map(s => s.id==="giftcards" ? <GiftCardsSection key={s.id} /> : <SectionBlock key={s.id} section={s} />)}
      </div>
      {isAdmin && <p className="mt-10 text-center text-xs text-white/35">Admin: every label, intro, disclaimer, brand name, and image on this page is editable in edit mode.</p>}
    </main>
  );
}