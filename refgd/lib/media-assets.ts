/**
 * Content-addressed media published on the RefundGod CDN.
 *
 * Keep the original source name beside each URL so callers can map the
 * app's historical asset names to the immutable CDN object without
 * reintroducing same-origin/Render fallbacks.
 */
export const CDN_MEDIA_ORIGIN = "https://cdn.refundgod.io";

export const MEDIA_ASSETS = {
  sphereMontage: {
    source: "sphere-montage.mp4",
    url: `${CDN_MEDIA_ORIGIN}/sphere-montage.fe5e06804b36.mp4`,
    bytes: 32156163,
    contentType: "video/mp4",
  },
  evadeHeroVortex: {
    source: "uploads/evade-hero-vortex.mp4",
    url: `${CDN_MEDIA_ORIGIN}/uploads/evade-hero-vortex.54c0cb398043.mp4`,
    bytes: 12987759,
    contentType: "video/mp4",
  },
  mentorshipBackground: {
    source: "mentorship-bg.mp4",
    url: `${CDN_MEDIA_ORIGIN}/mentorship-bg.ba95d57bb75d.mp4`,
    bytes: 9370433,
    contentType: "video/mp4",
  },
  storeListBackground: {
    source: "store-list-bg.mp4",
    url: `${CDN_MEDIA_ORIGIN}/store-list-bg.c4eea945c111.mp4`,
    bytes: 4115853,
    contentType: "video/mp4",
  },
  aglow: {
    source: "audio/01-aglow.mp3",
    url: `${CDN_MEDIA_ORIGIN}/audio/01-aglow.068a9d436fff.mp3`,
    bytes: 6122821,
    contentType: "audio/mpeg",
  },
  mirage: {
    source: "audio/02-mirage.mp3",
    url: `${CDN_MEDIA_ORIGIN}/audio/02-mirage.7124ef9cc000.mp3`,
    bytes: 2858977,
    contentType: "audio/mpeg",
  },
  drowning: {
    source: "audio/03-drowning.mp3",
    url: `${CDN_MEDIA_ORIGIN}/audio/03-drowning.99d38b3dfa8a.mp3`,
    bytes: 3205048,
    contentType: "audio/mpeg",
  },
  thisFeeling: {
    source: "audio/04-this-feeling.mp3",
    url: `${CDN_MEDIA_ORIGIN}/audio/04-this-feeling.f9efe9beae40.mp3`,
    bytes: 2265453,
    contentType: "audio/mpeg",
  },
  apathy: {
    source: "audio/05-apathy.mp3",
    url: `${CDN_MEDIA_ORIGIN}/audio/05-apathy.8da51c770aee.mp3`,
    bytes: 2813211,
    contentType: "audio/mpeg",
  },
  stellar: {
    source: "audio/06-stellar.mp3",
    url: `${CDN_MEDIA_ORIGIN}/audio/06-stellar.dd4f9241e1e9.mp3`,
    bytes: 2362442,
    contentType: "audio/mpeg",
  },
  snowfall: {
    source: "audio/07-snowfall.mp3",
    url: `${CDN_MEDIA_ORIGIN}/audio/07-snowfall.711eda7ca65b.mp3`,
    bytes: 3617325,
    contentType: "audio/mpeg",
  },
} as const;

export type MediaAssetName = keyof typeof MEDIA_ASSETS;
export type MediaAsset = (typeof MEDIA_ASSETS)[MediaAssetName];

/** Source-path lookup used when code needs to preserve a legacy asset name. */
export const MEDIA_ASSETS_BY_SOURCE = {
  "sphere-montage.mp4": MEDIA_ASSETS.sphereMontage,
  "uploads/evade-hero-vortex.mp4": MEDIA_ASSETS.evadeHeroVortex,
  "mentorship-bg.mp4": MEDIA_ASSETS.mentorshipBackground,
  "store-list-bg.mp4": MEDIA_ASSETS.storeListBackground,
  "audio/01-aglow.mp3": MEDIA_ASSETS.aglow,
  "audio/02-mirage.mp3": MEDIA_ASSETS.mirage,
  "audio/03-drowning.mp3": MEDIA_ASSETS.drowning,
  "audio/04-this-feeling.mp3": MEDIA_ASSETS.thisFeeling,
  "audio/05-apathy.mp3": MEDIA_ASSETS.apathy,
  "audio/06-stellar.mp3": MEDIA_ASSETS.stellar,
  "audio/07-snowfall.mp3": MEDIA_ASSETS.snowfall,
} as const;

export type MediaSource = keyof typeof MEDIA_ASSETS_BY_SOURCE;
