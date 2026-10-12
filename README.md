# น้องดินดี 77 จังหวัด

React (Vite) frontend + Express/Prisma/PostgreSQL backend, styled after the
`PRMS` project's stack (`../PRMS/prms`) since it's the same department's
proven pattern.

## Local setup

```bash
# 1. Postgres (Docker)
docker compose up -d db

# 2. API server
cd server
cp .env.example .env   # fill in SESSION_JWT_SECRET (a random string)
npm install
npm run db:setup       # prisma db push + seed 77 levels / care methods / fertilizers
npm run dev             # http://localhost:8787

# 3. Frontend (separate terminal)
cd ..
cp .env.example .env.local
npm install
npm run dev             # http://localhost:5183
```

## What's real vs. not yet

- **Game content (levels, care methods, fertilizers)** lives in PostgreSQL via
  Prisma (`server/prisma/schema.prisma`) — shared by every player now,
  replacing the old per-browser `localStorage` config.
- **Admin panel** writes are gated by the logged-in player's own `Player.role`
  column (`"player"` or `"admin"`) — checked server-side on every write via
  the session cookie (`requireAdminRole` in `server/src/auth.js`), so it
  requires a real LINE login. There's no UI to grant the role yet; promote an
  account by hand:
  `UPDATE "Player" SET role = 'admin' WHERE "lineUserId" = '...';`
- **LINE Login (LIFF)** is wired end-to-end (`src/lib/liff.js`,
  `server/src/routes/auth.js`) but disabled until you set `VITE_LIFF_ID`
  (frontend `.env.local`) and `LINE_CHANNEL_ID` (server `.env`) from a LIFF
  app in the [LINE Developers Console](https://developers.line.biz/console/).
  Without it the app runs in **guest mode**: gameplay works exactly like the
  old demo (progress lives only in memory for that browser session, not
  persisted), while admin content already comes from the real database.
- Once LIFF is configured, finishing a level calls `POST /api/progress` and
  points/stars persist to the player's row (`Player` + `LevelProgress` in
  Postgres), and `/api/leaderboard` returns real players.
