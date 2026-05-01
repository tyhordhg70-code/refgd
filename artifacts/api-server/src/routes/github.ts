import { Router } from "express";
import { githubRequest } from "../lib/github";

const githubRouter = Router();

// GET /api/github/user — authenticated user profile
githubRouter.get("/github/user", async (req, res) => {
  try {
    const user = await githubRequest("/user");
    res.json(user);
  } catch (err) {
    req.log.error(err, "GitHub /user failed");
    res.status(502).json({ error: "Failed to fetch GitHub user" });
  }
});

// GET /api/github/repos — list repos for the authenticated user
githubRouter.get("/github/repos", async (req, res) => {
  try {
    const repos = await githubRequest("/user/repos?sort=updated&per_page=50");
    res.json(repos);
  } catch (err) {
    req.log.error(err, "GitHub /repos failed");
    res.status(502).json({ error: "Failed to fetch GitHub repos" });
  }
});

// GET /api/github/repos/:owner/:repo — single repo details
githubRouter.get("/github/repos/:owner/:repo", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const data = await githubRequest(`/repos/${owner}/${repo}`);
    res.json(data);
  } catch (err) {
    req.log.error(err, "GitHub repo fetch failed");
    res.status(502).json({ error: "Failed to fetch repo" });
  }
});

// GET /api/github/repos/:owner/:repo/issues — list issues
githubRouter.get("/github/repos/:owner/:repo/issues", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const data = await githubRequest(`/repos/${owner}/${repo}/issues?state=open&per_page=50`);
    res.json(data);
  } catch (err) {
    req.log.error(err, "GitHub issues fetch failed");
    res.status(502).json({ error: "Failed to fetch issues" });
  }
});

// GET /api/github/repos/:owner/:repo/pulls — list pull requests
githubRouter.get("/github/repos/:owner/:repo/pulls", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const data = await githubRequest(`/repos/${owner}/${repo}/pulls?state=open&per_page=50`);
    res.json(data);
  } catch (err) {
    req.log.error(err, "GitHub pulls fetch failed");
    res.status(502).json({ error: "Failed to fetch pull requests" });
  }
});

export default githubRouter;
