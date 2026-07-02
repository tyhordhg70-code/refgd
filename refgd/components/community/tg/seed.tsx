"use client";

import type { ReactNode } from "react";
import { CustomEmojiImg, emojiSrc } from "./format";

/**
 * Seeded messages transcribed verbatim from the owner's saved Telegram Web A
 * pages (the real "law" group), so the topics show their original content
 * even before the bot has ingested anything into the database.
 *
 * The original posts used animated custom-emoji packs; their
 * MessageEntityCustomEmoji document ids are preserved in the saved HTML and
 * the artwork is self-hosted under /tg-emoji/<documentId>.webp (with the
 * Bot API route and Apple sprites as fallbacks — see <CustomEmojiImg>).
 */

function Ce({ id, alt }: { id: string; alt: string }) {
  return <CustomEmojiImg id={id} alt={alt} />;
}

function Em({ ch }: { ch: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={emojiSrc(ch)}
      className="emoji emoji-small"
      alt={ch}
      draggable={false}
    />
  );
}

/** Display name used for seeded group posts (matches the real group). */
export const SEED_AUTHOR = "RefundGod";

/**
 * The group's real profile photo (t.me/refundgod og:image, self-hosted).
 * Used for the admin avatar on seeded posts and admin messages.
 */
export const SEED_AVATAR = "/tg-assets/refundgod-avatar.jpg";

/** Time shown on the seeded READ ME post (from the saved page). */
export const README_SEED_TIME = "21:24";

/** Time shown on the seeded group-chat notice (from the saved page). */
export const CHAT_NOTICE_SEED_TIME = "21:25";

/** Time shown on the seeded Announcements notice (from the saved page). */
export const ANNOUNCEMENT_SEED_TIME = "21:24";

/**
 * The photo attached to the original READ ME post. Only the 72px blurred
 * placeholder survived in the saved page (the full-size blob died with the
 * browser session), so it renders as Telegram's blurred media preview.
 */
export const README_SEED_PHOTO = "/tg-assets/readme-photo-thumb.png";

/** The ❤️ reaction on the original READ ME post. */
export const README_SEED_REACTIONS = [
  { emoji: "❤️", count: 1, mine: false },
];

/**
 * LED-board "WELCOME❗" heading from the original post — RetroFontEmoji
 * letters W-E-L-C-O-M-E plus the pack's ❗, all custom-emoji documents.
 */
const LED_WELCOME: ReactNode = (
  <>
    <Ce id="5364095856972681395" alt="🔠" />
    <Ce id="5361794927028096622" alt="🔠" />
    <Ce id="5359354676934364278" alt="🔠" />
    <Ce id="5359451970828520680" alt="🔠" />
    <Ce id="5375319963726793021" alt="🔠" />
    <Ce id="5361625615122319358" alt="🔠" />
    <Ce id="5361794927028096622" alt="🔠" />
    <Ce id="5375080832832652559" alt="❗️" />
  </>
);

/** The pinned READ ME post (message 17 in the saved page). */
export const README_SEED_BODY: ReactNode = (
  <>
    {LED_WELCOME}
    <br />
    <br />
    If you haven&apos;t already, we kindly ask you to{" "}
    <strong data-entity-type="MessageEntityBold">
      please visit our website, to familiarize yourself with our services
      offered,
    </strong>
    &nbsp;there you will find answers to most questions and information of how
    everything works.
    <br />
    <br />
    <Ce id="5416117059207572332" alt="➡️" />{" "}
    <a
      href="http://refundgod.io/"
      title="http://refundgod.io/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-entity-link"
      dir="auto"
      data-entity-type="MessageEntityTextUrl"
    >
      CLICK ME TO VISIT
    </a>
    <br />
    <br />
    With a total of{" "}
    <strong data-entity-type="MessageEntityBold">
      &nbsp;5 different paths on the website
    </strong>
    , each of which serves a different purpose and is a entire different
    category. Not sure which one is right for you?
    <br />
    Below you can find a brief overview of what each path card contains to
    determine which is right for you, before visiting:
    <br />
    <br />
    <Ce id="5271604874419647061" alt="🔗" />
    <a
      href="https://telegra.ph/NAVIGATION-MENU-08-06"
      title="https://telegra.ph/NAVIGATION-MENU-08-06"
      target="_blank"
      rel="noopener noreferrer"
      className="text-entity-link"
      dir="auto"
      data-entity-type="MessageEntityTextUrl"
    >
      &nbsp;CLICK ME TO LEARN
    </a>
    <br />
    <br />
    <span>
      <blockquote className="EYuABWIQ" data-entity-type="MessageEntityBlockquote">
        <div className="tzfqwhbk">
          <Ce id="5417915203100613993" alt="💬" />
          &nbsp;Something not clear, or still have questions?
          <br />
          <strong data-entity-type="MessageEntityBold">
            Please don&apos;t hesitate to ask them to
          </strong>{" "}
          <a
            className="text-entity-link"
            dir="auto"
            data-entity-type="MessageEntityMention"
            href="https://t.me/refundgodbot"
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong data-entity-type="MessageEntityBold">@refundgodbot</strong>
          </a>
        </div>
      </blockquote>
    </span>
  </>
);

/**
 * The "Migrated from law" service pill that opens the group chat history
 * (message 1 in the saved page — classes are real Web A action-message
 * classes shipped in tg-webapp.css).
 */
export const CHAT_MIGRATED_SEED: ReactNode = (
  <div className="ActionMessage message-list-item wKgfHKTW p9P0k2bA shown open">
    <div className="aKAeSlxb">
      <span className="lY8JkUwr">Migrated from law</span>
    </div>
  </div>
);

/**
 * Body of the pinned clearing notice (message 18 in the saved page). The
 * same post is the latest message of the Announcements topic in the saved
 * topic list, so it seeds that topic too.
 */
export const CHAT_NOTICE_SEED_BODY: ReactNode = (
  <>
    All group chat messages will be cleared, to assert attorney-client
    privilege <Em ch="🧹" />
    &nbsp;
    <br />
    <br />
    Clearing occurs once every three days.
  </>
);
