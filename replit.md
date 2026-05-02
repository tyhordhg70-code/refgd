# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Integrations

### GitHub (conn_github_01KQEAN2QD8S3RV9GEW97RZX1G)
- Uses `@replit/connectors-sdk` via the Replit proxy pattern
- Helper: `artifacts/api-server/src/lib/github.ts` — exports `githubRequest(path, options)`
- Routes: `artifacts/api-server/src/routes/github.ts`
  - `GET /api/github/user` — authenticated user info
  - `GET /api/github/repos` — list user repositories
  - `GET /api/github/repos/:owner/:repo` — get a specific repo
  - `GET /api/github/repos/:owner/:repo/issues` — list issues
  - `GET /api/github/repos/:owner/:repo/pulls` — list pull requests
