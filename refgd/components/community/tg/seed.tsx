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
 * The full-quality WELCOME banner illustration attached to the original
 * READ ME post (supplied by the owner). Replaces the 72px blurred
 * placeholder that was all the saved page preserved.
 */
export const README_SEED_PHOTO = "/tg-assets/readme-welcome-photo.png";

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
          <Ce id="5443038326535759644" alt="💬" />
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
 * Markdown-lite token distillation of {@link README_SEED_BODY}. Used for
 * search matching, Copy Text / Forward, and — critically — as the body the
 * EDIT composer is seeded with (bodyToEditHtml renders these tokens into
 * rich HTML, so the admin edits the post with its real line breaks, bold,
 * links and custom emoji instead of one flat "clustered" line).
 * Keep the layout in sync with the JSX message above.
 */
export const README_SEED_TEXT =
  "[ce:5364095856972681395:🔠][ce:5361794927028096622:🔠]" +
  "[ce:5359354676934364278:🔠][ce:5359451970828520680:🔠]" +
  "[ce:5375319963726793021:🔠][ce:5361625615122319358:🔠]" +
  "[ce:5361794927028096622:🔠][ce:5375080832832652559:❗️]\n" +
  "\n" +
  "If you haven't already, we kindly ask you to **please visit our website, " +
  "to familiarize yourself with our services offered,** there you will find " +
  "answers to most questions and information of how everything works.\n" +
  "\n" +
  "[ce:5416117059207572332:➡️] [CLICK ME TO VISIT](http://refundgod.io/)\n" +
  "\n" +
  "With a total of **5 different paths on the website**, each of which " +
  "serves a different purpose and is a entire different category. Not sure " +
  "which one is right for you?\n" +
  "Below you can find a brief overview of what each path card contains to " +
  "determine which is right for you, before visiting:\n" +
  "\n" +
  "[ce:5271604874419647061:🔗] " +
  "[CLICK ME TO LEARN](https://telegra.ph/NAVIGATION-MENU-08-06)\n" +
  "\n" +
  "> [ce:5443038326535759644:💬] Something not clear, or still have questions?\n" +
  "> **Please don't hesitate to ask them to** " +
  "[@refundgodbot](https://t.me/refundgodbot)";

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

/**
 * Token distillation of {@link CHAT_NOTICE_SEED_BODY} for Copy Text / search
 * and for seeding the edit composer (real line breaks preserved).
 */
export const CHAT_NOTICE_SEED_TEXT =
  "All group chat messages will be cleared, to assert attorney-client " +
  "privilege 🧹\n" +
  "\n" +
  "Clearing occurs once every three days.";

/**
 * Markdown-lite token distillation of {@link ANNOUNCEMENT_SEED_BODY} for
 * Copy Text / Forward and for seeding the edit composer — the same blank-line
 * layout, bold highlight, custom emoji and @refundgodbot links as the
 * JSX body, so editing shows the message exactly as it renders instead of
 * one flat run-together paragraph.
 */
export const ANNOUNCEMENT_SEED_TEXT =
  "Dear members,\n" +
  "\n" +
  "[ce:5436113877181941026:❓] Do you have a question, and do not want to " +
  "wait for a response?\n" +
  "\n" +
  "**Wait no longer, because now you can receive instant responses.**\n" +
  "\n" +
  "[ce:5443038326535759644:💬] Please from now on, ask all of your questions " +
  "to [@refundgodbot](https://t.me/refundgodbot) and receive near " +
  "instant detailed responses.\n" +
  "The bot is equipped to handle everything other than giving status updates " +
  "on live orders.\n" +
  "\n" +
  "If for some reason the bot is unable to answer your question, please only " +
  "then reach out to us.\n" +
  "\n" +
  "[ce:5416117059207572332:➡️] [@refundgodbot](https://t.me/refundgodbot)\n" +
  "[ce:5416117059207572332:➡️] [@refundgodbot](https://t.me/refundgodbot)";

/**
 * The email / paper-plane illustration attached to the Announcements post
 * (supplied by the owner).
 */
export const ANNOUNCEMENT_SEED_PHOTO = "/tg-assets/announcement-bot-photo.png";

/**
 * The pinned Announcements post — the owner's "ask the bot" notice,
 * transcribed from the saved screenshot: bold highlight line, custom ❓ and 💬
 * emoji (doc ids supplied by the owner from the saved HTML) and @refundgodbot
 * mention links, blank-line layout preserved. The closing 🐺 bullets are the
 * standard Apple emoji (no custom-pack id).
 */
export const ANNOUNCEMENT_SEED_BODY: ReactNode = (
  <>
    Dear members,
    <br />
    <br />
    <Ce id="5436113877181941026" alt="❓" /> Do you have a question, and do not
    want to wait for a response?
    <br />
    <br />
    <strong data-entity-type="MessageEntityBold">
      Wait no longer, because now you can receive instant responses.
    </strong>
    <br />
    <br />
    <Ce id="5443038326535759644" alt="💬" /> Please from now on, ask all of your
    questions to{" "}
    <a
      className="text-entity-link"
      dir="auto"
      data-entity-type="MessageEntityMention"
      href="https://t.me/refundgodbot"
      target="_blank"
      rel="noopener noreferrer"
    >
      @refundgodbot
    </a>{" "}
    and receive near instant detailed responses.
    <br />
    The bot is equipped to handle everything other than giving status updates on
    live orders.
    <br />
    <br />
    If for some reason the bot is unable to answer your question, please only
    then reach out to us.
    <br />
    <br />
    <Ce id="5416117059207572332" alt="➡️" />{" "}
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
    <br />
    <Ce id="5416117059207572332" alt="➡️" />{" "}
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
  </>
);
