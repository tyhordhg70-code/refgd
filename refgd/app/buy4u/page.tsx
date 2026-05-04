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
      <EditableImage
          id={card.kind === "photo" ? `${id}.photo` : `${id}.logo`}
          defaultSrc={card.kind === "photo" ? card.photo! : (LOGO_SRC[card.domain!] || `https://www.google.com/s2/favicons?domain=${card.domain}&sz=128`)}
          alt={card.name}
          className="h-full w-full object-contain"
          wrapperClassName={card.kind === "photo" ? "block aspect-[4/3] w-full overflow-hidden rounded-xl" : "grid h-14 w-14 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow"}
        />
      <div className="relative w-full" style={{ minHeight:"28px" }}>
        <EditableText id={`${id}.name`} defaultValue={card.name} as="span" className={`block text-center text-xs font-semibold leading-tight text-white${isAdmin && editMode ? " rounded px-1 outline-dashed outline-1 outline-amber-300/40 hover:outline-amber-300/80" : ""}`} />
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
      const [q, setQ] = useState("");
      const filtered = useMemo(() => {
        const n = q.trim().toLowerCase();
        return n ? cards.filter(c => c.name.toLowerCase().includes(n) || (c.domain ?? c.photo ?? "").toLowerCase().includes(n)) : cards;
      }, [q, cards]);
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
type GiftCard = { key: string; name: string; brand: string; category: string; states: string[]; availability: string[]; image?: string; price?: string; denominations?: string };
const SPAWNGC_CARDS: GiftCard[] = [
{key:"sgc001",name:"Barnes N Noble",brand:"Barnes N Noble",category:"Entertainment",states:[],availability:["In Stock","Best Selling","Pass2U","In-Store"],image:"https://spawngc.gg/media/images/16577527-686a-48fb-b08c-5bb1845f6d13.png",price:"50% off",denominations:"$25, $26, $27, $28"},
{key:"sgc002",name:"Cinemark (century Theatres, Cinearts, Tinseltown, Rave Cinemas)",brand:"Cinemark (century Theatres, Cinearts, Tinseltown, Rave Cinemas)",category:"Entertainment",states:["AL","AK","AZ","CA","CO","DE","FL","GA","IL","IN","IA","KS","KY","LA","MD","MA","MI","MN","MS","MT","NV","NH","NJ","NM","NY","NC","OH","OK","OR","PA","SC","SD","TN","TX","UT","VA","WA","WV","WI"],availability:["In Stock","Best Selling","PDF","Online","In-Store"],image:"https://spawngc.gg/media/images/368ffaf6-6455-43dc-8017-9b95c63def5c.png",price:"40% off",denominations:"$5, $10, $15, $20"},
{key:"sgc003",name:"Craft Warehouse (Online)",brand:"Craft Warehouse (Online)",category:"Entertainment",states:[],availability:["In Stock","PIN","Online"],image:"https://spawngc.gg/media/images/d2259ffc-0001-4cdb-baae-0136d3cd6b4f.png",price:"50% off",denominations:"$50, $51"},
{key:"sgc004",name:"Disney (disneyland, Disney Store, Disney Plus)",brand:"Disney (disneyland, Disney Store, Disney Plus)",category:"Entertainment",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Best Selling","PIN"],image:"https://spawngc.gg/media/images/2ad6ad9f-a5aa-4832-9234-c51cb300dbe8.png",price:"20% off",denominations:"$25, $30, $40, $50, $100, $250, $500"},
{key:"sgc005",name:"Emagine Entertainment",brand:"Emagine Entertainment",category:"Entertainment",states:["IL","MI","MN","WI"],availability:["In Stock","Best Selling","PDF"],image:"https://spawngc.gg/media/images/e238b93e-4597-41d9-abcf-ce395fe89dcd.png",price:"40% off",denominations:"$30, $50"},
{key:"sgc006",name:"Fandango",brand:"Fandango",category:"Entertainment",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Best Selling","Online","In-Store"],image:"https://spawngc.gg/media/images/a54f6cd6-888c-4300-995b-bd0bef17efbb.png",price:"40% off",denominations:"$10, $15, $20, $25, $30, $50, $70, $100"},
{key:"sgc007",name:"Regal Cinemas",brand:"Regal Cinemas",category:"Entertainment",states:["AL","AK","AZ","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","KS","KY","LA","ME","MD","MA","MI","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","OH","OK","OR","PA","SC","TN","TX","UT","VA","WA","WV","WY"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/a11a7a14-08c8-45da-bb27-09495c92447e.png",price:"47% off",denominations:"$10, $15"},
{key:"sgc008",name:"Sea World (busch Gardens, Aquatica, Adventure Island, Discovery Cove, Sesame Palace, Water Country)",brand:"Sea World (busch Gardens, Aquatica, Adventure Island, Discovery Cove, Sesame Palace, Water Country)",category:"Entertainment",states:["CA","FL","PA","TX","VA"],availability:["In Stock","Best Selling","In-Store"],image:"https://spawngc.gg/media/images/ff4b831d-8313-425b-b8cc-531733fefe53.png",price:"35% off",denominations:"$25, $30, $40, $50, $60, $70, $80, $90, $100, $110, $120, $130, $140, $150, $160, $170, $180, $200, $210, $220, $250"},
{key:"sgc009",name:"Studio Movie Grill",brand:"Studio Movie Grill",category:"Entertainment",states:["CA","FL","GA","IL","PA","TX"],availability:["In Stock","Best Selling","PDF","Online","In-Store"],image:"https://spawngc.gg/media/images/76bf7045-30d9-45ea-80e4-bda5479e8c23.png",price:"45% off",denominations:"$5, $10, $15, $20, $25, $30, $40, $50, $60, $70, $100"},
{key:"sgc010",name:"Top Golf",brand:"Top Golf",category:"Entertainment",states:["AL","AZ","AR","CA","CO","FL","GA","IL","IN","KS","LA","MD","MI","MN","MO","NE","NV","NJ","NM","NY","NC","OH","OK","OR","PA","SC","TN","TX","UT","VA"],availability:["In Stock","Best Selling","PIN","PDF","Online","In-Store"],image:"https://spawngc.gg/media/images/9082a802-097f-4d03-929b-95a30f581e78.png",price:"40% off",denominations:"$25"},
{key:"sgc011",name:"$15s Applebee's",brand:"$15s Applebee's",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Best Selling","PDF"],image:"https://spawngc.gg/media/images/7b8d7df6-dbf9-4cc6-9bf4-baf4b423e3c6.png",price:"50% off",denominations:"$15"},
{key:"sgc012",name:"Applebee's",brand:"Applebee's",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Best Selling","PDF"],image:"https://spawngc.gg/media/images/a6639074-d7ad-45cc-9287-5f1668061a75.png",price:"50% off",denominations:"$10"},
{key:"sgc013",name:"Bad Daddy's Burger Bar",brand:"Bad Daddy's Burger Bar",category:"Food And Restaurants",states:["AL","CO","OK","SC"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/7bfc718d-8203-4ac7-8575-9f7bc7a5e4b9.png",price:"45% off",denominations:"$5, $10, $15, $20, $25, $30, $40, $50, $100, $160, $200"},
{key:"sgc014",name:"Bar Louie",brand:"Bar Louie",category:"Food And Restaurants",states:["AZ","AR","CA","CO","CT","DC","FL","IL","IN","IA","KY","MD","MA","MI","MN","MO","NJ","NY","OH","PA","RI","SC","TN","TX","VA","WI"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/0a7385c3-2968-4025-9532-03b47219d87d.png",price:"45% off",denominations:"$50"},
{key:"sgc015",name:"Beef O Brady's",brand:"Beef O Brady's",category:"Food And Restaurants",states:["AL","AR","FL","GA","IL","KY","LA","MD","MI","MN","MS","MO","MT","NC","OH","SC","TX","VA","WI"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/daccfbde-00ce-4e47-a1a2-75fcc7847c4a.png",price:"45% off",denominations:"$5, $10"},
{key:"sgc016",name:"Ben & Jerry's",brand:"Ben & Jerry's",category:"Food And Restaurants",states:["CA","CO","CT","DC","FL","GA","HI","IL","ME","MD","MA","MI","MN","MS","MO","NV","NH","NJ","NY","NC","OH","OR","PA","RI","SC","TN","TX","VT","VA","WA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/78d1f5e9-8dd8-4f21-a139-05bc25282b13.png",price:"55% off",denominations:"$5, $10, $15"},
{key:"sgc017",name:"Biscuit's Cafe",brand:"Biscuit's Cafe",category:"Food And Restaurants",states:["AZ","OR","WA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/0068b478-81be-4145-a83d-dedc2e33272a.png",price:"45% off",denominations:"$15, $20, $25, $30, $40, $50"},
{key:"sgc018",name:"Black Angus Steakhouse",brand:"Black Angus Steakhouse",category:"Food And Restaurants",states:["AK","AZ","CA","HI","NM","WA"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/da1bdb33-e8d5-4a86-862b-8bcdbd717fd7.png",price:"55% off",denominations:"$25, $50"},
{key:"sgc019",name:"Bloomin Brands (aussie Grill, Outback Steakhouse, Carrabba's, Fleming's Steakhouse, Bonefish Grill)",brand:"Bloomin Brands (aussie Grill, Outback Steakhouse, Carrabba's, Fleming's Steakhouse, Bonefish Grill)",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Best Selling","PIN","PDF","Online","In-Store"],image:"https://spawngc.gg/media/images/06115478-3e71-4975-8333-bf1e1a6b43f8.png",price:"30% off",denominations:"$20"},
{key:"sgc020",name:"Blue Martini Lounge",brand:"Blue Martini Lounge",category:"Food And Restaurants",states:["AZ","FL","GA","LA","NV"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/7ef6bf21-5803-4b93-b9ac-50f6dcbcd4e5.png",price:"55% off",denominations:"$25, $30, $40, $50, $60, $70, $90, $100"},
{key:"sgc021",name:"Bob Evans",brand:"Bob Evans",category:"Food And Restaurants",states:["AL","AR","DE","FL","IN","IA","KS","KY","MD","MA","MI","MS","MO","NJ","NY","NC","OH","PA","SC","TN","TX","VA","WV"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/aa9df2a3-9f8e-404f-82d9-394b51d1f5cb.png",price:"50% off",denominations:"$25, $50"},
{key:"sgc022",name:"Bricktop's + The River House",brand:"Bricktop's + The River House",category:"Food And Restaurants",states:["AL","FL","MO","NC","TN"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/b03f4f2c-6601-48bc-8be6-0c158751365f.png",price:"40% off",denominations:"$25, $30, $40, $50, $60, $70, $80, $90, $100, $120, $150"},
{key:"sgc023",name:"Buca Di Beppo (bravo/brio, Bertucci's)",brand:"Buca Di Beppo (bravo/brio, Bertucci's)",category:"Food And Restaurants",states:["AZ","CA","CO","DC","FL","GA","IL","IN","KY","MD","MI","MN","MO","NV","NJ","NM","NY","NC","OH","PA","TN","TX","UT"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/f2b92853-8503-402f-8efa-91306420f7ef.png",price:"50% off",denominations:"$25"},
{key:"sgc024",name:"Buffalo Wild Wings",brand:"Buffalo Wild Wings",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/7189b5d2-3a67-4820-a9a6-e84a602af1d5.png",price:"35% off",denominations:"$5, $10, $15, $20, $25"},
{key:"sgc025",name:"Burger Lounge",brand:"Burger Lounge",category:"Food And Restaurants",states:["CA","NV"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/c9674478-8e5b-4bde-9d87-b8180ad4b971.png",price:"40% off",denominations:"$5, $10, $15, $20, $25, $30, $40, $50, $60, $70, $80, $90, $100, $110, $120, $130, $140, $150, $170, $180, $200, $210, $220, $250, $270, $290, $300, $310, $350, $360, $400, $420, $450"},
{key:"sgc026",name:"Burgerfi",brand:"Burgerfi",category:"Food And Restaurants",states:["AL","AK","AZ","CA","CO","FL","GA","IL","IN","KY","MD","NV","NJ","NC","OH","TN","TX","VT","VA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/9211a695-e913-4b4d-9484-fffc0be7db3b.png",price:"55% off",denominations:"$5, $10, $15, $20, $25, $30, $50, $200, $500, $1030, $2000"},
{key:"sgc027",name:"Cafe Rio Mexican Grill",brand:"Cafe Rio Mexican Grill",category:"Food And Restaurants",states:["AZ","CA","CO","DC","ID","MD","MT","NV","VA","WA","WY"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/226a039b-7d93-4970-8a2a-cc251063d786.png",price:"45% off",denominations:"$10, $15, $20, $25, $30, $40, $50, $60, $70, $80, $90, $100, $110, $120, $130, $140, $150, $160, $170, $180, $190, $200"},
{key:"sgc028",name:"California Pizza Kitchen [CPK]",brand:"California Pizza Kitchen [CPK]",category:"Food And Restaurants",states:["AL","AZ","CA","CO","CT","DC","FL","GA","HI","IL","IN","IA","KS","KY","LA","MD","MA","MI","MN","MO","NE","NV","NJ","NM","NY","NC","OH","OR","PA","TN","TX","UT","VA","WA","WI"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/e0be7557-6aac-49b1-94a7-d103d1d6dc19.png",price:"39% off",denominations:"$5, $10, $15, $100, $250, $370, $500"},
{key:"sgc029",name:"Captain D's Seafood",brand:"Captain D's Seafood",category:"Food And Restaurants",states:["AL","AR","CO","FL","GA","IL","IN","KS","KY","LA","MI","MS","MO","NM","NC","OH","OK","SC","TN","TX","VA","WV"],availability:["In Stock","PDF","Online","In-Store"],image:"https://spawngc.gg/media/images/914acf9c-30f2-4aea-bbde-3cc9b8d0993e.png",price:"45% off",denominations:"$5, $10, $15, $20, $25"},
{key:"sgc030",name:"Caribou Coffee",brand:"Caribou Coffee",category:"Food And Restaurants",states:["CO","FL","GA","IL","IN","IA","KS","MI","MN","MO","NE","NC","ND","OH","OK","SC","SD","TX","WI","WY"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/6044fc53-c48b-475a-8645-c1faba758a9e.png",price:"50% off",denominations:"$10, $15, $20, $25, $30, $40, $50, $60, $70, $80, $90, $100, $200"},
{key:"sgc031",name:"Cheba Hut",brand:"Cheba Hut",category:"Food And Restaurants",states:["AZ","CA","CO","FL","GA","IL","LA","NV","NM","OH","OR","TX","WI"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/4aa49572-3a34-454f-9a1c-2cebe969a888.png",price:"50% off",denominations:"$5, $10"},
{key:"sgc032",name:"Chicken Salad Chick",brand:"Chicken Salad Chick",category:"Food And Restaurants",states:["AL","AR","FL","GA","IL","KY","LA","MS","MO","NC","OH","OK","SC","TX","VA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/5fefc6dc-302c-40d4-a015-ee07df2fc8b3.png",price:"55% off",denominations:"$10"},
{key:"sgc033",name:"Chuy's Tex-mex",brand:"Chuy's Tex-mex",category:"Food And Restaurants",states:["AL","AR","CO","FL","GA","IL","IN","KS","KY","MO","NC","OH","OK","SC","TN","TX","VA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/d8e633d3-a043-4800-aa70-dcfbe2627aef.png",price:"40% off",denominations:"$25, $30, $40, $50, $60, $70, $100"},
{key:"sgc034",name:"Clean Plate Restaurant Group [Zest, Sono, Lola’s Burger & Tequila Bar, Lola’s Burrito & Burger Joint, Moon Dog Pie House, Carmine’s Pie House, Marketplace Grill, North End Kitchen & Bar, Malibu Beach Grill]",brand:"Clean Plate Restaurant Group [Zest, Sono, Lola’s Burger & Tequila Bar, Lola’s Burrito & Burger Joint, Moon Dog Pie House, Carmine’s Pie House, Marketplace Grill, North End Kitchen & Bar, Malibu Beach Grill]",category:"Food And Restaurants",states:["AR","FL","GA","NC"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/c107d51a-8eb9-4f44-b246-4c4376a9c60f.png",price:"55% off",denominations:"$5, $10, $15, $20, $25, $30, $40, $50, $60, $70, $80, $100, $110, $200, $400, $440, $450"},
{key:"sgc035",name:"Condado Tacos",brand:"Condado Tacos",category:"Food And Restaurants",states:["AL","IN","KY","MI","MO","NC","OH","PA","SC","TN"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/241f5b04-f2a4-41bf-875c-812030717d45.png",price:"40% off",denominations:"$25, $50, $70, $100, $150, $200"},
{key:"sgc036",name:"Cooper's Hawk Winery & Restaurant",brand:"Cooper's Hawk Winery & Restaurant",category:"Food And Restaurants",states:["AZ","FL","IL","IN","MD","MI","MO","OH","VA","WI"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/46fcbbf7-aa9a-4855-8ea1-76832f5477ea.png",price:"45% off",denominations:"$20, $25, $30, $40, $50, $60, $70, $100"},
{key:"sgc037",name:"Cowboy Chicken",brand:"Cowboy Chicken",category:"Food And Restaurants",states:["GA","LA","OK","TX"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/14aff97c-4b52-4706-a6d5-45550601b7e5.png",price:"40% off",denominations:"$25, $30, $40, $50, $80, $90, $100, $170, $190, $200, $270, $300, $460"},
{key:"sgc038",name:"Cracker Barrel",brand:"Cracker Barrel",category:"Food And Restaurants",states:["AL","AZ","AR","CA","CO","CT","DE","FL","GA","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VA","WV","WI"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/8fe46634-a9ac-4174-855d-be52a24a287c.png",price:"45% off",denominations:"$10, $15, $20, $25, $30, $40"},
{key:"sgc039",name:"Del Frisco's (landry's) 600x GCS",brand:"Del Frisco's (landry's) 600x GCS",category:"Food And Restaurants",states:["CA","DC","FL","GA","MA","NV","NY","NC","PA","TX"],availability:["In Stock","PDF","Pass2U","In-Store"],image:"https://spawngc.gg/media/images/c3b08a60-37af-4ba7-9e48-60ed8d03a6db.png",price:"36% off",denominations:"$50, $70, $100"},
{key:"sgc040",name:"Denny's",brand:"Denny's",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/2c4081fc-c335-4dab-abac-7e7b99d23b08.png",price:"40% off",denominations:"$25, $50, $100"},
{key:"sgc041",name:"Dickey's Barbecue Pit",brand:"Dickey's Barbecue Pit",category:"Food And Restaurants",states:["AL","AZ","AR","CA","CO","DE","FL","GA","HI","ID","IL","IN","KS","KY","LA","MI","MN","MS","MO","MT","NE","NV","NJ","NM","NY","NC","ND","OH","OK","OR","PA","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/bb5fdc11-e0c9-404f-9392-c28a7c846ea5.png",price:"50% off",denominations:"$5, $10, $15, $20, $25, $30, $40, $50, $60, $70, $100, $150, $180, $200"},
{key:"sgc042",name:"Din Tai Fung",brand:"Din Tai Fung",category:"Food And Restaurants",states:["CA","NV","NY","OR","WA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/989afe6f-f4ee-4a3d-b29c-93ee2bee5a40.png",price:"35% off",denominations:"$50, $60, $70, $80, $90, $100, $110, $120, $150"},
{key:"sgc043",name:"Dion's",brand:"Dion's",category:"Food And Restaurants",states:["CO","NM","TX"],availability:["In Stock","PIN","PDF"],image:"https://spawngc.gg/media/images/52d15d91-8c26-4fcc-b540-f23668373594.png",price:"40% off",denominations:"$5, $10, $15, $20, $25, $200, $250, $320"},
{key:"sgc044",name:"Dog Haus",brand:"Dog Haus",category:"Food And Restaurants",states:["AZ","CA","CO","CT","FL","IL","IN","MD","MA","MO","NV","NY","TX","UT","VA","WV","WY"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/1d5b0a19-30a3-4e45-bcb9-d9fd9368de72.png",price:"50% off",denominations:"$5, $10, $15, $20, $25"},
{key:"sgc045",name:"Duffy's Mvp Grill",brand:"Duffy's Mvp Grill",category:"Food And Restaurants",states:["FL"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/0ad80195-4f75-4524-9377-0a7a88e0f0f8.png",price:"40% off",denominations:"$5, $10, $15, $20, $25, $30, $40"},
{key:"sgc046",name:"Dunkin & Baskin [Semi-Permanent]",brand:"Dunkin & Baskin [Semi-Permanent]",category:"Food And Restaurants",states:["AL","AZ","AR","CA","CO","CT","DE","DC","FL","GA","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","PA","RI","SC","TN","TX","UT","VT","VA","WV","WI"],availability:["In Stock","PIN","PDF","In-Store"],image:"https://spawngc.gg/media/images/9bf795fd-f8c2-46b5-a569-ef21e45c3b0c.png",price:"35% off",denominations:"$110"},
{key:"sgc047",name:"Dutch Bros Coffee",brand:"Dutch Bros Coffee",category:"Food And Restaurants",states:["AL","AZ","CA","CO","ID","KS","NV","OK","OR","TX","WA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/d1d649b6-8f13-45b4-8cbf-2447a3b58780.png",price:"40% off",denominations:"$5, $10"},
{key:"sgc048",name:"Einstein's Bros Bagels",brand:"Einstein's Bros Bagels",category:"Food And Restaurants",states:["AL","AZ","AR","CA","CO","CT","DE","DC","FL","GA","ID","IL","IN","IA","KS","KY","LA","MD","MA","MI","MN","MS","MO","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","SC","SD","TN","TX","UT","VT","VA","WA","WI","WY"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/28751441-3d1d-4ce1-882d-348410284259.png",price:"40% off",denominations:"$5, $10"},
{key:"sgc049",name:"Estampa Gaucha Brazilian Steakhouse",brand:"Estampa Gaucha Brazilian Steakhouse",category:"Food And Restaurants",states:["FL","NC"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/5fdc7bf6-52b1-423a-8c6d-c661d39358fa.png",price:"40% off",denominations:"$10, $15, $20, $25, $30, $40, $50, $60, $70, $80, $90, $100"},
{key:"sgc050",name:"Fifth Group Restaurants",brand:"Fifth Group Restaurants",category:"Food And Restaurants",states:["GA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/1f8f9b92-b70d-4d76-a761-aee6607a0ec3.png",price:"50% off",denominations:"$50, $60, $70, $80, $90, $100, $110, $120, $130, $140, $150, $160, $180, $190, $200, $210, $220, $230, $240, $250, $270, $360, $460, $500"},
{key:"sgc051",name:"Firebirds Wood Fire Grill",brand:"Firebirds Wood Fire Grill",category:"Food And Restaurants",states:["AL","AZ","DE","FL","GA","IN","IA","KS","MD","MO","NE","NJ","NC","OH","OK","PA","SC","TN","VA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/a1b62ab7-85f1-4695-b280-342afdb628f4.png",price:"40% off",denominations:"$20, $25, $30, $40, $50, $60, $70"},
{key:"sgc052",name:"Firehouse Subs",brand:"Firehouse Subs",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","FL","GA","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VA","WA","WV","WI"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/29d6f0cd-e7cd-4c88-a1a6-34306ed990e3.png",price:"50% off",denominations:"$10, $15, $20, $25"},
{key:"sgc053",name:"First Watch",brand:"First Watch",category:"Food And Restaurants",states:[],availability:["In Stock","Best Selling","Pass2U","In-Store"],image:"https://spawngc.gg/media/images/35c20e51-2a97-4e8b-aac5-9e3f8d28b080.png",price:"55% off",denominations:"$15"},
{key:"sgc054",name:"Fogo De Chao",brand:"Fogo De Chao",category:"Food And Restaurants",states:["AZ","CA","CO","DC","FL","GA","IL","IN","LA","MD","MA","MI","MN","MO","NV","NY","OR","PA","TX","VA","WA"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/4821992c-9e43-4b23-8e30-cf9d5fde1d66.png",price:"40% off",denominations:"$25, $50"},
{key:"sgc055",name:"Grimaldi's Coal Brick-oven Pizzeria",brand:"Grimaldi's Coal Brick-oven Pizzeria",category:"Food And Restaurants",states:["AR","CA","FL","ID","KS","KY","NV","NY","SC","TX","WI"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/11192535-7958-4962-b58d-1750e0c4f9e4.png",price:"44% off",denominations:"$10, $15, $20, $25, $30, $40, $50, $60, $70, $100, $400"},
{key:"sgc056",name:"Gyu-kaku Japanese Bbq",brand:"Gyu-kaku Japanese Bbq",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/69c5965a-dc66-4845-b879-6b51190448f0.png",price:"35% off",denominations:"$5, $10, $15, $20, $25, $30, $40, $50, $60, $70, $80, $90, $100, $150"},
{key:"sgc057",name:"Hopdoddy Burger Bar",brand:"Hopdoddy Burger Bar",category:"Food And Restaurants",states:["AZ","CA","CO","FL","LA","TN"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/6148ee4a-1b21-4663-91c3-b4671883835f.png",price:"40% off",denominations:"$25, $50, $70, $100, $150, $200, $250, $300, $500"},
{key:"sgc058",name:"Hungry Howies Pizza",brand:"Hungry Howies Pizza",category:"Food And Restaurants",states:["AL","AZ","AR","CA","CO","DE","FL","GA","IN","LA","MI","MS","NV","NC","OH","OK","PA","SC","TN","TX","UT"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/5c663434-b3d8-43d8-8b6e-b3036a48cc43.png",price:"40% off",denominations:"$5, $10, $15, $20, $25, $30, $50"},
{key:"sgc059",name:"Ihop",brand:"Ihop",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/53aa4b7a-abb2-4d31-a57f-0eb1517a50db.png",price:"50% off",denominations:"$10"},
{key:"sgc060",name:"Jason's Deli",brand:"Jason's Deli",category:"Food And Restaurants",states:["AL","AZ","AR","CO","FL","GA","IL","IN","IA","KS","KY","LA","MD","MS","MO","NE","NM","NC","OH","OK","PA","SC","TN","TX","VA","WI"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/f86a6d54-3c00-4452-8ecb-917974256122.png",price:"40% off",denominations:"$10, $15, $25, $770"},
{key:"sgc061",name:"Jim 'n Nick's BBQ",brand:"Jim 'n Nick's BBQ",category:"Food And Restaurants",states:["AL","CO","FL","GA","NC","SC","TN"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/f503c3b8-0e25-4c8e-bb12-14e8fcdfdd71.png",price:"45% off",denominations:"$20, $25, $30"},
{key:"sgc062",name:"Kilwins",brand:"Kilwins",category:"Food And Restaurants",states:["AL","AR","CO","DC","FL","GA","IL","IN","MD","MA","MI","MS","NH","NJ","NY","NC","OH","PA","RI","SC","TN","TX","VA","WI"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/61c896bb-af7f-40d4-b3a0-a71085367c39.png",price:"45% off",denominations:"$10, $15, $20, $25, $30"},
{key:"sgc063",name:"Kona Grill",brand:"Kona Grill",category:"Food And Restaurants",states:["AL","AZ","CO","FL","GA","ID","IL","IN","MD","MI","MN","MO","NE","NV","NJ","OH","TX"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/1ec61cbe-fb97-45db-9053-fe86fb7c6d61.png",price:"40% off",denominations:"$10, $15, $20, $25, $30, $40, $50"},
{key:"sgc064",name:"Krispy Kreme Doughnuts Rewards Cards",brand:"Krispy Kreme Doughnuts Rewards Cards",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/b6b2293a-2c96-4915-8152-e6aa728aeeab.png",price:"46% off",denominations:"$5, $10, $15, $20, $25, $30, $40, $50, $60, $70, $80, $90, $100"},
{key:"sgc065",name:"Kung Fu Tea",brand:"Kung Fu Tea",category:"Food And Restaurants",states:["CA","CO","FL","GA","IN","MD","MI","NJ","OR","PA","TX","WA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/06b7c996-5310-4c3c-bb9a-d63709b82d93.png",price:"39% off",denominations:"$10, $25, $30, $50, $100"},
{key:"sgc066",name:"Landry's Restaurants",brand:"Landry's Restaurants",category:"Food And Restaurants",states:["AL","AZ","AR","CA","CO","DE","DC","FL","GA","HI","ID","IL","IN","KY","LA","MD","MA","MI","MN","MS","MO","NV","NJ","NY","NC","OH","OK","OR","PA","PR","RI","SC","TN","TX","VA","WI"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/27abe7ae-2dd7-4c5a-96c4-b25776318c65.png",price:"43% off",denominations:"$25, $30, $40, $50, $60, $70, $80, $90, $100, $110, $120, $130, $140, $150, $160, $170, $180, $190, $200, $210, $220, $230, $240, $250, $260, $270, $280, $290, $300, $310, $320, $330, $340, $350, $370, $380, $390, $400, $410, $490, $500, $670, $680, $750, $800, $1000, $1100, $1120, $2000, $2500, $2820, $2890, $4750"},
{key:"sgc067",name:"Lazy Dog",brand:"Lazy Dog",category:"Food And Restaurants",states:["CA","CO","GA","IL","NV","TX","VA"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/b13eb23d-84c0-4bec-a942-480059f68608.png",price:"40% off",denominations:"$5, $10, $15, $20, $25, $30, $40, $50"},
{key:"sgc068",name:"Lucille's Smokehouse Bbq",brand:"Lucille's Smokehouse Bbq",category:"Food And Restaurants",states:["AZ","CA","NV"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/e1b2977e-c683-4d32-9ad3-04de3fa5a6c6.png",price:"44% off",denominations:"$5, $10, $15, $20, $25, $30, $40, $50, $60, $70, $80, $90, $100, $130, $150, $160"},
{key:"sgc069",name:"Lupe Tortilla",brand:"Lupe Tortilla",category:"Food And Restaurants",states:["TX"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/44f679f9-72f1-4e4f-b4da-0f58de256a97.png",price:"55% off",denominations:"$20, $25, $30, $40, $50"},
{key:"sgc070",name:"Mellow Mushroom Pizza",brand:"Mellow Mushroom Pizza",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","PIN","PDF","In-Store"],image:"https://spawngc.gg/media/images/4ae6e26f-b9f1-4867-a19d-ae84516cacb1.png",price:"40% off",denominations:"$5, $10, $15, $20, $25, $30, $50"},
{key:"sgc071",name:"Menchie's Frozen Yogurt (REQUIRED: Check Balance Online)",brand:"Menchie's Frozen Yogurt (REQUIRED: Check Balance Online)",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","FL","GA","HI","IL","IN","IA","KY","LA","MD","MA","MI","MN","MS","MO","NV","NM","NY","NC","OH","OK","OR","PA","SC","TN","TX","UT","VA","WA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/4595bcf3-9d2e-4371-897c-de50b5c76717.png",price:"45% off",denominations:"$5, $10"},
{key:"sgc072",name:"Nando's Peri Peri",brand:"Nando's Peri Peri",category:"Food And Restaurants",states:["DC","IL","MD","VA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/824959c4-df4e-4258-8b6c-010b6e4f137f.png",price:"45% off",denominations:"$25, $50, $100"},
{key:"sgc073",name:"Nautical Bowls",brand:"Nautical Bowls",category:"Food And Restaurants",states:["AZ","FL","IL","MI","MN","MO","NC","ND","PA","SC","SD","TX","UT","VA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/5591cf4d-32a8-46db-9ea0-5038b415d01e.png",price:"40% off",denominations:"$5, $10, $15, $20, $25, $30, $40, $50, $100"},
{key:"sgc074",name:"Noodles & Company",brand:"Noodles & Company",category:"Food And Restaurants",states:["AZ","CA","CO","CT","FL","ID","IL","IN","IA","KS","KY","MD","MI","MN","MO","NE","NY","NC","ND","OH","OR","PA","SD","TN","UT","VA","WA","WI"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/8bcc1b04-bb68-4c00-825d-e34002eed4ec.png",price:"45% off",denominations:"$25, $30, $40, $50, $60, $70, $80, $90, $100, $110, $130, $150, $200"},
{key:"sgc075",name:"Panera Bread",brand:"Panera Bread",category:"Food And Restaurants",states:["AL","AZ","AR","CA","CO","CT","DE","FL","GA","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/cf904835-9c6a-4bab-909c-9f40e2a2935b.png",price:"40% off",denominations:"$5, $10, $15, $20, $25"},
{key:"sgc076",name:"Pdq Restaurant",brand:"Pdq Restaurant",category:"Food And Restaurants",states:["FL","NJ","NY","NC","SC"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/cbd4fda1-0b7f-486b-9d03-ff33c0fcc289.png",price:"40% off",denominations:"$10, $200, $250"},
{key:"sgc077",name:"Peet's Coffee & Tea",brand:"Peet's Coffee & Tea",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/86703028-27a5-45c0-8104-43e45d90f1a8.png",price:"45% off",denominations:"$25, $50, $70"},
{key:"sgc078",name:"Pei Wei (USE ONLINE)",brand:"Pei Wei (USE ONLINE)",category:"Food And Restaurants",states:["AZ","AR","CA","CO","FL","IL","IN","KS","MD","MI","MN","NV","NJ","NC","OH","OK","RI","TN","TX","UT","VA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/fb489207-f958-4cb0-a090-73cb74a48033.png",price:"50% off",denominations:"$25"},
{key:"sgc079",name:"Penn Station Subs",brand:"Penn Station Subs",category:"Food And Restaurants",states:["GA","IL","IN","KS","KY","MI","MO","NC","OH","PA","SC","TN","TX","VA","WV"],availability:["In Stock","PIN","PDF","Online","In-Store"],image:"https://spawngc.gg/media/images/c8ee9878-0d2b-4680-b37f-227d30887a8d.png",price:"50% off",denominations:"$5, $10, $15, $20, $25, $30, $50, $100"},
{key:"sgc080",name:"Pf Chang's China Bistro",brand:"Pf Chang's China Bistro",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/78c8dbe5-5fba-415c-8d88-a5bfb909ea3f.png",price:"50% off",denominations:"$20, $25, $30, $40, $50, $60, $70, $80, $90, $100, $110, $120, $130, $140, $150, $160, $170, $180, $200, $250, $300, $360, $400, $500"},
{key:"sgc081",name:"Piada Italian Street Food",brand:"Piada Italian Street Food",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/aa9500a7-b3fd-40ed-9ae3-809ea236e197.png",price:"40% off",denominations:"$20, $25, $500"},
{key:"sgc082",name:"Portillo's",brand:"Portillo's",category:"Food And Restaurants",states:["AZ","CA","FL","IL","IN","WI"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/cf04c53f-36b9-4575-bea1-fd7bb8315a57.png",price:"40% off",denominations:"$10, $15, $20, $25, $30, $40, $50, $60, $70, $80, $90, $100"},
{key:"sgc083",name:"Potbelly Sandwich",brand:"Potbelly Sandwich",category:"Food And Restaurants",states:["AZ","AR","CO","CT","DC","IL","IN","IA","KS","KY","MD","MA","MI","MN","OR","PA","SD","TX","UT","VA","WA","WI"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/243fc9d6-4333-4c3a-81b8-9ebceff886e9.png",price:"55% off",denominations:"$10, $15, $20, $25, $30, $40, $50, $100, $290, $460"},
{key:"sgc084",name:"Quality Branded Restaurants (quality Italian, Quality Meats, Quality Bistro, Don Angie, Zou Zou's, Smith & Wollensky, Kini's, Cretans, Chez Roc, Bad Romam)",brand:"Quality Branded Restaurants (quality Italian, Quality Meats, Quality Bistro, Don Angie, Zou Zou's, Smith & Wollensky, Kini's, Cretans, Chez Roc, Bad Romam)",category:"Food And Restaurants",states:["CA","FL","NY"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/a1a15cb9-7209-4805-9a41-9b8bdb895c64.png",price:"40% off",denominations:"$25, $30, $40, $50, $60, $70, $80, $90, $100, $110, $120, $130, $140, $150, $160, $170, $180, $190, $200, $210, $220, $230, $240, $250, $260, $280, $290, $300, $310, $320, $350, $360, $370, $400, $480, $500"},
{key:"sgc085",name:"Rock & Brews",brand:"Rock & Brews",category:"Food And Restaurants",states:["CA","FL","KS","MO","TX"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/f0cad124-00ce-404d-8234-ba1cb00a333a.png",price:"40% off",denominations:"$25"},
{key:"sgc086",name:"Romano's Macaroni Grill",brand:"Romano's Macaroni Grill",category:"Food And Restaurants",states:["AZ","CA","CO","FL","GA","HI","IL","ME","NV","OH","PA","TN","TX","UT","VA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/dceae8ef-8d0c-4cbb-b32b-224083bb705e.png",price:"55% off",denominations:"$25, $50"},
{key:"sgc087",name:"Ruby Tuesday",brand:"Ruby Tuesday",category:"Food And Restaurants",states:["FL","GA","IN","MD","MO","NC","OH","PA","SC","TN","VA"],availability:["In Stock","PDF","Online","In-Store"],image:"https://spawngc.gg/media/images/d4414444-8a97-4675-8a21-a77b946edbd6.png",price:"50% off",denominations:"$5, $10, $15, $20, $25, $30, $50"},
{key:"sgc088",name:"Ruth's Chris",brand:"Ruth's Chris",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/54eac716-b8bb-47f7-9546-74cd04ac63e6.png",price:"40% off",denominations:"$25, $30, $40, $50, $100"},
{key:"sgc089",name:"Salad And Go",brand:"Salad And Go",category:"Food And Restaurants",states:["AZ","TX"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/04ce2294-ffb9-46b1-8774-b606c72fb5fe.png",price:"50% off",denominations:"$15, $20, $25, $30, $40, $50, $60, $70, $80"},
{key:"sgc090",name:"Santiago's",brand:"Santiago's",category:"Food And Restaurants",states:["CO"],availability:["In Stock","PDF"],image:"https://spawngc.gg/card.png",price:"45% off",denominations:"$10, $15, $20, $25, $30, $40, $50, $70, $80, $90, $100"},
{key:"sgc091",name:"Sizzler",brand:"Sizzler",category:"Food And Restaurants",states:["AZ","CA","ID","NV","NM","OR","UT","WA"],availability:["In Stock","Pass2U","In-Store"],image:"https://spawngc.gg/media/images/ba7b4040-61c6-4497-afe6-a2d7e81ed2d1.png",price:"55% off",denominations:"$10, $15, $20, $25"},
{key:"sgc092",name:"Smashburger",brand:"Smashburger",category:"Food And Restaurants",states:["AL","AZ","AR","CA","CO","CT","DC","FL","ID","IL","IN","IA","KS","KY","LA","MD","MA","MI","MN","MO","NV","NJ","NY","NC","ND","OH","OK","PA","RI","SC","TX","UT","VA","WA"],availability:["In Stock","Best Selling","PIN","PDF","Online","In-Store"],image:"https://spawngc.gg/media/images/a75466e6-4305-46ad-a8f9-39989ae45226.png",price:"55% off",denominations:"$5, $10"},
{key:"sgc093",name:"Smith & Wollensky [Excludes NYC]",brand:"Smith & Wollensky [Excludes NYC]",category:"Food And Restaurants",states:["FL","IL","MA","NV","OH"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/e4443589-f77b-4ac3-a665-d9824c894c8c.png",price:"40% off",denominations:"$5, $10, $15, $20, $25, $30, $40, $50, $60, $70, $80, $90, $100, $110, $120, $130, $140, $150, $160, $170, $180, $190, $200, $210, $220, $240, $250, $260, $290, $300, $340, $350, $400, $450, $500, $900"},
{key:"sgc094",name:"Snooze Am Eatery",brand:"Snooze Am Eatery",category:"Food And Restaurants",states:["AZ","CA","CO","GA","MO","NC","TX"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/fce20082-22d9-4af4-b212-58b04fd758a9.png",price:"50% off",denominations:"$10, $25, $50"},
{key:"sgc095",name:"Spb Hospitality Group (a1a Ale Works, Big River Grill, Chophouse & Brewery, Gordon Biersch, Logan's Roadhouse, Stoney River, Ragtime Tavern, Redlands Grill, Rock Bottom, Merus Grill, Old Chicago Pizza)",brand:"Spb Hospitality Group (a1a Ale Works, Big River Grill, Chophouse & Brewery, Gordon Biersch, Logan's Roadhouse, Stoney River, Ragtime Tavern, Redlands Grill, Rock Bottom, Merus Grill, Old Chicago Pizza)",category:"Food And Restaurants",states:["AL","AR","CA","CO","FL","GA","ID","IL","IN","IA","KS","KY","LA","MD","MA","MI","MN","MS","MO","MT","NE","NV","NC","OH","OK","OR","PA","SC","SD","TN","TX","VA","WV","WI","WY"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/4ec51b40-e9f6-4750-8107-956052bd5b0c.png",price:"40% off",denominations:"$25, $50"},
{key:"sgc096",name:"St Elmo Steak House",brand:"St Elmo Steak House",category:"Food And Restaurants",states:["IN"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/84f705c0-cf34-48dd-ae16-6cfd6633e39f.png",price:"40% off",denominations:"$20, $25, $30, $40, $50, $60, $70, $80, $90, $100, $120, $140, $150, $200, $250, $280"},
{key:"sgc097",name:"Starr Restaurants",brand:"Starr Restaurants",category:"Food And Restaurants",states:["PA"],availability:["In Stock","PIN","PDF","In-Store"],image:"https://spawngc.gg/media/images/0fab58c1-32e2-4796-865b-083cfe29869a.png",price:"39% off",denominations:"$5, $10, $15, $20, $25, $30, $40, $50, $60, $70, $80, $90, $100, $110, $120, $130, $140, $150, $160, $170, $180, $190, $200, $220, $230, $240, $250, $270, $280, $290, $300, $340, $350, $500, $540, $1000, $4000"},
{key:"sgc098",name:"Stk Steakhouse",brand:"Stk Steakhouse",category:"Food And Restaurants",states:["AZ","CA","CO","FL","GA","IL","NV","NY","PR","TN","TX","WA"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/e1aab810-b6b3-462a-9fd8-a9a9715d82f8.png",price:"40% off",denominations:"$20, $30, $50, $60, $70, $100"},
{key:"sgc099",name:"T S Restaurants",brand:"T S Restaurants",category:"Food And Restaurants",states:["CA","HI"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/618c5a6e-ce70-45aa-a023-34856b5cec7b.png",price:"40% off",denominations:"$25, $30, $40, $50, $60, $70, $80, $90, $100, $110, $120, $130, $150, $170, $180, $190, $200, $230, $250, $300, $310, $330, $340, $430, $440, $450"},
{key:"sgc100",name:"Tap42 Craft Kitchen & Bar",brand:"Tap42 Craft Kitchen & Bar",category:"Food And Restaurants",states:["FL"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/03a53d73-08d0-44c1-8472-db4186a4ab3c.png",price:"40% off",denominations:"$5, $10, $15, $20, $25, $30, $40, $50, $60, $70, $100"},
{key:"sgc101",name:"Tender Greens",brand:"Tender Greens",category:"Food And Restaurants",states:["CA","MA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/38b89a2d-d7e0-4739-bfe0-50e286c0d514.png",price:"45% off",denominations:"$5, $10, $15, $20, $25, $30, $40, $50, $60, $70, $80, $90, $100, $110, $120, $130, $140, $150, $160, $170, $180, $200, $220, $230, $240, $250, $260, $270, $300, $320, $340, $360, $370, $380, $390, $400, $410, $420, $440, $450, $460, $470, $480, $490, $500"},
{key:"sgc102",name:"Texas Roadhouse & Bubba's 33",brand:"Texas Roadhouse & Bubba's 33",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WV","WI","WY"],availability:["In Stock","Best Selling","PIN","PDF","Online","In-Store"],image:"https://spawngc.gg/media/images/d253cb23-475b-4d0f-b578-5b9a416c7a01.png",price:"23% off",denominations:"$5, $10, $15, $20, $25, $30"},
{key:"sgc103",name:"Tgi Friday's",brand:"Tgi Friday's",category:"Food And Restaurants",states:["AL","AZ","AR","CA","CO","CT","DE","FL","GA","ID","IL","IN","KY","LA","MD","MA","MI","MO","NV","NH","NJ","NY","NC","OH","OK","PA","SC","TN","TX","VA","WV","WI"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/71ee7b65-1327-4246-b855-bf3fbd6a707d.png",price:"47% off",denominations:"$25"},
{key:"sgc104",name:"The Honey Baked Ham",brand:"The Honey Baked Ham",category:"Food And Restaurants",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/9c303e9a-8b4f-445f-97c2-9058c080bb7b.png",price:"45% off",denominations:"$25, $30, $50"},
{key:"sgc105",name:"The Indigo Road Hospitality Group",brand:"The Indigo Road Hospitality Group",category:"Food And Restaurants",states:["DC","GA","NC","SC","TN","VA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/3cd2ca5b-df80-48cf-b742-4b2d67ccee56.png",price:"50% off",denominations:"$20, $25, $30, $40, $50, $60, $70, $80, $90, $100, $110, $120, $130, $140, $150, $160, $170, $180, $200, $210, $220, $230, $240, $250, $400, $500"},
{key:"sgc106",name:"Tony Roma's",brand:"Tony Roma's",category:"Food And Restaurants",states:["CA","FL","NV","NC"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/649b5c68-63e0-485c-806d-814b166b6bda.png",price:"40% off",denominations:"$25, $30, $40, $50, $60, $70, $100, $120, $150, $170, $190, $250, $280"},
{key:"sgc107",name:"Toojay's Deli",brand:"Toojay's Deli",category:"Food And Restaurants",states:["FL"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/6c42e41a-d22b-4484-8eda-7238f6ebb6d7.png",price:"50% off",denominations:"$10, $15, $20, $25, $30, $50, $190, $390, $470"},
{key:"sgc108",name:"Torchy's Tacos",brand:"Torchy's Tacos",category:"Food And Restaurants",states:["AR","CO","KS","LA","MO","OK","TX"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/df0d2fb1-9f3f-4e21-9004-86b2589e4318.png",price:"45% off",denominations:"$5, $10, $15, $20, $25"},
{key:"sgc109",name:"Tropical Smoothie Cafe",brand:"Tropical Smoothie Cafe",category:"Food And Restaurants",states:["AL","AZ","AR","CA","CO","CT","DE","DC","FL","GA","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO"],availability:["In Stock","Best Selling","PIN","PDF","In-Store"],image:"https://spawngc.gg/media/images/44a74d2c-8770-4ba8-9b07-300adb4c0f1e.png",price:"35% off",denominations:"$5, $10"},
{key:"sgc110",name:"True Food Kitchen",brand:"True Food Kitchen",category:"Food And Restaurants",states:["AZ","CA","CO","FL","GA","IL","LA","MD","MO","NV","NJ","NY","OH","PA","TN","TX","VA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/0cbdb7b4-6ad1-4961-aa5f-a7aec07ac861.png",price:"55% off",denominations:"$10, $15, $25"},
{key:"sgc111",name:"Twin Peaks",brand:"Twin Peaks",category:"Food And Restaurants",states:["AL","AZ","AR","CA","CO","FL","GA","ID","IL","IN","IA","KS","KY","LA","MI","MS","MO","NV","NM","NC","ND","OH","OK","SC","TN","TX","WA"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/1e227d74-324a-4b6e-95de-f5fafd9c2caa.png",price:"40% off",denominations:"$25, $30, $40, $50, $60, $70, $100, $480, $500"},
{key:"sgc112",name:"Uncle Julio's",brand:"Uncle Julio's",category:"Food And Restaurants",states:["CO","FL","IL","MD","MO","NJ","NC","OK","TN","TX","VA","WI"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/3890671a-ebbb-4c8f-8169-36dc1034fc2e.png",price:"40% off",denominations:"$25"},
{key:"sgc113",name:"Uno Pizzeria & Grill",brand:"Uno Pizzeria & Grill",category:"Food And Restaurants",states:["CO","DC","FL","IL","IN","ME","MD","MA","MI","NH","NJ","NY","OH","PA","RI","SC","VT","VA","WI"],availability:["In Stock","PDF","Online","In-Store"],image:"https://spawngc.gg/media/images/b2bcebeb-ee43-4246-bd6c-dd3fb27bb8fc.png",price:"45% off",denominations:"$5, $10, $25"},
{key:"sgc114",name:"Velvet Taco",brand:"Velvet Taco",category:"Food And Restaurants",states:["GA","IL","TX"],availability:["In Stock","PDF","Online","In-Store"],image:"https://spawngc.gg/media/images/96f3fc64-81e9-4d18-a5b7-6bf496a9e907.png",price:"40% off",denominations:"$25, $50"},
{key:"sgc115",name:"Whataburger",brand:"Whataburger",category:"Food And Restaurants",states:["AL","AZ","AR","FL","GA","LA","MS","NM","OK","TX"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/2be70573-3eb1-452b-8e8d-30a146a9c875.png",price:"45% off",denominations:"$5, $10, $20, $25, $50, $100"},
{key:"sgc116",name:"Xperience Restaurant Group (el Torito, Acapulco Mexican Restaurants, El Torito Grill, Las Brisas, Sinigual, And Who Song & Larry's)",brand:"Xperience Restaurant Group (el Torito, Acapulco Mexican Restaurants, El Torito Grill, Las Brisas, Sinigual, And Who Song & Larry's)",category:"Food And Restaurants",states:["CA","FL","IL","MD","MN","NJ","NY","SD","WA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/36d1cda4-7421-40db-a84c-89c77fa98e7e.png",price:"40% off",denominations:"$25"},
{key:"sgc117",name:"Yogurtland",brand:"Yogurtland",category:"Food And Restaurants",states:["AK","AZ","CA","CO","FL","GA","HI","IL","LA","MA","NV","NJ","NY","OK","PA","TX","UT","WA"],availability:["In Stock","PDF","In-Store"],image:"https://spawngc.gg/media/images/b6247081-f70a-4b63-bc6f-fc2222a59845.png",price:"55% off",denominations:"$15, $20"},
{key:"sgc118",name:"Zaxby's",brand:"Zaxby's",category:"Food And Restaurants",states:["AL","AR","FL","GA","IN","KS","KY","LA","MS","MO","NC","OK","SC","TN","TX","UT","VA"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/c8e42226-17bf-4ea4-9f98-fd48ac1c9ffe.png",price:"50% off",denominations:"$5, $10, $15, $25"},
{key:"sgc119",name:"Racetrac",brand:"Racetrac",category:"Gas Stations",states:["AL","AR","FL","GA","IN","KY","LA","MS","NC","OH","SC","TN","TX","VA"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/ea9c21dc-518c-4c38-8272-e4f5ac899540.png",price:"25% off",denominations:"$10, $15, $20, $25, $30, $40, $50, $70, $100, $110, $120, $140, $170, $180, $190, $200, $250"},
{key:"sgc120",name:"Sheetz",brand:"Sheetz",category:"Gas Stations",states:["MD","MI","NC","OH","PA","VA","WV"],availability:["In Stock","Best Selling","PDF"],image:"https://spawngc.gg/media/images/03bf0531-20dc-4949-bb1f-0838d855c442.png",price:"25% off",denominations:"$10, $15, $20, $25, $30, $40, $50, $60, $70, $80, $90, $100, $110, $120, $130, $140, $150, $160, $180, $200, $210, $250, $300, $410, $500"},
{key:"sgc121",name:"Speedway",brand:"Speedway",category:"Gas Stations",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Best Selling","PIN","PDF"],image:"https://spawngc.gg/media/images/91ebcd8f-a914-4c67-a885-6e3b7d76c8b0.png",price:"40% off",denominations:"$30, $35, $40, $45, $75, $100, $200, $250, $300"},
{key:"sgc122",name:"Abc Fine Wine & Spirits",brand:"Abc Fine Wine & Spirits",category:"Groceries",states:["FL"],availability:["In Stock","Best Selling","Pass2U","In-Store"],image:"https://spawngc.gg/media/images/d10de5ab-b97f-4a24-a7bc-fb31f39e8547.png",price:"38% off",denominations:"$10, $15, $20, $25, $30, $40, $50"},
{key:"sgc123",name:"Hy-vee Grocery",brand:"Hy-vee Grocery",category:"Groceries",states:["AL","IL","IN","IA","KS","KY","MN","MO","NE","SD","TN","WI"],availability:["In Stock","Best Selling","In-Store"],image:"https://spawngc.gg/media/images/931d4a36-596f-439a-b6a4-3336c0c89f83.png",price:"40% off",denominations:"$10, $15, $20, $25, $30, $40, $50, $60, $70, $80, $90, $100, $110, $120, $130, $140, $150, $160, $170, $180, $200, $210, $220, $230, $240, $250, $260, $270, $280, $300, $320, $350, $370, $410, $450, $500, $520, $600, $650, $750"},
{key:"sgc124",name:"World Market",brand:"World Market",category:"Groceries",states:["AL","AZ","CA","CO","CT","FL","GA","ID"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/cd2d6160-e198-4129-ac2a-c272afefccdd.png",price:"40% off",denominations:"$10, $15, $20, $25"},
{key:"sgc125",name:"American Girl",brand:"American Girl",category:"Retail",states:["CA","CO","DC","GA","IL","LA","MA","MN","MO","NV","NM","NY","TN","TX","WA"],availability:["In Stock","Best Selling","PDF"],image:"https://spawngc.gg/media/images/7eed5165-9cbb-47f5-891a-3b47b403dbb8.png",price:"45% off",denominations:"$50, $60, $70, $80, $90, $100, $110, $120, $130, $140, $150, $160, $170, $180, $190, $200, $210, $220, $250, $300, $350, $370, $400, $430, $470"},
{key:"sgc126",name:"Ann Taylor / Loft",brand:"Ann Taylor / Loft",category:"Retail",states:["AL","AZ","CA","CO","CT","DC","FL","GA","IL","IN","KY","LA","MD","MA","MI","MN","MO","NE","NV","NH","NJ","NY","NC","OH","OR","PA","RI","TN","TX","UT","VA","WA","WI"],availability:["In Stock","Best Selling"],image:"https://spawngc.gg/media/images/9c650412-98e5-4196-9ef3-82371bb1e6ba.png",price:"44% off",denominations:"$50, $60, $70"},
{key:"sgc127",name:"Arc'teryx",brand:"Arc'teryx",category:"Retail",states:["CA","CO","DC","IL","MD","MA","MN","NJ","NY","OR","UT","VA","WA"],availability:["In Stock","Best Selling","Pass2U","In-Store"],image:"https://spawngc.gg/media/images/1441617d-ea9d-47b1-ba35-4106acff89e2.png",price:"40% off",denominations:"$50, $60, $70, $80, $90, $100, $110, $120, $130, $140, $150, $160, $170, $180, $190, $200, $210, $220, $230, $240, $260, $270, $280, $290, $310, $320, $330, $360, $370, $380, $390, $410, $420, $440, $470, $550, $580, $590, $610, $640, $660"},
{key:"sgc128",name:"Burlington Coat Factory",brand:"Burlington Coat Factory",category:"Retail",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","ID","IL","IN","IA","KS","KY","LA","MD","MA","MI","MN","MS","MO","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VA","WA","WV","WI"],availability:["In Stock","Best Selling","PDF"],image:"https://spawngc.gg/media/images/50ba44b2-d8a4-4db2-9e0b-5f460c527b98.png",price:"45% off",denominations:"$25"},
{key:"sgc129",name:"Carhartt",brand:"Carhartt",category:"Retail",states:["CT","FL","ID","IL","IN","ME","MD","MA","MI","MN","MO","NE","NJ","NY","OH","OR","PA","TN","TX","UT","VA","WA","WI"],availability:["In Stock","Best Selling","PDF"],image:"https://spawngc.gg/media/images/2dc5979a-b4cb-488e-b7b3-460d3354131c.png",price:"44% off",denominations:"$5, $40, $50, $60, $70, $80, $90, $100"},
{key:"sgc130",name:"Designer Shoe Wholesale (dsw)",brand:"Designer Shoe Wholesale (dsw)",category:"Retail",states:["AL","AZ","AR","CA","CO","CT","DE","DC","FL","GA","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","NE","NH","NM","NC","OH","OR","RI","SD","TX","VA"],availability:["In Stock","Best Selling","PIN","PDF"],image:"https://spawngc.gg/media/images/feadbedc-96a9-48ed-9b21-eae9dd8c4ff7.png",price:"34% off",denominations:"$10, $15, $20, $25, $30, $40, $50, $60, $70, $80, $90, $100"},
{key:"sgc131",name:"Fleetfeet",brand:"Fleetfeet",category:"Retail",states:[],availability:["In Stock","Best Selling","Pass2U","In-Store"],image:"https://spawngc.gg/media/images/37b691e6-89fe-4969-907f-0183ba43a005.png",price:"40% off",denominations:"$10, $20, $25, $30, $40, $44, $46, $50"},
{key:"sgc132",name:"Kirkland's",brand:"Kirkland's",category:"Retail",states:["AL","AK","AZ","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/3fb56748-17f8-43ce-8850-13f0f5e51265.png",price:"35% off",denominations:"$10, $15, $20, $25, $30, $40, $50, $60, $70"},
{key:"sgc133",name:"Lowes",brand:"Lowes",category:"Retail",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Best Selling","PIN","PDF","Online","In-Store"],image:"https://spawngc.gg/media/images/4ce413a0-d15d-40c2-8e3f-8a03d85db964.png",price:"5% off",denominations:"$5, $10, $15, $20, $25"},
{key:"sgc134",name:"Ocean State Job Lot",brand:"Ocean State Job Lot",category:"Retail",states:[],availability:["In Stock","Best Selling","Pass2U","Online","In-Store"],image:"https://spawngc.gg/media/images/017c3bf4-1cd9-4b83-856d-8a076cbac238.png",price:"50% off",denominations:"$103, $104"},
{key:"sgc135",name:"Oriental Trading Company / Mindware.com: Educational Toys & Learning Toys For Kids & Toddlers / Fun365",brand:"Oriental Trading Company / Mindware.com: Educational Toys & Learning Toys For Kids & Toddlers / Fun365",category:"Retail",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","PIN","Online","In-Store"],image:"https://spawngc.gg/media/images/e86afe6f-4319-4917-8414-8eb35738e127.png",price:"30% off",denominations:"$5, $10, $15, $20, $25, $30, $40, $50"},
{key:"sgc136",name:"Pandora",brand:"Pandora",category:"Retail",states:["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Best Selling","Pass2U","In-Store"],image:"https://spawngc.gg/media/images/82443a8d-6f98-4a0a-92cc-a92a87eae168.png",price:"34% off",denominations:"$25, $30, $40, $50"},
{key:"sgc137",name:"Staples",brand:"Staples",category:"Retail",states:["AL","AZ","AR","CA","CO","CT","DE","FL","GA","ID","IL","IN","IA","KS","KY","ME","MD","MA","MI","MO","MT","NE","NV","NH","NJ","NM","NY","NC","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Pass2U","In-Store"],image:"https://spawngc.gg/media/images/174a6a1e-da8b-46aa-92ac-76ad3d64cc33.png",price:"15% off",denominations:"$5, $10"},
{key:"sgc138",name:"Victoria's Secret",brand:"Victoria's Secret",category:"Retail",states:["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],availability:["In Stock","Best Selling","PDF","In-Store"],image:"https://spawngc.gg/media/images/7de6fd49-b558-4523-a930-24d8d5e99a9b.png",price:"35% off",denominations:"$10, $15, $20, $25, $30, $40, $50"}
];

function GiftCardsSection() {
  const [cat, setCat] = useState("");
  const [state, setState] = useState("");
  const [avail, setAvail] = useState("");
  const [q, setQ] = useState("");
  const filtered = useMemo(() => SPAWNGC_CARDS.filter(c => {
    if (cat && c.category !== cat) return false;
    if (state && !c.states?.includes(state)) return false;
    if (avail && !c.availability.includes(avail)) return false;
    if (q && !c.name.toLowerCase().includes(q.toLowerCase()) && !c.brand.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [cat, state, avail, q]);
  return (
    <section id="buy4u-giftcards" className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-3"><span className="text-3xl">🎁</span>
        <h2 className="heading-display text-2xl font-bold uppercase tracking-tight text-white"><EditableText id="buy4u.giftcards.label" defaultValue="Gift Cards" /></h2>
      </div>
      <EditableText id="buy4u.giftcards.intro" defaultValue="Gift cards from top brands at exclusive discounts. Use the filters below to find cards by category, state, or availability. Discounts shown are off face value. DM us on Telegram to order." as="p" multiline className="text-base leading-relaxed text-white/85" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wider text-white/55">Category</span><select value={cat} onChange={e=>setCat(e.target.value)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/60"><option value="">All categories</option>{SPAWNGC_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wider text-white/55">State</span><select value={state} onChange={e=>setState(e.target.value)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/60"><option value="">All states</option>{SPAWNGC_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wider text-white/55">Availability</span><select value={avail} onChange={e=>setAvail(e.target.value)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/60"><option value="">Any availability</option>{SPAWNGC_AVAILABILITY.map(a=><option key={a} value={a}>{a}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wider text-white/55">Search</span><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Brand or name…" className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-amber-300/60" /></label>
      </div>
      {SPAWNGC_CARDS.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-400/[0.06] px-5 py-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-200">No matching cards</p>
          <p className="mt-2 text-sm text-white/75">Try adjusting your filters or search query.</p>
        </div>
      ) : (<><p className="mt-3 text-xs text-white/55">{filtered.length} of {SPAWNGC_CARDS.length} cards</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{filtered.map(c => <div key={c.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">{c.image&&<img src={c.image} alt={c.name} className="aspect-[4/3] w-full rounded-xl object-cover" />}<p className="mt-2 text-center text-xs font-semibold text-white">{c.name}</p>{c.price&&<p className="mt-1 text-center text-[11px] font-bold text-amber-300">{c.price}</p>}{c.denominations&&<p className="mt-0.5 text-center text-[10px] text-white/45">{c.denominations}</p>}</div>)}</div>
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