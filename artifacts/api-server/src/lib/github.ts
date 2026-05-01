// GitHub integration via Replit Connectors SDK
// Uses OAuth proxy — no API key needed, tokens are managed automatically
import { ReplitConnectors } from "@replit/connectors-sdk";

export function getGitHubClient() {
  return new ReplitConnectors();
}

export async function githubRequest(
  path: string,
  options: { method?: string; body?: unknown } = {},
) {
  const connectors = getGitHubClient();
  const response = await connectors.proxy("github", path, {
    method: options.method ?? "GET",
    ...(options.body
      ? { body: JSON.stringify(options.body), headers: { "Content-Type": "application/json" } }
      : {}),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }
  return response.json();
}
