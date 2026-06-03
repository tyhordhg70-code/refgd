import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Electronics", "Clothing", "Jewelry", "Food", "Meal Plans", "Home", "Other"] as const;
type Cat = (typeof CATEGORIES)[number];

const KEYWORD_MAP: Array<[Cat, string[]]> = [
  [
    "Electronics",
    [
      "consumer electronics","electronics retailer","technology company","tech company",
      "semiconductor","smartphone","laptop","computer","tablet","ipad","iphone",
      "televisions","television","monitor","camera","gpu","cpu","gaming","headphone",
      "airpod","earbud","speaker","drone","router","keyboard","mouse","wearable",
      "apple","samsung","sony","lg electronics","best buy","newegg","microcenter",
      "bhphotovideo","anker","logitech","asus","dell","hp","lenovo","msi","intel",
      "amd","nvidia","razer","corsair","jabra","bose","jbl","harman","philips",
      "panasonic","toshiba","sharp","xbox","playstation","nintendo","oculus",
    ],
  ],
  [
    "Clothing",
    [
      "clothing","apparel","fashion","garment","wear","textile","footwear",
      "sportswear","athleisure","activewear","streetwear","luxury fashion",
      "department store","menswear","womenswear","outerwear",
      "shirt","jeans","pants","jacket","dress","shoe","sneaker","boot","sock",
      "underwear","lingerie","swimwear","hat","handbag","accessories",
      "nike","adidas","puma","reebok","under armour","new balance","vans","converse",
      "gap","uniqlo","zara","h&m","hm","levi","supreme","stussy",
      "ssense","farfetch","mr porter","yoox","net-a-porter","mytheresa",
      "asos","shein","fashion nova","pacsun","hollister","abercrombie","aritzia",
      "madewell","everlane","urban outfitters","forever 21",
      "banana republic","j.crew","j crew","ann taylor","express","torrid",
      "nordstrom","bloomingdale","saks fifth avenue","neiman marcus",
      "ralph lauren","tommy hilfiger","calvin klein","gucci","prada","burberry",
      "louis vuitton","versace","fendi","balenciaga","off-white",
      "arc'teryx","patagonia","the north face","columbia","timberland","ugg",
    ],
  ],
  [
    "Jewelry",
    [
      "jewel","jewellery","luxury watch","watchmaker","timepiece","gemstone",
      "diamond","gold","silver","platinum","ring","necklace","bracelet","earring",
      "pendant","fine jewelry","fine jewellery","luxury goods",
      "rolex","cartier","tiffany","pandora","swarovski","mejuri","kay jewelers",
      "zales","jared","tacori","david yurman","bulgari","van cleef","chopard",
      "patek philippe","audemars piguet","iwc","omega","tag heuer","breitling",
      "hublot","tudor","longines","seiko","citizen","fossil",
    ],
  ],
  [
    "Food",
    [
      "grocery","groceries","supermarket","food delivery","restaurant","fast food",
      "convenience store","snack","beverage","coffee","tea","wine","beer","liquor",
      "candy","chocolate","bakery","food marketplace",
      "whole foods","trader joe","kroger","publix","safeway","albertsons","aldi",
      "walmart grocery","amazon fresh","thrive market","imperfect foods",
      "ubereats","doordash","grubhub","instacart","postmates","gopuff",
      "starbucks","dunkin","panera","chipotle","mcdonalds","subway","domino",
      "pizza hut","taco bell","kfc","chick-fil-a","shake shack","five guys",
    ],
  ],
  [
    "Meal Plans",
    [
      "meal plan","meal kit","meal subscription","meal prep","meal delivery service",
      "weekly meals","recipe kit","prepared meals","pre-portioned",
      "calorie-controlled","weight loss meal","nutrition plan",
      "hellofresh","hello fresh","blue apron","factor","factor 75","freshly",
      "sunbasket","home chef","every plate","everyplate","green chef","greenchef",
      "gobble","daily harvest","nutrisystem","jenny craig","medifast","noom",
      "trifecta","icon meals","muscle meals","clean eatz","snap kitchen",
    ],
  ],
  [
    "Home",
    [
      "furniture","home furnishing","home decor","home goods","bedding","mattress",
      "kitchen","cookware","appliance","vacuum","cleaning","smart home","lighting",
      "bathroom","storage","garden","outdoor","tool","hardware",
      "ikea","wayfair","west elm","cb2","crate and barrel","pottery barn",
      "ashley","living spaces","rooms to go","bob's discount","havertys",
      "restoration hardware","williams-sonoma","williams sonoma","sur la table",
      "dyson","kitchenaid","cuisinart","instant pot","ninja","breville","vitamix",
      "home depot","lowe's","lowes","ace hardware","menards","harbor freight",
      "casper","purple","saatva","nectar","leesa","avocado","tuft",
      "the container store","bed bath",
    ],
  ],
];

function detectFromText(text: string): Cat {
  const h = text.toLowerCase();
  for (const [cat, words] of KEYWORD_MAP) {
    if (words.some((w) => h.includes(w))) return cat;
  }
  return "Other";
}

/**
 * DuckDuckGo Instant Answer API — free, no key needed.
 * Returns the brand's abstract description (sourced from Wikipedia,
 * Wikidata, and other structured sources). Often more useful than
 * Wikipedia alone for brand queries because DDG resolves aliases and
 * disambiguation automatically.
 */
async function ddgSummary(name: string): Promise<string> {
  try {
    const url =
      "https://api.duckduckgo.com/?q=" +
      encodeURIComponent(name) +
      "&format=json&no_redirect=1&no_html=1&skip_disambig=1";
    const r = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "refgd-store-classifier/1.0" },
    });
    if (!r.ok) return "";
    const d = await r.json();
    const parts: string[] = [];
    if (d.AbstractText) parts.push(d.AbstractText);
    if (d.Answer) parts.push(d.Answer);
    // Related topics sometimes add useful category signals.
    if (Array.isArray(d.RelatedTopics)) {
      for (const t of d.RelatedTopics.slice(0, 3)) {
        if (typeof t.Text === "string") parts.push(t.Text);
      }
    }
    return parts.join(" ");
  } catch {
    return "";
  }
}

/**
 * Fetch the first ~6 KB of the store's own homepage and extract
 * title + meta description + OG tags. Gives direct intel from the
 * store's own description of what they sell.
 */
async function siteMeta(domain: string): Promise<string> {
  if (!domain) return "";
  const base = domain.startsWith("http") ? domain : `https://${domain}`;
  try {
    const r = await fetch(base, {
      signal: AbortSignal.timeout(4000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Range: "bytes=0-6143",
      },
    });
    if (!r.ok) return "";
    const html = await r.text();
    const parts: string[] = [];
    const title = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    if (title) parts.push(title[1]);
    for (const attr of ["name=\"description\"", "name='description'"]) {
      const m = html.match(
        new RegExp(`<meta[^>]+${attr}[^>]+content=["']([^"']{1,400})["']`, "i"),
      ) || html.match(
        new RegExp(`<meta[^>]+content=["']([^"']{1,400})["'][^>]+${attr}`, "i"),
      );
      if (m) { parts.push(m[1]); break; }
    }
    for (const prop of ["og:description", "og:title"]) {
      const m = html.match(
        new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']{1,400})["']`, "i"),
      ) || html.match(
        new RegExp(`<meta[^>]+content=["']([^"']{1,400})["'][^>]+property=["']${prop}["']`, "i"),
      );
      if (m) parts.push(m[1]);
    }
    return parts.join(" ");
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const items: { name: string; domain?: string }[] = body.items ?? [];
  if (!items.length) return NextResponse.json({ results: [] });

  // Run DuckDuckGo lookups + site meta fetches in parallel for all stores.
  const intel = await Promise.all(
    items.map(async (item) => {
      const [ddg, site] = await Promise.all([
        ddgSummary(item.name),
        siteMeta(item.domain ?? ""),
      ]);
      return `${item.name} ${item.domain ?? ""} ${ddg} ${site}`;
    }),
  );

  const results = intel.map((text) => ({ category: detectFromText(text) }));
  return NextResponse.json({ results });
}
