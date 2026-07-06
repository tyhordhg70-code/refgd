/**
 * Rose-style moderation engine for the /community group chat.
 *
 * This is a WEB-APP module (NOT a Telegram bot). Admins moderate by typing
 * slash-commands into the same chat composer; the POST route intercepts a
 * message that parses as a command, runs it here, and returns ephemeral
 * feedback instead of posting it. All state is DB-backed (lib/community) so it
 * holds across Render instances. Every mutating action is audited.
 *
 * Target resolution: a command acts on the message it replies to (author →
 * tg_id), an @username argument (matched against the handle captured at
 * Telegram sign-in — usernames are stored for targeting only and NEVER
 * displayed), or an explicit numeric tg_id argument. Free-form name matching
 * is intentionally unsupported (ambiguous).
 */
import type { CommunityMember } from "./community-auth";
import { isCommunityAdmin } from "./community-bot";
import {
  setMemberBan,
  setMemberMute,
  addWarn,
  removeWarn,
  resetWarns,
  kickMember,
  addBlocklist,
  removeBlocklist,
  listBlocklist,
  addFilter,
  removeFilter,
  listFilters,
  findMemberByUsername,
  BOT_MEMBER_TG_ID,
  setMessagePinned,
  unpinAll,
  deleteSingleMessage,
  purgeRecentMessages,
  purgeFromMessage,
  getMessageAuthor,
  getMemberName,
  getMessageForPin,
  recordAction,
  getModConfig,
  setModConfig,
} from "./community";
import { notifyAll } from "./community-notify";
import { COMMAND_SPECS, COMMAND_NAMES } from "./community-commands";

export interface ModResult {
  /** true → this was a command and should NOT be posted as a chat message. */
  handled: boolean;
  ok?: boolean;
  /** Ephemeral feedback shown to the actor who typed the command. */
  system?: string;
}

const DEFAULT_WARN_LIMIT = 3;
const DEFAULT_WARN_ACTION = { type: "mute" as "mute" | "ban", duration: "1h" };
const DEFAULT_MUTE = "1h";

/**
 * Known commands, derived from the shared registry (lib/community-commands) so
 * the parser, the /help text and the composer autocomplete never drift apart.
 * Anything else starting with "/" is a normal message.
 */
const COMMANDS = new Set(COMMAND_NAMES);

export function parseCommand(
  text: string,
): { cmd: string; rest: string } | null {
  const t = text.trim();
  if (!t.startsWith("/")) return null;
  const m = t.match(/^\/([a-zA-Z]+)(?:\s+([\s\S]*))?$/);
  if (!m) return null;
  const cmd = m[1].toLowerCase();
  if (!COMMANDS.has(cmd)) return null;
  return { cmd, rest: (m[2] ?? "").trim() };
}

/** Parse a duration like "10m", "2h", "1d", "30s" → milliseconds. */
function parseDurationMs(s: string): number | null {
  const m = s.trim().match(/^(\d+)\s*(s|m|h|d)?$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = (m[2] ?? "m").toLowerCase();
  const mult =
    unit === "s" ? 1000 : unit === "h" ? 3_600_000 : unit === "d" ? 86_400_000 : 60_000;
  return n * mult;
}

/**
 * Resolve the target member + remaining args from a reply, an @username or a
 * numeric id. Returns an `error` string (instead of a target) when the input
 * looked like a target but couldn't be resolved, so the actor gets a precise
 * message rather than the generic usage hint.
 */
async function resolveTarget(
  rest: string,
  replyToId: string | null,
): Promise<
  | { tgId: string; name: string; args: string }
  | { error: string }
  | null
> {
  if (replyToId) {
    const a = await getMessageAuthor(replyToId);
    if (a) return { tgId: a.tgId, name: a.authorName, args: rest };
    return { error: "Couldn't find the message you replied to." };
  }
  const um = rest.match(/^@([A-Za-z0-9_]{3,32})\b\s*([\s\S]*)$/);
  if (um) {
    const found = await findMemberByUsername(um[1]);
    if (!found) {
      return {
        error: `No member with the username @${um[1]} has opened the community yet — reply to one of their messages or use their numeric ID instead.`,
      };
    }
    return { tgId: found.tgId, name: found.name, args: (um[2] ?? "").trim() };
  }
  const m = rest.match(/^(\d{4,})\b\s*([\s\S]*)$/);
  if (m) {
    // Backfill the display name if we've ever seen this id (e.g. the admin
    // copied it from the member roster); unseen ids fall back to the number.
    const name = await getMemberName(m[1]);
    return { tgId: m[1], name, args: (m[2] ?? "").trim() };
  }
  return null;
}

const HELP_TEXT = [
  "Admin commands (reply to a message to target its author, or pass @username or a numeric Telegram ID):",
  ...COMMAND_SPECS.filter((c) => c.admin).map(
    (c) => `/${c.cmd}${c.args ? ` ${c.args}` : ""} — ${c.desc}`,
  ),
  "/filters — anyone can list the auto-reply filters",
  "/rules — anyone can view the rules",
].join("\n");

/**
 * Execute a parsed command. Returns handled:false for a recognised command
 * that turned out to be a no-op the caller should treat as a normal message
 * (never happens here — all COMMANDS are handled), so callers can rely on
 * handled:true whenever parseCommand returned a command.
 */
export async function executeModCommand(opts: {
  me: CommunityMember;
  cmd: string;
  rest: string;
  replyToId: string | null;
}): Promise<ModResult> {
  const { me, cmd, rest, replyToId } = opts;

  // Member-accessible commands first.
  if (cmd === "rules") {
    const rules = await getModConfig<string>("rules", "");
    return {
      handled: true,
      ok: true,
      system: rules || "No rules have been set yet.",
    };
  }
  if (cmd === "help") {
    return {
      handled: true,
      ok: true,
      system: me.admin
        ? HELP_TEXT
        : "Type /rules to see the group rules, or /filters to list the auto-replies.",
    };
  }
  if (cmd === "filters") {
    const filters = await listFilters();
    return {
      handled: true,
      ok: true,
      system: filters.length
        ? `Auto-reply filters:\n${filters.map((f) => `• ${f.trigger}`).join("\n")}`
        : "No auto-reply filters are set." +
          (me.admin ? " Add one with /filter <trigger> <reply>." : ""),
    };
  }

  // Everything below is admin-only.
  if (!me.admin) {
    return { handled: true, ok: false, system: "That command is for admins only." };
  }

  const audit = (action: string, target: string | null, meta: Record<string, unknown> = {}) =>
    recordAction({ actorTgId: me.tid, actorName: me.name, action, target, meta });

  switch (cmd) {
    case "ban":
    case "unban":
    case "mute":
    case "unmute":
    case "warn":
    case "unwarn":
    case "kick": {
      const target = await resolveTarget(rest, replyToId);
      if (!target) {
        return {
          handled: true,
          ok: false,
          system: "Reply to a message, or pass @username or a numeric Telegram ID.",
        };
      }
      if ("error" in target) {
        return { handled: true, ok: false, system: target.error };
      }
      if (target.tgId === me.tid) {
        return { handled: true, ok: false, system: "You can't target yourself." };
      }
      if (target.tgId === BOT_MEMBER_TG_ID) {
        return { handled: true, ok: false, system: "You can't moderate the bot." };
      }
      const undoing = cmd === "unban" || cmd === "unmute" || cmd === "unwarn";
      if (isCommunityAdmin(target.tgId) && !undoing) {
        return {
          handled: true,
          ok: false,
          system: "You can't moderate another admin.",
        };
      }
      const who = target.name || target.tgId;

      switch (cmd) {
        case "ban": {
          await setMemberBan(target.tgId, true);
          await audit("ban", target.tgId, { reason: target.args });
          return { handled: true, ok: true, system: `Banned ${who}.` };
        }
        case "unban": {
          await setMemberBan(target.tgId, false);
          await audit("unban", target.tgId);
          return { handled: true, ok: true, system: `Unbanned ${who}.` };
        }
        case "kick": {
          await kickMember(target.tgId);
          await audit("kick", target.tgId);
          return { handled: true, ok: true, system: `Kicked ${who}.` };
        }
        case "mute": {
          const ms = parseDurationMs(target.args || DEFAULT_MUTE) ?? parseDurationMs(DEFAULT_MUTE)!;
          const until = new Date(Date.now() + ms);
          await setMemberMute(target.tgId, until);
          await audit("mute", target.tgId, { until: until.toISOString() });
          return {
            handled: true,
            ok: true,
            system: `Muted ${who} until ${until.toLocaleString()}.`,
          };
        }
        case "unmute": {
          await setMemberMute(target.tgId, null);
          await audit("unmute", target.tgId);
          return { handled: true, ok: true, system: `Unmuted ${who}.` };
        }
        case "unwarn": {
          const n = await removeWarn(target.tgId);
          await audit("unwarn", target.tgId, { count: n });
          return { handled: true, ok: true, system: `Removed a warning from ${who} (now ${n}).` };
        }
        case "warn": {
          const count = await addWarn(target.tgId, me.tid, target.args);
          const limit = await getModConfig<number>("warn_limit", DEFAULT_WARN_LIMIT);
          await audit("warn", target.tgId, { count, limit, reason: target.args });
          if (count >= limit) {
            const act = await getModConfig<{ type: "mute" | "ban"; duration?: string }>(
              "warn_action",
              DEFAULT_WARN_ACTION,
            );
            await resetWarns(target.tgId);
            if (act.type === "ban") {
              await setMemberBan(target.tgId, true);
              await audit("auto-ban", target.tgId, { afterWarns: count });
              return {
                handled: true,
                ok: true,
                system: `Warned ${who} (${count}/${limit}) — limit reached, banned.`,
              };
            }
            const ms = parseDurationMs(act.duration || DEFAULT_MUTE) ?? parseDurationMs(DEFAULT_MUTE)!;
            const until = new Date(Date.now() + ms);
            await setMemberMute(target.tgId, until);
            await audit("auto-mute", target.tgId, { afterWarns: count, until: until.toISOString() });
            return {
              handled: true,
              ok: true,
              system: `Warned ${who} (${count}/${limit}) — limit reached, muted.`,
            };
          }
          return {
            handled: true,
            ok: true,
            system: `Warned ${who} (${count}/${limit}).`,
          };
        }
      }
      return { handled: true, ok: false, system: "Unknown command." };
    }

    case "filter": {
      // Rose-style auto-reply: /filter <trigger> <reply…>. A multi-word
      // trigger goes in quotes: /filter "how to order" Check the pinned post.
      const m =
        rest.match(/^"([^"]+)"\s+([\s\S]+)$/) ?? rest.match(/^(\S+)\s+([\s\S]+)$/);
      if (!m) {
        return {
          handled: true,
          ok: false,
          system:
            'Usage: /filter <trigger> <reply> — e.g. /filter refund Check the pinned post. Use quotes for a multi-word trigger: /filter "how to order" …',
        };
      }
      const trigger = m[1].trim().toLowerCase();
      const response = m[2].trim();
      await addFilter(trigger, response);
      await audit("filter-add", trigger, { response });
      return {
        handled: true,
        ok: true,
        system: `Saved — I'll reply whenever someone says "${trigger}". Remove it with /stop ${trigger.includes(" ") ? `"${trigger}"` : trigger}.`,
      };
    }
    case "stop": {
      const qm = rest.trim().match(/^"([^"]+)"$/);
      const trigger = (qm ? qm[1] : rest).trim().toLowerCase();
      if (!trigger) return { handled: true, ok: false, system: "Usage: /stop <trigger>" };
      const removed = await removeFilter(trigger);
      await audit("filter-remove", trigger);
      return {
        handled: true,
        ok: removed,
        system: removed
          ? `Filter "${trigger}" removed.`
          : `No filter named "${trigger}" — type /filters to list them.`,
      };
    }
    case "addblacklist": {
      const word = rest.trim().toLowerCase();
      if (!word)
        return { handled: true, ok: false, system: "Usage: /addblacklist <word>" };
      await addBlocklist(word);
      await audit("blacklist-add", word);
      return { handled: true, ok: true, system: `Added "${word}" to the blacklist.` };
    }
    case "rmblacklist": {
      const word = rest.trim().toLowerCase();
      if (!word)
        return { handled: true, ok: false, system: "Usage: /rmblacklist <word>" };
      const removed = await removeBlocklist(word);
      await audit("blacklist-remove", word);
      return {
        handled: true,
        ok: removed,
        system: removed
          ? `Removed "${word}" from the blacklist.`
          : `"${word}" was not blacklisted.`,
      };
    }
    case "blacklist":
    case "blocklist": {
      const words = await listBlocklist();
      return {
        handled: true,
        ok: true,
        system: words.length
          ? `Blacklisted words: ${words.join(", ")}`
          : "The blacklist is empty.",
      };
    }

    case "antiflood":
    case "setflood": {
      const arg = rest.trim().toLowerCase();
      if (!arg) {
        const cur = await getModConfig<number>("flood_gap_s", 2);
        return {
          handled: true,
          ok: true,
          system:
            cur > 0
              ? `Antiflood is on — members wait ${cur}s between messages. Use /antiflood <seconds> or /antiflood off.`
              : "Antiflood is off. Use /antiflood <seconds> to enable it.",
        };
      }
      let secs: number;
      if (arg === "off" || arg === "0") {
        secs = 0;
      } else {
        const m = arg.match(/^(\d+)\s*s?$/);
        if (!m) {
          return {
            handled: true,
            ok: false,
            system: "Usage: /antiflood <seconds> (or /antiflood off).",
          };
        }
        secs = Math.min(parseInt(m[1], 10), 60);
      }
      await setModConfig("flood_gap_s", secs);
      await audit("set-antiflood", null, { seconds: secs });
      return {
        handled: true,
        ok: true,
        system:
          secs > 0
            ? `Antiflood set to ${secs}s between messages.`
            : "Antiflood disabled.",
      };
    }

    case "welcome":
    case "setwelcome": {
      await setModConfig("welcome", rest);
      await audit("set-welcome", null);
      return {
        handled: true,
        ok: true,
        system: rest
          ? "Welcome message updated. {first} becomes the viewer's first name and {chatname} the community name."
          : "Welcome message cleared.",
      };
    }
    case "setrules": {
      await setModConfig("rules", rest);
      await audit("set-rules", null);
      return {
        handled: true,
        ok: true,
        system: rest ? "Rules updated." : "Rules cleared.",
      };
    }

    case "pin": {
      if (!replyToId) {
        return { handled: true, ok: false, system: "Reply to the message you want to pin." };
      }
      const ok = await setMessagePinned(replyToId, true);
      await audit("pin", replyToId);
      if (ok) {
        // Broadcast the pin to the whole community. Fire-and-forget: fan-out
        // must never block or fail the command.
        void (async () => {
          const msg = await getMessageForPin(replyToId).catch(() => null);
          const snippet = (msg?.body ?? "").replace(/\s+/g, " ").trim();
          const body = snippet
            ? snippet.length > 160
              ? `${snippet.slice(0, 157)}…`
              : snippet
            : "A message was pinned in the community.";
          await notifyAll({
            title: "📌 Pinned message",
            body,
            url: "/community",
          }).catch(() => undefined);
        })();
      }
      return { handled: true, ok, system: ok ? "Message pinned." : "Couldn't find that message." };
    }
    case "unpin": {
      if (replyToId) {
        const ok = await setMessagePinned(replyToId, false);
        await audit("unpin", replyToId);
        return { handled: true, ok, system: ok ? "Message unpinned." : "Couldn't find that message." };
      }
      const n = await unpinAll();
      await audit("unpin-all", null, { count: n });
      return { handled: true, ok: true, system: `Unpinned ${n} message${n === 1 ? "" : "s"}.` };
    }
    case "del": {
      if (!replyToId) {
        return {
          handled: true,
          ok: false,
          system: "Reply to the message you want to delete.",
        };
      }
      const ok = await deleteSingleMessage(replyToId);
      await audit("del", replyToId);
      return {
        handled: true,
        ok,
        system: ok ? "Message deleted." : "Couldn't find that message.",
      };
    }
    case "purge": {
      if (replyToId) {
        const n = await purgeFromMessage(replyToId);
        await audit("purge", replyToId, { count: n });
        return { handled: true, ok: true, system: `Purged ${n} message${n === 1 ? "" : "s"}.` };
      }
      const count = parseInt(rest.trim(), 10);
      if (!Number.isFinite(count) || count <= 0) {
        return {
          handled: true,
          ok: false,
          system: "Reply to a message to purge from there, or use /purge <n>.",
        };
      }
      const n = await purgeRecentMessages(count);
      await audit("purge", null, { count: n });
      return { handled: true, ok: true, system: `Purged the last ${n} message${n === 1 ? "" : "s"}.` };
    }
  }

  return { handled: true, ok: false, system: "Unknown command." };
}
