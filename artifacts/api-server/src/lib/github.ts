// GitHub integration via Replit Connectors SDK
// Connection: conn_github_01KQEAN2QD8S3RV9GEW97RZX1G
import { ReplitConnectors } from "@replit/connectors-sdk";

export function getGitHubConnector() {
  return new ReplitConnectors();
}

export async function githubRequest(
  path: string,
  options: { method?: string; body?: unknown } = {}
) {
  const connectors = getGitHubConnector();
  const response = await connectors.proxy("github", path, {
    method: options.method ?? "GET",
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  return response.json();
}
