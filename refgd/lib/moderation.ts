/**
 * Rose-style moderation engine for the /community group chat.
 *
 * This is a WEB-APP module (NOT a Telegram bot). Admins moderate by typing
 * slash-commands into the same chat composer; the POST route intercepts a
 * message that parses as a command, runs it here, and returns ephemeral
 * feedback instead of posting it. All state is DB-backed (lib/community) so it
 * holds across Render instances. Every mutating action is audited.
 *
 * Target resolution (no @usernames are ever exposed): a command acts on the
 * message it replies to (author → tg_id), or on an explicit numeric tg_id
 * argument. Name matching is intentionally unsupported (ambiguous).
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
  setMessagePinned,
  unpinAll,
  deleteSingleMessage,
  purgeRecentMessages,
  purgeFromMessage,
  getMessageAuthor,
  recordAction,
  getModConfig,
  setModConfig,
} from "./community";

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

/** Known commands. Anything else starting with "/" is a normal message. */
const COMMANDS = new Set([
  "ban", "unban", "mute", "unmute", "warn", "unwarn", "kick",
  "filter", "stop", "blocklist",
  "welcome", "setrules", "rules",
  "pin", "unpin", "del", "purge",
  "help",
]);

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

/** Resolve the target member + remaining args from a reply or a numeric id. */
async function resolveTarget(
  rest: string,
  replyToId: string | null,
): Promise<{ tgId: string; name: string; args: string } | null> {
  if (replyToId) {
    const a = await getMessageAuthor(replyToId);
    if (a) return { tgId: a.tgId, name: a.authorName, args: rest };
    return null;
  }
  const m = rest.match(/^(\d{4,})\b\s*([\s\S]*)$/);
  if (m) return { tgId: m[1], name: "", args: (m[2] ?? "").trim() };
  return null;
}

const HELP_TEXT = [
  "Admin commands (reply to a message to target its author, or pass a numeric Telegram ID):",
  "/ban /unban — remove or restore a member",
  "/mute [10m|2h|1d] /unmute — timed silence",
  "/warn [reason] /unwarn — warnings escalate at the limit",
  "/kick — remove (they may rejoin)",
  "/filter <word> /stop <word> /blocklist — banned words",
  "/pin /unpin — reply to pin; /unpin with no reply clears all",
  "/del — reply to delete just that message",
  "/purge [n] — reply to purge from there, or delete the last n",
  "/welcome <text> /setrules <text> — set the banners",
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
      system: me.admin ? HELP_TEXT : "Type /rules to see the group rules.",
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
          system: "Reply to a message, or pass a numeric Telegram ID.",
        };
      }
      if (target.tgId === me.tid) {
        return { handled: true, ok: false, system: "You can't target yourself." };
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
      const word = rest.trim().toLowerCase();
      if (!word) return { handled: true, ok: false, system: "Usage: /filter <word>" };
      await addBlocklist(word);
      await audit("filter-add", word);
      return { handled: true, ok: true, system: `Added "${word}" to the blocklist.` };
    }
    case "stop": {
      const word = rest.trim().toLowerCase();
      if (!word) return { handled: true, ok: false, system: "Usage: /stop <word>" };
      const removed = await removeBlocklist(word);
      await audit("filter-remove", word);
      return {
        handled: true,
        ok: removed,
        system: removed ? `Removed "${word}" from the blocklist.` : `"${word}" was not blocklisted.`,
      };
    }
    case "blocklist": {
      const words = await listBlocklist();
      return {
        handled: true,
        ok: true,
        system: words.length ? `Blocklisted words: ${words.join(", ")}` : "The blocklist is empty.",
      };
    }

    case "welcome": {
      await setModConfig("welcome", rest);
      await audit("set-welcome", null);
      return {
        handled: true,
        ok: true,
        system: rest ? "Welcome message updated." : "Welcome message cleared.",
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
