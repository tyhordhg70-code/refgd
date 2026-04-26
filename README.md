# RefundGod — self-hosted

A fully self-hosted rebuild of refundgod.io. No external SaaS dependencies — runs anywhere Node.js runs.

## Stack

- **Next.js 14** (App Router, SSR for Jina/AI crawler readability)
- **TypeScript + Tailwind CSS**
- **Pure JSON file storage** (`data/refgd.db.json`) — zero native deps, atomic writes, deploys anywhere Node.js runs
- **bcryptjs + jose (JWT)** for hidden admin auth
- **framer-motion** for animations

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template and edit it
cp .env.example .env
#   - set ADMIN_USERNAME, ADMIN_PASSWORD
#   - set SESSION_SECRET to a long random string

# 3. Seed the database with stores from data/stores.json
npm run seed

# 4. Run in dev
npm run dev   # → http://localhost:3000

# 5. Production
npm run build
npm start
```

## Hidden admin

The admin lives at `/admin` by default. To **hide** it behind a secret slug,
set `ADMIN_PATH=your-secret-slug` in `.env`. Then:

- `/your-secret-slug` → admin login
- `/admin` → 404

Implemented via `middleware.ts`. Only operators who know the slug can find it.

Admin can:
- Add / edit / delete stores in any region
- Auto-fetch logos by domain (Clearbit + DuckDuckGo fallback)
- Toggle prismatic glow per store card
- Edit page text content live

## Self-hosting

Any Node host works:

```bash
npm ci
npm run build
PORT=80 npm start
```

For a process manager: `pm2 start npm --name refgd -- start`
For Docker: standard Next.js Dockerfile pattern works (Node 20+ image).

## Project layout

```
refgd/
├─ app/                  Next.js App Router pages
│  ├─ page.tsx           Landing
│  ├─ store-list/        Merged store list (all regions, filterable)
│  ├─ exclusive-mentorships/
│  ├─ evade-cancelations/
│  ├─ admin/             Hidden admin
│  └─ api/               Backend routes
├─ components/           Shared UI
├─ lib/                  Server utilities (db, auth, parsers)
├─ data/                 Seed data + sqlite db
├─ scripts/              CLI scripts (seed, parse)
└─ public/               Static assets
```

## License

Proprietary — operated by the RefundGod project.
