/**
 * Custom (premium pack) emoji document ids captured from the real community's
 * messages. Shared by the composer's EmojiPanel (picker grid) and the
 * /api/community/emoji/[id] route, which serves ONLY these ids — the route is
 * unauthenticated and each cache miss hits the Telegram Bot API + stores
 * bytes in Postgres, so unknown ids must be rejected before any work.
 */
/**
 * Cache version for /api/community/emoji URLs (client `?v=` and the route's
 * Postgres key). Bumping it forces every tile past both the immutable
 * browser/CDN cache AND the Postgres cache. v4 = first originals-only
 * generation; v5 = re-warm after v4's rate-limit collapse pinned stale
 * statics into browsers under immutable headers. The route copies rows
 * forward from v-1 (>= v4) automatically, so bumps are cheap — but always
 * warm via /api/community/emoji/warm after a bump.
 */
export const EMOJI_CACHE_VERSION = 5;

export const CUSTOM_EMOJI: ReadonlyArray<{ id: string; alt: string }> = [
  { id: "5415825426633202840", alt: "🔥" },
  { id: "5922272602784534896", alt: "⚡️" },
  { id: "5271869530304432826", alt: "🌟" },
  { id: "5438496463044752972", alt: "⭐️" },
  { id: "5409048419211682843", alt: "💵" },
  { id: "5312361253610475399", alt: "🛒" },
  { id: "5440841102871517055", alt: "🛒" },
  { id: "6147673955357431919", alt: "🛒" },
  { id: "5884479287171485878", alt: "📦" },
  { id: "5231361378748472914", alt: "✈️" },
  { id: "5909078961467431777", alt: "✔️" },
  { id: "5949775417274536507", alt: "⭕️" },
  { id: "5368417895447535592", alt: "🆕" },
  { id: "5424818078833715060", alt: "📣" },
  { id: "5375080832832652559", alt: "❗️" },
  { id: "5440660757194744323", alt: "‼️" },
  { id: "5436113877181941026", alt: "❓" },
  { id: "4976830295253713525", alt: "😀" },
  { id: "5397879236499353888", alt: "😐" },
  { id: "5213307977640979750", alt: "💬" },
  { id: "5443038326535759644", alt: "💬" },
  { id: "5264719646707165718", alt: "🗯" },
  { id: "5927292517610426176", alt: "🇺🇸" },
  { id: "5416117059207572332", alt: "➡️" },
  { id: "5271604874419647061", alt: "🔗" },
  { id: "5417915203100613993", alt: "💬" },
  { id: "5359354676934364278", alt: "🔠" },
  { id: "5359451970828520680", alt: "🔠" },
  { id: "5361625615122319358", alt: "🔠" },
  { id: "5361794927028096622", alt: "🔠" },
  { id: "5364095856972681395", alt: "🔠" },
  { id: "5375319963726793021", alt: "🔠" },
  // Pack covers captured from the owner's real Telegram picker — one id per
  // pack is enough for discovery to expand the whole set.
  { id: "5325660233295475057", alt: "💰" }, // ax1.vc x @PlushPepeSales
  { id: "5384559872899555845", alt: "😀" }, // Emoticon Emoji
];

/**
 * Custom-emoji pack short-names the owner listed explicitly (fullyst.com
 * links). Discovery expands these DIRECTLY via getStickerSet — no seed id
 * needed — so packs whose emoji never appeared in imported history still
 * show up. Sticker packs (fstik.app links: CursedEmojis, Hot_3d_boys,
 * videopopuga_by_fStikBot, Yellowboi) do NOT belong here: their stickers
 * carry no custom_emoji_id, so they cannot render in an emoji picker —
 * real Telegram shows them under the Stickers tab, a separate feature.
 */
export const SEED_SET_NAMES: ReadonlyArray<string> = [
  "NewsEmoji",
  "RetroFontEmoji",
  "ApplicationEmoji",
  "DuckEmoji",
  "Topics",
  "FaceEmoji",
  "roflmoji",
];

/** Fast membership check for the serving route. */
export const CUSTOM_EMOJI_IDS: ReadonlySet<string> = new Set(
  CUSTOM_EMOJI.map((c) => c.id),
);
