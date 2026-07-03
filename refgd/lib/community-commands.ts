/**
 * The canonical slash-command registry for the community chat.
 *
 * This module is intentionally DEPENDENCY-FREE so it can be imported from BOTH
 * the server moderation engine (lib/moderation) and the client composer's
 * slash-command autocomplete (components/community/CommunityChat) without
 * pulling any server-only code (pg, notifications) into the client bundle.
 * Keep it pure — no imports, no side effects.
 *
 * Because the parser, the /help text and the in-chat command list are ALL
 * derived from this one array, the list a member sees can never drift from
 * what actually runs.
 */
export interface CommandSpec {
  /** The bare command word, without the leading slash. */
  cmd: string;
  /** Human-readable argument hint, e.g. "[10m|2h|1d]" or "<word>". */
  args?: string;
  /** One-line description shown in /help and the autocomplete list. */
  desc: string;
  /** false → any member may run it; true → admins only. */
  admin: boolean;
  /** true → acts on a replied-to message or a numeric Telegram ID. */
  target?: boolean;
}

export const COMMAND_SPECS: CommandSpec[] = [
  { cmd: "ban", args: "[reason]", desc: "Remove a member from the chat", admin: true, target: true },
  { cmd: "unban", desc: "Restore a banned member", admin: true, target: true },
  { cmd: "mute", args: "[10m|2h|1d]", desc: "Temporarily silence a member", admin: true, target: true },
  { cmd: "unmute", desc: "Lift a member's mute", admin: true, target: true },
  { cmd: "warn", args: "[reason]", desc: "Warn a member — escalates at the limit", admin: true, target: true },
  { cmd: "unwarn", desc: "Remove one warning", admin: true, target: true },
  { cmd: "kick", desc: "Remove a member (they may rejoin)", admin: true, target: true },
  { cmd: "filter", args: "<word>", desc: "Add a banned word", admin: true },
  { cmd: "stop", args: "<word>", desc: "Remove a banned word", admin: true },
  { cmd: "blocklist", desc: "List the banned words", admin: true },
  { cmd: "antiflood", args: "[seconds|off]", desc: "Set the min gap between messages", admin: true },
  { cmd: "pin", desc: "Reply to a message to pin it", admin: true, target: true },
  { cmd: "unpin", desc: "Reply to unpin — no reply clears all pins", admin: true },
  { cmd: "del", desc: "Reply to delete just that message", admin: true, target: true },
  { cmd: "purge", args: "[n]", desc: "Reply to purge from there, or delete the last n", admin: true },
  { cmd: "welcome", args: "<text>", desc: "Set the welcome banner", admin: true },
  { cmd: "setrules", args: "<text>", desc: "Set the group rules", admin: true },
  { cmd: "rules", desc: "View the group rules", admin: false },
  { cmd: "help", desc: "Show the full command list", admin: false },
];

/**
 * Every recognised command word (including hidden aliases not shown in the
 * autocomplete list). Anything else starting with "/" is a normal message.
 */
export const COMMAND_NAMES: string[] = [
  ...COMMAND_SPECS.map((c) => c.cmd),
  "setflood", // familiar alias for /antiflood
];
