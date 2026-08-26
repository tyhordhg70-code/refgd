/*
 * Versioned Telegram Mini App entry point.
 *
 * Telegram can resume a long-lived webview for an unchanged launch URL even
 * after the site deploys. Serving the same community page at a genuinely new
 * pathname forces a fresh document/client bundle without redirecting back to
 * the stale URL.
 */
export { dynamic, metadata } from "../page";
export { default } from "../page";