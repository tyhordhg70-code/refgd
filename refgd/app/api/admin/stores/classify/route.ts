import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Electronics", "Clothing", "Jewelry", "Food", "Meal Plans", "Home", "Other"] as const;
type Cat = (typeof CATEGORIES)[number];

/**
 * Expanded keyword table — designed to match both raw store names AND
 * Wikipedia extract text (e.g. "clothing retailer", "department store",
 * "consumer electronics", "luxury jeweller", etc.).
 */
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
      "amd","nvidia","razer","corsair","western digital","seagate","kingston",
      "jabra","bose","jbl","harman","philips","panasonic","toshiba","sharp",
      "xbox","playstation","nintendo","switch","oculus","meta quest",
    ],
  ],
  [
    "Clothing",
    [
      "clothing","apparel","fashion","garment","wear","textile","footwear",
      "sportswear","athleisure","activewear","streetwear","luxury fashion",
      "department store","retail chain","menswear","womenswear","outerwear",
      "shirts","jeans","pants","jacket","dress","shoe","sneaker","boot","sock",
      "underwear","lingerie","swimwear","hat","handbag","accessories",
      "nike","adidas","puma","reebok","under armour","new balance","vans","converse",
      "gap","uniqlo","zara","h&m","hm","levi","levi's","supreme","stussy",
      "ssense","farfetch","mr porter","yoox","net-a-porter","mytheresa",
      "asos","shein","fashion nova","pacsun","hollister","abercrombie","aritzia",
      "madewell","everlane","quay","urban outfitters","forever 21",
      "banana republic","j.crew","j crew","ann taylor","express","torrid",
      "nordstrom","bloomingdale","saks fifth avenue","neiman marcus","barneys",
      "ralph lauren","tommy hilfiger","calvin klein","gucci","prada","burberry",
      "louis vuitton","versace","fendi","balenciaga","off-white","fear of god",
      "arc'teryx","patagonia","the north face","columbia","timberland","ugg",
    ],
  ],
  [
    "Jewelry",
    [
      "jewel","jewellery","luxury watch","watchmaker","timepiece","gemstone",
      "diamond","gold","silver","platinum","ring","necklace","bracelet","earring",
      "pendant","luxury goods","fine jewelry","fine jewellery",
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
      "candy","chocolate","bakery","meal delivery","food marketplace",
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
      "weekly meals","recipe kit","prepared meals","pre-portioned","dietitian",
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
      "restoration hardware","rh ","williams-sonoma","williams sonoma","sur la table",
      "dyson","kitchenaid","cuisinart","instant pot","ninja","breville","vitamix",
      "home depot","lowe's","lowes","ace hardware","menards","harbor freight",
      "casper","purple","saatva","nectar","leesa","avocado","tuft",
      "the container store","real simple","bed bath","linens 'n things",
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
 * Fetch the Wikipedia REST summary for a store name.
 * Returns the description + extract concatenated, or "" on any failure.
 * Runs with a 4-second timeout so a slow/missing page doesn't block the batch.
 */
async function wikiSummary(name: string): Promise<string> {
  try {
    const url =
      "https://en.wikipedia.org/api/rest_v1/page/summary/" +
      encodeURIComponent(name.trim());
    const r = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers: { "User-Agent": "refgd-store-classifier/1.0 (admin tool)" },
    });
    if (!r.ok) return "";
    const d = await r.json();
    return `${d.description ?? ""} ${d.extract ?? ""}`;
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

  // Fetch all Wikipedia summaries in parallel.
  const wikis = await Promise.all(items.map((item) => wikiSummary(item.name)));

  const results = items.map((item, i) => {
    // Combine store name + domain + Wikipedia description for classification.
    const combined = `${item.name} ${item.domain ?? ""} ${wikis[i]}`;
    return { category: detectFromText(combined) };
  });

  return NextResponse.json({ results });
}
