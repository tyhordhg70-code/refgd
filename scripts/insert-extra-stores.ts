/**
 * One-shot: insert popular refund-scene stores into the live Neon DB.
 * Includes user-requested LSKD, Amika, Embr Labs.
 * Idempotent: ON CONFLICT (id) DO NOTHING.
 */
import { Pool } from "pg";

const cs = process.env.NEON_DATABASE_URL || process.env.RENDER_DATABASE_URL;
if (!cs) {
  console.error("Missing NEON_DATABASE_URL / RENDER_DATABASE_URL");
  process.exit(1);
}

const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false }, max: 2 });

type S = {
  id: string; name: string; domain: string; region: string; category: string;
  notes: string; tags?: string[];
};

const STORES: S[] = [
  // Clothing
  { id: "usa-lskd",          name: "LSKD",              domain: "lskd.co",                region: "USA", category: "Clothing",    notes: "AU-based athleisure, ships USA. Confirm cart, signature on delivery available.", tags: ["new"] },
  { id: "uk-lskd",           name: "LSKD",              domain: "lskd.co",                region: "UK",  category: "Clothing",    notes: "AU-based athleisure, ships UK. Confirm cart, signature on delivery available.", tags: ["new"] },
  { id: "eu-lskd",           name: "LSKD",              domain: "lskd.co",                region: "EU",  category: "Clothing",    notes: "AU-based athleisure, ships EU. Confirm cart, signature on delivery available.", tags: ["new"] },
  { id: "usa-rhone",         name: "Rhone",             domain: "rhone.com",              region: "USA", category: "Clothing",    notes: "Premium men's performance apparel.", tags: [] },
  { id: "usa-vuori",         name: "Vuori",             domain: "vuoriclothing.com",      region: "USA", category: "Clothing",    notes: "High-resell athleisure. Performance fabrics.", tags: ["fire"] },
  { id: "usa-faherty",       name: "Faherty",           domain: "fahertybrand.com",       region: "USA", category: "Clothing",    notes: "Coastal-lifestyle premium clothing.", tags: [] },
  { id: "usa-cariuma",       name: "Cariuma",           domain: "cariuma.com",            region: "USA", category: "Clothing",    notes: "Sustainable sneakers. Easy refund process.", tags: [] },
  { id: "usa-allbirds",      name: "Allbirds",          domain: "allbirds.com",           region: "USA", category: "Clothing",    notes: "Wool-runner sneakers. Refund within delivery window.", tags: [] },
  { id: "usa-quince",        name: "Quince",            domain: "quince.com",             region: "USA", category: "Clothing",    notes: "Luxury essentials at direct prices.", tags: [] },
  { id: "usa-naadam",        name: "Naadam",            domain: "naadam.co",              region: "USA", category: "Clothing",    notes: "Cashmere & sustainable knits.", tags: [] },
  { id: "usa-buck-mason",    name: "Buck Mason",        domain: "buckmason.com",          region: "USA", category: "Clothing",    notes: "California heritage menswear.", tags: [] },
  { id: "usa-chubbies",      name: "Chubbies",          domain: "chubbiesshorts.com",     region: "USA", category: "Clothing",    notes: "Lifestyle shorts and apparel.", tags: [] },
  { id: "usa-outdoor-voices",name: "Outdoor Voices",    domain: "outdoorvoices.com",      region: "USA", category: "Clothing",    notes: "Recreational athletic apparel.", tags: [] },
  { id: "usa-beis",          name: "Béis Travel",       domain: "beistravel.com",         region: "USA", category: "Clothing",    notes: "Premium luggage / travel goods.", tags: ["fire"] },

  // Beauty
  { id: "usa-amika",         name: "Amika",             domain: "loveamika.com",          region: "USA", category: "Other",       notes: "Premium hair-care brand. Fast refund cycle.", tags: ["new"] },
  { id: "uk-amika",          name: "Amika",             domain: "loveamika.com",          region: "UK",  category: "Other",       notes: "Premium hair-care brand, EU/UK ship.", tags: ["new"] },
  { id: "usa-glossier",      name: "Glossier",          domain: "glossier.com",           region: "USA", category: "Other",       notes: "Cult beauty brand. Easy DTC refund flow.", tags: [] },
  { id: "usa-drunk-elephant",name: "Drunk Elephant",    domain: "drunkelephant.com",      region: "USA", category: "Other",       notes: "Premium skincare.", tags: [] },
  { id: "usa-briogeo",       name: "Briogeo",           domain: "briogeohair.com",        region: "USA", category: "Other",       notes: "Clean hair-care, high-resell.", tags: [] },
  { id: "usa-rare-beauty",   name: "Rare Beauty",       domain: "rarebeauty.com",         region: "USA", category: "Other",       notes: "Selena Gomez line, hot brand.", tags: ["fire"] },

  // Electronics
  { id: "usa-embr-labs",     name: "Embr Labs",         domain: "embrlabs.com",           region: "USA", category: "Electronics", notes: "Wave wristband — temperature wearable. SE-friendly warranty.", tags: ["new", "diamond"] },
  { id: "usa-dyson",         name: "Dyson",             domain: "dyson.com",              region: "USA", category: "Electronics", notes: "Premium vacuums, hair tools, fans.", tags: ["fire", "diamond"] },
  { id: "usa-anker",         name: "Anker",             domain: "anker.com",              region: "USA", category: "Electronics", notes: "Charging gear, Eufy, Soundcore.", tags: ["fire"] },
  { id: "usa-sonos",         name: "Sonos",             domain: "sonos.com",              region: "USA", category: "Electronics", notes: "Premium home audio.", tags: [] },
  { id: "usa-bose",          name: "Bose",              domain: "bose.com",               region: "USA", category: "Electronics", notes: "Headphones / soundbars / speakers.", tags: [] },
  { id: "usa-marshall",      name: "Marshall",          domain: "marshallheadphones.com", region: "USA", category: "Electronics", notes: "Iconic audio. Easy refund cycle.", tags: [] },
  { id: "usa-logitech",      name: "Logitech",          domain: "logitech.com",           region: "USA", category: "Electronics", notes: "Peripherals, cameras, MX line.", tags: [] },
  { id: "usa-razer",         name: "Razer",             domain: "razer.com",              region: "USA", category: "Electronics", notes: "Gaming hardware.", tags: [] },
  { id: "usa-corsair",       name: "Corsair",           domain: "corsair.com",            region: "USA", category: "Electronics", notes: "Gaming peripherals, PC parts.", tags: [] },
  { id: "usa-steelseries",   name: "SteelSeries",       domain: "steelseries.com",        region: "USA", category: "Electronics", notes: "Esports peripherals.", tags: [] },
  { id: "usa-dji",           name: "DJI",               domain: "dji.com",                region: "USA", category: "Electronics", notes: "Drones, gimbals, Osmo line.", tags: ["fire", "diamond"] },
  { id: "usa-gopro",         name: "GoPro",             domain: "gopro.com",              region: "USA", category: "Electronics", notes: "Action cameras.", tags: [] },
  { id: "usa-therabody",     name: "Therabody",         domain: "therabody.com",          region: "USA", category: "Electronics", notes: "Theragun and recovery devices.", tags: ["fire"] },
  { id: "usa-oura",          name: "Oura",              domain: "ouraring.com",           region: "USA", category: "Electronics", notes: "Smart sleep ring.", tags: ["new"] },
  { id: "usa-whoop",         name: "Whoop",             domain: "whoop.com",              region: "USA", category: "Electronics", notes: "Fitness wearable.", tags: [] },
  { id: "usa-irobot",        name: "iRobot",            domain: "irobot.com",             region: "USA", category: "Electronics", notes: "Roomba vacuums.", tags: [] },
  { id: "usa-olight",        name: "Olight",            domain: "olightstore.com",        region: "USA", category: "Electronics", notes: "Premium flashlights & EDC.", tags: [] },

  // Home
  { id: "usa-brooklinen",    name: "Brooklinen",        domain: "brooklinen.com",         region: "USA", category: "Home",        notes: "Premium bedding & towels.", tags: [] },
  { id: "usa-parachute",     name: "Parachute Home",    domain: "parachutehome.com",      region: "USA", category: "Home",        notes: "Bedding, bath, decor.", tags: [] },
  { id: "usa-boll-branch",   name: "Boll & Branch",     domain: "bollandbranch.com",      region: "USA", category: "Home",        notes: "Organic bedding.", tags: [] },
  { id: "usa-casper",        name: "Casper",            domain: "casper.com",             region: "USA", category: "Home",        notes: "Mattresses & sleep.", tags: [] },
  { id: "usa-purple",        name: "Purple",            domain: "purple.com",             region: "USA", category: "Home",        notes: "Mattresses with grid technology.", tags: [] },
  { id: "usa-saatva",        name: "Saatva",            domain: "saatva.com",             region: "USA", category: "Home",        notes: "Luxury mattresses.", tags: [] },
  { id: "usa-article",       name: "Article",           domain: "article.com",            region: "USA", category: "Home",        notes: "Direct-to-consumer furniture.", tags: [] },
  { id: "usa-floyd",         name: "Floyd",             domain: "floydhome.com",          region: "USA", category: "Home",        notes: "Modular furniture.", tags: [] },
];

(async () => {
  let inserted = 0;
  let skipped = 0;
  const now = new Date().toISOString();
  for (const s of STORES) {
    const r = await pool.query(
      `INSERT INTO stores
         (id, name, domain, region, category, price_limit, item_limit, fee, timeframe,
          notes, tags, prismatic_glow, logo_url, raw_text, sort_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,NULL,NULL,NULL,NULL,$6,$7,false,NULL,NULL,$8,$9,$9)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [s.id, s.name, s.domain, s.region, s.category, s.notes, JSON.stringify(s.tags || []), 0, now]
    );
    if (r.rowCount && r.rowCount > 0) inserted++;
    else skipped++;
  }

  const [{ rows: byRegion }, { rows: total }, { rows: checks }] = await Promise.all([
    pool.query("SELECT region, COUNT(*)::int AS c FROM stores GROUP BY region ORDER BY region"),
    pool.query("SELECT COUNT(*)::int AS c FROM stores"),
    pool.query("SELECT name, region FROM stores WHERE name ILIKE 'LSKD' OR name ILIKE 'Amika' OR name ILIKE '%Embr%' ORDER BY name, region"),
  ]);

  console.log(`Inserted: ${inserted}  Skipped(existing): ${skipped}`);
  console.log("Total stores now:", total[0].c);
  console.log("By region:", byRegion);
  console.log("Confirm:", checks);
  await pool.end();
})();
