import { Router } from "express";
import { githubRequest } from "../lib/github";

const router = Router();

// GET /api/github/user — authenticated user info
router.get("/github/user", async (req, res) => {
  try {
    const data = await githubRequest("/user");
    res.json(data);
  } catch (err) {
    req.log.error(err, "Failed to fetch GitHub user");
    res.status(500).json({ error: "Failed to fetch GitHub user" });
  }
});

// GET /api/github/repos — list authenticated user repositories
router.get("/github/repos", async (req, res) => {
  try {
    const data = await githubRequest("/user/repos?sort=updated&per_page=50");
    res.json(data);
  } catch (err) {
    req.log.error(err, "Failed to fetch GitHub repos");
    res.status(500).json({ error: "Failed to fetch GitHub repos" });
  }
});

// GET /api/github/repos/:owner/:repo — get a specific repository
router.get("/github/repos/:owner/:repo", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const data = await githubRequest(`/repos/${owner}/${repo}`);
    res.json(data);
  } catch (err) {
    req.log.error(err, "Failed to fetch GitHub repo");
    res.status(500).json({ error: "Failed to fetch GitHub repo" });
  }
});

// GET /api/github/repos/:owner/:repo/issues — list issues
router.get("/github/repos/:owner/:repo/issues", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const data = await githubRequest(`/repos/${owner}/${repo}/issues`);
    res.json(data);
  } catch (err) {
    req.log.error(err, "Failed to fetch GitHub issues");
    res.status(500).json({ error: "Failed to fetch GitHub issues" });
  }
});

// GET /api/github/repos/:owner/:repo/pulls — list pull requests
router.get("/github/repos/:owner/:repo/pulls", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const data = await githubRequest(`/repos/${owner}/${repo}/pulls`);
    res.json(data);
  } catch (err) {
    req.log.error(err, "Failed to fetch GitHub pull requests");
    res.status(500).json({ error: "Failed to fetch GitHub pull requests" });
  }
});

// /api/github/proxy/... — generic proxy to any GitHub API path (all methods)
const proxyRouter = Router();
proxyRouter.use(async (req, res) => {
  try {
    const { ReplitConnectors } = await import("@replit/connectors-sdk");
    const connectors = new ReplitConnectors();
    const apiPath = req.path;
    const qs = Object.keys(req.query).length
      ? "?" + new URLSearchParams(req.query as Record<string, string>).toString()
      : "";
    const opts: RequestInit = { method: req.method };
    if (["PUT", "PATCH", "POST"].includes(req.method) && req.body) {
      opts.body = JSON.stringify(req.body);
      opts.headers = { "Content-Type": "application/json" };
    }
    const response = await connectors.proxy("github", apiPath + qs, opts);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    req.log.error(err, "GitHub proxy failed");
    res.status(500).json({ error: "GitHub proxy failed" });
  }
});
router.use("/github/proxy", proxyRouter);

export default router;
