import { Router } from 'express';

// POST /api/client-log — the game reports which startup/login stage a player
// got stuck on (see reportClientIssue in src/lib/api.js). Written to the API
// log as one "[client-issue] {...}" line so real-device failures (LINE login on
// a given phone/network) can be diagnosed from `docker compose logs api`.
// No auth (it fires before login); size-capped and rate-limited per IP.
export const clientLogRouter = Router();

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map(); // ip -> { n, since }

const clean = (v, max) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, max);

clientLogRouter.post('/', (req, res) => {
  const ip = req.headers['x-real-ip'] || req.ip || 'unknown';
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  const h = hits.get(ip);
  if (h && now - h.since < WINDOW_MS) {
    h.n += 1;
    if (h.n > MAX_PER_WINDOW) return res.status(429).end();
  } else {
    hits.set(ip, { n: 1, since: now });
  }
  const b = req.body || {};
  console.log('[client-issue]', JSON.stringify({
    stage: clean(b.stage, 40),
    message: clean(b.message, 300),
    timeout: Boolean(b.timeout),
    returningFromLine: Boolean(b.returningFromLine),
    inLineApp: Boolean(b.inLineApp),
    ua: clean(b.ua, 200),
  }));
  res.status(204).end();
});
