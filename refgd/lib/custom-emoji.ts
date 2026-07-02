/**
 * Custom (premium pack) emoji document ids captured from the real community's
 * messages. Shared by the composer's EmojiPanel (picker grid) and the
 * /api/community/emoji/[id] route, which serves ONLY these ids — the route is
 * unauthenticated and each cache miss hits the Telegram Bot API + stores
 * bytes in Postgres, so unknown ids must be rejected before any work.
 */
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
];

/** Fast membership check for the serving route. */
export const CUSTOM_EMOJI_IDS: ReadonlySet<string> = new Set(
  CUSTOM_EMOJI.map((c) => c.id),
);
