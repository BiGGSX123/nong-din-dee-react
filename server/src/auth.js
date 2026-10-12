import jwt from 'jsonwebtoken';
import { prisma } from './db.js';

const SESSION_COOKIE = 'ndd_session';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// verifies a LIFF-issued ID token server-side against LINE's own verify endpoint —
// never trust a userId/profile the client sends without this
export async function verifyLineIdToken(idToken) {
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: process.env.LINE_CHANNEL_ID }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.error('LINE id token verify failed', res.status, data);
    return null;
  }
  // data: { sub, name, picture, ... } — sub is the stable LINE userId
  return data;
}

export function issueSession(res, player) {
  const token = jwt.sign({ playerId: player.id }, process.env.SESSION_JWT_SECRET, { expiresIn: '30d' });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_MS,
  });
}

export function clearSession(res) {
  res.clearCookie(SESSION_COOKIE);
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ error: 'not logged in' });
  try {
    const payload = jwt.verify(token, process.env.SESSION_JWT_SECRET);
    req.playerId = payload.playerId;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid session' });
  }
}

// admin routes are gated by the logged-in player's own role — replaces the
// old shared-secret bearer token now that real accounts exist via LINE login
export function requireAdminRole(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const player = await prisma.player.findUnique({ where: { id: req.playerId } });
      if (!player || player.role !== 'admin') return res.status(403).json({ error: 'admin role required' });
      next();
    } catch {
      res.status(500).json({ error: 'failed to verify admin role' });
    }
  });
}
