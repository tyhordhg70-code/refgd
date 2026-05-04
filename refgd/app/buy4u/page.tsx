"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import EditableText from "@/components/EditableText";
import EditableImage from "@/components/EditableImage";
import { useEditContext } from "@/lib/edit-context";

type CardKind = "brand" | "photo";
type Card = { key: string; name: string; kind: CardKind; domain?: string; photo?: string; gradient?: string; };
type Tab = { intro: string; disclaimer?: string; cards: Card[]; withSearch?: boolean; };
type Section = { id: string; label: string; icon: string; hasRefund: boolean; buy4u: Tab; refund?: Tab; };

const B = (key: string, name: string, domain: string): Card => ({ key, name, kind: "brand", domain });
const C = (key: string, name: string, photo: string): Card => ({ key, name, kind: "photo", photo });

const LOGO_SRC: Record<string, string> = {
  "allegiantair.com": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Allegiant_Air_logo.svg/330px-Allegiant_Air_logo.svg.png",
  "klm.com": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/KLM_logo.svg/330px-KLM_logo.svg.png",
  "chipotle.com": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/Chipotle_Mexican_Grill_logo.svg/330px-Chipotle_Mexican_Grill_logo.svg.png",
  "kfc.com": "https://upload.wikimedia.org/wikipedia/en/thumb/5/57/KFC_logo-image.svg/330px-KFC_logo-image.svg.png",
  "pizzahut.com": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Pizza_Hut_2025.svg/330px-Pizza_Hut_2025.svg.png",
  "wendys.com": "https://upload.wikimedia.org/wikipedia/en/thumb/3/32/Wendy%27s_full_logo_2012.svg/330px-Wendy%27s_full_logo_2012.svg.png",
  "mcdonalds.com": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/McDonald%27s_Golden_Arches.svg/330px-McDonald%27s_Golden_Arches.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail",
  "tacobell.com": "https://upload.wikimedia.org/wikipedia/en/thumb/b/b7/Taco_Bell_2023.svg/400px-Taco_Bell_2023.svg.png",
  "bk.com": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Burger_King_2020.svg/400px-Burger_King_2020.svg.png",
  "arbys.com": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Arby%27s_logo.svg/400px-Arby%27s_logo.svg.png",
  "wingstop.com": "https://upload.wikimedia.org/wikipedia/en/thumb/0/0f/Wingstop_logo.svg/400px-Wingstop_logo.svg.png",
  "ihop.com": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/IHOP_logo.svg/400px-IHOP_logo.svg.png",
  "jollibeeusa.com": "https://upload.wikimedia.org/wikipedia/en/thumb/8/84/Jollibee_2011_logo.svg/400px-Jollibee_2011_logo.svg.png",
  "texasroadhouse.com": "https://upload.wikimedia.org/wikipedia/en/thumb/b/b0/Texas_Roadhouse.svg/600px-Texas_Roadhouse.svg.png",
  "whataburger.com": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Whataburger_logo.svg/330px-Whataburger_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail",
  "fiveguys.com": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Five_Guys_logo.svg/330px-Five_Guys_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail",
  "aircanada.com": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Air_Canada_logo.svg/330px-Air_Canada_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail",
  "amtrak.com": "https://upload.wikimedia.org/wikipedia/commons/e/eb/Amtrak_logo.svg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original",
  "expedia.com": "https://upload.wikimedia.org/wikipedia/commons/5/5b/Expedia_2012_logo.svg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original",
  "booking.com": "https://upload.wikimedia.org/wikipedia/commons/b/be/Booking.com_logo.svg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original",
  "subway.com": "https://upload.wikimedia.org/wikipedia/commons/5/5c/Subway_2016_logo.svg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original",
  "dairyqueen.com": "https://upload.wikimedia.org/wikipedia/commons/a/ae/Dairy_Queen_logo.svg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original",
  "avis.com": "https://upload.wikimedia.org/wikipedia/commons/f/fd/Avis_logo.svg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original",
  "budget.com": "https://upload.wikimedia.org/wikipedia/commons/8/8f/Budget_logo.svg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original",
  "dominos.com": "https://upload.wikimedia.org/wikipedia/commons/7/74/Dominos_pizza_logo.svg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original",
  "popeyes.com": "https://upload.wikimedia.org/wikipedia/commons/7/73/Popeyes_logo.svg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original"
};

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
      B("fd38","Jimmy John's","jimmyjohns.com"),
      B("fd39","Jimmy John's","jimmyjohns.com"),
      B("fd40","Jollibee","jollibeeusa.com"),
      B("fd41","Just Salad","justsalad.com"),
      B("fd42","KFC","kfc.com"),
      B("fd43","Little Caesars","littlecaesars.com"),
      B("fd44","Marco's Pizza","marcos.com"),
      B("fd45","McDonald's","mcdonalds.com"),
      B("fd46","Mellow Mushroom","mellowmushroom.com"),
      B("fd47","Moe's Southwest Grill","moes.com"),
      B("fd48","Noodles & Company","noodles.com"),
      B("fd49","Outback Steakhouse","outback.com"),
      B("fd50","P.F. Chang's","pfchangs.com"),
      B("fd51","Panda Express","pandaexpress.com"),
      B("fd52","Panera Bread","panerabread.com"),
      B("fd53","Papa John's Pizza","papajohns.com"),
      B("fd54","Paris Baguette","parisbaguette.com"),
      B("fd55","Pizza Hut","pizzahut.com"),
      B("fd56","Playa Bowls","playabowls.com"),
      B("fd57","Popeyes","popeyes.com"),
      B("fd58","Portillo's Hot Dogs","portillos.com"),
      B("fd59","Qdoba","qdoba.com"),
      B("fd60","Red Lobster","redlobster.com"),
      B("fd61","Red Robin","redrobin.com"),
      B("fd62","Shake Shack","shakeshack.com"),
      B("fd63","Smashburger","smashburger.com"),
      B("fd64","Sonic","sonicdrivein.com"),
      B("fd65","Steak 'n Shake","steaknshake.com"),
      B("fd66","Subway","subway.com"),
      B("fd67","Sweetgreen","sweetgreen.com"),
      B("fd68","Taco Bell","tacobell.com"),
      B("fd69","Texas de Brazil","texasdebrazil.com"),
      B("fd70","Texas Roadhouse","texasroadhouse.com"),
      B("fd71","TGI Fridays","tgifridays.com"),
      B("fd72","Tropical Smoothie Café","tropicalsmoothie.com"),
      B("fd73","Wendy's","wendys.com"),
      B("fd74","Whataburger","whataburger.com"),
      B("fd75","White Castle","whitecastle.com"),
      B("fd76","Wingstop","wingstop.com"),
      B("fd77","Zaxby's","zaxbys.com"),
      B("fd78","DoorDash","doordash.com"),
      B("fd79","Uber Eats","ubereats.com"),
      B("fd80","Instacart","instacart.com"),
      { key:"fd99",name:"+ Any Other Chain Restaurant!",kind:"photo",photo:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80" },
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
            C("a01","Knott's Berry Farm","https://live.staticflickr.com/3087/3117082737_a328c57946_b.jpg"),
      C("a02","Kings Dominion","https://live.staticflickr.com/4010/4571006662_447cbf34d2_b.jpg"),
      C("a03","Carowinds","https://live.staticflickr.com/7257/7470296558_b3a6253e82_b.jpg"),
      C("a04","Six Flags","https://live.staticflickr.com/1976/45245588651_a5754ec779_b.jpg"),
      C("a05","SeaWorld","https://live.staticflickr.com/3407/3507418462_205e6e4b97_b.jpg"),
      C("a06","LEGOLAND","https://live.staticflickr.com/8164/6960962408_65a7b9a944_b.jpg"),
      C("a07","Sesame Place","https://live.staticflickr.com/65535/48250025567_151bc30a9a_b.jpg"),
      C("a08","Nickelodeon Universe","https://live.staticflickr.com/65535/42111358530_1ec6b27845_b.jpg"),
      C("a09","Hershey Park","https://live.staticflickr.com/8300/7792947780_4bdaa402d0_b.jpg"),
      C("a10","Disney","https://live.staticflickr.com/4305/36142092545_93ce1f741a_b.jpg"),
      C("a11","Universal Studios","https://live.staticflickr.com/7295/10173992675_79c252a5fa_b.jpg"),
      C("a12","Viator","https://live.staticflickr.com/5211/5397759488_27335a1fbf_b.jpg"),B("a12","Viator","viator.com"),
      C("a13","Safari Parks & Zoos","https://live.staticflickr.com/7019/6767670363_6dff1e631e.jpg"),
      C("a14","Water Parks","https://live.staticflickr.com/7227/7239517918_b9aaa4dc08_b.jpg"),
      C("a15","Bounce Houses","https://live.staticflickr.com/7227/7239517918_b9aaa4dc08_b.jpg"),
      C("a16","Theme Parks","https://live.staticflickr.com/65535/48250025567_151bc30a9a_b.jpg"),
      C("a17","Concerts & Festivals","https://live.staticflickr.com/3498/3735171010_90582fc99c_b.jpg"),
      C("a18","Sports Games","https://live.staticflickr.com/3100/2449761154_1cd60beb72_b.jpg"),
      C("a19","Movie Tickets","https://live.staticflickr.com/65535/49244669042_9e9fcaaf3d_b.jpg"),
      C("a20","Cruises","https://live.staticflickr.com/83/236458175_92c6db6f83_b.jpg"),
      C("a21","Ski & Winter Sports","https://live.staticflickr.com/7103/6970878132_084eed5183_b.jpg"),
      C("a22","Jet Skis & Boat Rentals","https://live.staticflickr.com/2513/3909457319_5294c41673_b.jpg"),
      C("a23","Golfing Reservations","https://live.staticflickr.com/8476/8080202865_ec5de0e945_b.jpg"),
      C("a24","Excursions","https://loremflickr.com/cache/resized/4108_5058986716_a9bc493bee_b_800_600_nofilter.jpg"),
      C("a25","Parasailing","https://live.staticflickr.com/1317/4725747410_10b5492659_b.jpg"),
      C("a26","Food Subscriptions","https://live.staticflickr.com/1442/25597562703_ff340804c7_b.jpg"),
      C("a27","Helicopter Tours","https://live.staticflickr.com/5517/10694545795_71c9331a07_b.jpg"),
      C("a28","Sky Diving","https://live.staticflickr.com/8389/8570392393_bcde64b271_b.jpg"),
      C("a29","Escape Rooms","https://live.staticflickr.com/3915/14825806987_01aa29700d_b.jpg"),
      C("a30","Aquariums","https://live.staticflickr.com/7306/8726573985_ebc1259e97_b.jpg"),
      C("a31","Museums","https://live.staticflickr.com/1479/24515532800_a1def64687_b.jpg"),
      C("a32","Bowling","https://live.staticflickr.com/108/366018689_ac392bddfe_b.jpg"),
      C("a33","Edge NYC","https://live.staticflickr.com/65535/52416195229_22d3afdc4b_b.jpg"),
      C("a34","Empire State Building","https://live.staticflickr.com/1525/24082243649_37c3f121ae_b.jpg"),
      C("a35","Conventions","https://live.staticflickr.com/2498/4015493634_7828e589a6_b.jpg"),
      C("a36","Tours (Any)","https://live.staticflickr.com/834/43382085032_460e6a8aaa_b.jpg"),
      C("a37","Radiate","https://live.staticflickr.com/3498/3735171010_90582fc99c_b.jpg"),
      C("a38","Train Tickets","https://live.staticflickr.com/6173/6207643946_b38ba729c9_b.jpg"),
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


  // ─── Animated background ─────────────────────────────────────────────────

  function ParticleCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
      resize();
      window.addEventListener("resize", resize);
      type P = { x:number;y:number;r:number;dx:number;dy:number;a:number;da:number;hue:number };
      const particles: P[] = Array.from({ length: 60 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 2.2 + 0.4,
        dx: (Math.random() - 0.5) * 0.35,
        dy: (Math.random() - 0.5) * 0.35,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.006,
        hue: Math.random() < 0.6 ? Math.random() * 40 + 220 : Math.random() * 30 + 280,
      }));
      let raf = 0;
      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
          p.x += p.dx; p.y += p.dy; p.a += p.da;
          if (p.a > 1) { p.a = 1; p.da = -Math.abs(p.da); }
          if (p.a < 0) { p.a = 0; p.da = Math.abs(p.da); }
          if (p.x < -5) p.x = canvas.width + 5;
          if (p.x > canvas.width + 5) p.x = -5;
          if (p.y < -5) p.y = canvas.height + 5;
          if (p.y > canvas.height + 5) p.y = -5;
          const al = p.a * 0.65;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
          g.addColorStop(0, `hsla(${p.hue},80%,72%,${al})`);
          g.addColorStop(0.4, `hsla(${p.hue},70%,60%,${al * 0.5})`);
          g.addColorStop(1, "transparent");
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue},90%,82%,${p.a * 0.9})`; ctx.fill();
        }
        raf = requestAnimationFrame(draw);
      };
      draw();
      return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
    }, []);
    return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" style={{ opacity: 0.38 }} />;
  }

  function BrandLogo({ domain, name, cardKey }: { domain: string; name: string; cardKey: string }) {
  const [srcIdx, setSrcIdx] = useState(0);
  const onErr = useCallback(() => setSrcIdx(p => p + 1), []);
  const sources: string[] = [
    LOGO_SRC[domain] ?? "",
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.${domain}&size=256`,
  ].filter(Boolean);
  if (srcIdx >= sources.length) return (
    <div className={`grid h-14 w-14 place-items-center rounded-xl ${badgeColor(cardKey)} text-xl font-extrabold text-white shadow-inner`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
  return (
    <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow">
      <img src={sources[srcIdx]} alt={name} className="h-full w-full object-contain" onError={onErr} loading="lazy" />
    </div>
  );
}

function BrandCard({ secId, mode, card, onDelete }: { secId: string; mode: "buy4u"|"refund"; card: Card; onDelete?: () => void }) {
  const id = `buy4u.${secId}.${mode}.${card.key}`;
  const { isAdmin, editMode } = useEditContext();
  return (
    <div className="group relative flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:-translate-y-0.5 hover:border-amber-300/40 hover:bg-white/[0.07]" style={{ overflow:"visible", minHeight:"100px" }}>
        {onDelete && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Remove card" className="absolute -right-2 -top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow-lg hover:bg-red-400 transition-colors">×</button>
        )}
      {card.kind === "photo" ? (
        <EditableImage
            id={`${id}.photo`}
            defaultSrc={card.photo!}
            alt={card.name}
            className="h-full w-full object-contain"
            wrapperClassName="block aspect-[4/3] w-full overflow-hidden rounded-xl"
          />
      ) : (
        <BrandLogo domain={card.domain!} name={card.name} cardKey={card.key} />
      )}
      <div className="relative w-full" style={{ minHeight:"28px" }}>
        <EditableText id={`${id}.name`} defaultValue={card.name} as="p" className="text-center text-xs font-semibold leading-tight text-white" />
      </div>
      {isAdmin && editMode && card.domain && (
        <EditableText id={`${id}.domain`} defaultValue={card.domain} as="p" className="w-full text-center font-mono text-[10px] text-white/35" placeholder="clearbit domain…" />
      )}
    </div>
  );
}

function CardGrid({ secId, mode, cards, wide }: { secId: string; mode: "buy4u"|"refund"; cards: Card[]; wide?: boolean }) {
    const { isAdmin, editMode, getValue, setValue } = useEditContext();
    const [showAdd, setShowAdd] = useState(false);
    const [addKind, setAddKind] = useState<CardKind>("brand");
    const [addName, setAddName] = useState("");
    const [addVal,  setAddVal]  = useState("");

    // Use local state so delete/add update the UI IMMEDIATELY (not waiting on context re-render).
    // Initialise lazily from the edit-context (picks up previously saved values from DB).
    const [deleted, setDeleted] = useState<string[]>(() => {
      try { return JSON.parse(getValue(`buy4u.${secId}.${mode}.deleted`, "[]")); } catch { return []; }
    });
    const [extra, setExtra] = useState<Card[]>(() => {
      try { return JSON.parse(getValue(`buy4u.${secId}.${mode}.extra`, "[]")); } catch { return []; }
    });

    const visible = [...cards.filter(c => !deleted.includes(c.key)), ...extra];

    const handleDelete = (key: string) => {
      const isExtraCard = extra.some(c => c.key === key);
      if (isExtraCard) {
        const next = extra.filter(c => c.key !== key);
        setExtra(next);
        setValue(`buy4u.${secId}.${mode}.extra`, JSON.stringify(next));
      } else {
        const next = [...deleted, key];
        setDeleted(next);
        setValue(`buy4u.${secId}.${mode}.deleted`, JSON.stringify(next));
      }
    };

    const handleAdd = () => {
      if (!addName.trim()) return;
      const nk = `x${Date.now()}`;
      const nc: Card = addKind === "brand"
        ? { key: nk, name: addName.trim(), kind: "brand", domain: addVal.trim() || "example.com" }
        : { key: nk, name: addName.trim(), kind: "photo", photo: addVal.trim() || "https://loremflickr.com/400/300/travel" };
      const next = [...extra, nc];
      setExtra(next);
      setValue(`buy4u.${secId}.${mode}.extra`, JSON.stringify(next));
      setAddName(""); setAddVal(""); setShowAdd(false);
    };

    if (!visible.length && !(isAdmin && editMode)) return null;
    const grid = wide
      ? "mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      : "mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8";

    return (
      <div>
        <div className={grid}>
          {visible.map(c => (
            <BrandCard key={c.key} secId={secId} mode={mode} card={c}
              onDelete={isAdmin && editMode ? () => handleDelete(c.key) : undefined} />
          ))}
          {isAdmin && editMode && !showAdd && (
            <button onClick={() => setShowAdd(true)}
              className="flex min-h-[100px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-white/20 bg-transparent text-white/40 transition hover:border-amber-300/50 hover:text-amber-300/70">
              <span className="text-2xl leading-none">+</span>
              <span className="text-[11px]">Add Card</span>
            </button>
          )}
        </div>
        {isAdmin && editMode && showAdd && (
          <div className="mt-3 space-y-3 rounded-2xl border border-amber-300/30 bg-white/[0.05] p-4">
            <div className="flex gap-2">
              <button onClick={() => setAddKind("brand")} className={`rounded-lg border px-3 py-1 text-xs font-semibold ${addKind==="brand" ? "border-amber-300 text-amber-300" : "border-white/20 text-white/50"}`}>Brand / Logo</button>
              <button onClick={() => setAddKind("photo")} className={`rounded-lg border px-3 py-1 text-xs font-semibold ${addKind==="photo" ? "border-amber-300 text-amber-300" : "border-white/20 text-white/50"}`}>Photo Card</button>
            </div>
            <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Card name"
              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-300/50" />
            <input value={addVal} onChange={e => setAddVal(e.target.value)}
              placeholder={addKind === "brand" ? "Domain (e.g. nike.com)" : "Photo URL"}
              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-300/50" />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="rounded-lg bg-amber-400/90 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300 transition-colors">Add Card</button>
              <button onClick={() => setShowAdd(false)} className="rounded-lg border border-white/20 px-4 py-2 text-xs text-white/60 hover:text-white transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }
  
function SearchableGrid({ secId, mode, cards }: { secId: string; mode: "buy4u"|"refund"; cards: Card[] }) {
    const { getValue } = useEditContext();
    const [q, setQ] = useState("");
    let extra: Card[] = [];
    try { extra = JSON.parse(getValue(`buy4u.${secId}.${mode}.extra`, "[]")); } catch {}
    const allCards = useMemo(() => [...cards, ...extra], [cards, extra]);
    const filtered = useMemo(() => {
      const n = q.trim().toLowerCase();
      return n ? allCards.filter(c => c.name.toLowerCase().includes(n) || (c.domain ?? c.photo ?? "").toLowerCase().includes(n)) : allCards;
    }, [q, allCards]);
    return (<>
      <div className="mt-4">
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search restaurants & brands…" className="w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-amber-300/60" />
        <p className="mt-1 text-xs text-white/45">{filtered.length} of {allCards.length} brands</p>
      </div>
      <CardGrid secId={secId} mode={mode} cards={filtered} />
    </>);
  }
  
function TabBody({ section, mode }: { section: Section; mode: "buy4u"|"refund" }) {
  const tab = mode === "buy4u" ? section.buy4u : (section.refund ?? section.buy4u);
  const hasPhotos = tab.cards.some(c => c.kind === "photo");
  return (<div>
    <EditableText id={`buy4u.${section.id}.${mode}.intro`} defaultValue={tab.intro} as="p" multiline className="text-base leading-relaxed text-white/85" />
    {tab.disclaimer && <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-400/[0.06] px-4 py-3"><EditableText id={`buy4u.${section.id}.${mode}.disclaimer`} defaultValue={tab.disclaimer} as="p" multiline className="text-sm text-amber-100" /></div>}
    {tab.withSearch ? <SearchableGrid secId={section.id} mode={mode} cards={tab.cards} /> : <CardGrid secId={section.id} mode={mode} cards={tab.cards} wide={hasPhotos} />}
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
        <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wider text-white/55">Category</span><select value={cat} onChange={e=>setCat(e.target.value)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/60"><option value="">All categories</option>{SPAWNGC_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wider text-white/55">State</span><select value={state} onChange={e=>setState(e.target.value)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/60"><option value="">All states</option>{SPAWNGC_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wider text-white/55">Availability</span><select value={avail} onChange={e=>setAvail(e.target.value)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/60"><option value="">Any availability</option>{SPAWNGC_AVAILABILITY.map(a=><option key={a} value={a}>{a}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wider text-white/55">Search</span><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Brand or name…" className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-amber-300/60" /></label>
      </div>
      {SPAWNGC_CARDS.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-400/[0.06] px-5 py-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-200">Catalog being indexed</p>
          <p className="mt-2 text-sm text-white/75">spawngc.gg requires login to view inventory. The full catalog will appear here once a scrape pass with credentials is run.</p>
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
    <>
        <style>{
          `@keyframes gradientPulse{0%,100%{opacity:.7;transform:scale(1) rotate(0deg)}50%{opacity:1;transform:scale(1.08) rotate(1.5deg)}}
           @keyframes gradientPulse2{0%,100%{opacity:.5;transform:scale(1) rotate(0deg)}50%{opacity:.95;transform:scale(1.12) rotate(-2deg)}}`
        }</style>
        {/* Gradient animation layer */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0" style={{background:"radial-gradient(ellipse 70% 60% at 20% 40%, rgba(124,58,237,0.18) 0%, transparent 70%)",animation:"gradientPulse 9s ease-in-out infinite"}} />
          <div className="absolute inset-0" style={{background:"radial-gradient(ellipse 60% 50% at 80% 70%, rgba(56,189,248,0.12) 0%, transparent 65%)",animation:"gradientPulse2 11s ease-in-out infinite"}} />
          <div className="absolute inset-0" style={{background:"radial-gradient(ellipse 50% 40% at 50% 10%, rgba(245,158,11,0.07) 0%, transparent 60%)",animation:"gradientPulse 13s ease-in-out infinite reverse"}} />
        </div>
        <ParticleCanvas />
        <main className="relative z-10 container-px py-12">
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
    </>
  );
}