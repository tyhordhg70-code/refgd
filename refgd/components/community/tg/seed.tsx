"use client";

import type { ReactNode } from "react";
import { emojiSrc } from "./format";

/**
 * Seeded messages transcribed verbatim from the owner's saved Telegram Web A
 * pages (the real "law" group), so the topics show their original content
 * even before the bot has ingested anything into the database.
 *
 * The original posts used animated custom-emoji packs (MessageEntityCustomEmoji
 * document ids are preserved in the saved HTML, but the sticker blobs died
 * with the browser session). Until custom-emoji fetching lands, standard
 * emoji images stand in for them.
 */

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

/** Time shown on the seeded READ ME post (from the saved page). */
export const README_SEED_TIME = "21:24";

/** Time shown on the seeded group-chat notice (from the saved page). */
export const CHAT_NOTICE_SEED_TIME = "21:25";

/** The pinned READ ME post (message 17 in the saved page). */
export const README_SEED_BODY: ReactNode = (
  <>
    <strong data-entity-type="MessageEntityBold">READ ME</strong>
    <Em ch="❗️" />
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
    <Em ch="➡️" />{" "}
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
    <Em ch="🔗" />
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
          <Em ch="💬" />
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

/** Body of the pinned clearing notice (message 18 in the saved page). */
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
