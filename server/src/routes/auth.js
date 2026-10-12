import { Router } from 'express';
import { prisma } from '../db.js';
import { verifyLineIdToken, issueSession, clearSession, requireAuth } from '../auth.js';

export const authRouter = Router();

// body: { idToken } — the LIFF ID token from liff.getIDToken() on the client
authRouter.post('/line', async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  const verified = await verifyLineIdToken(idToken);
  if (!verified || !verified.sub) return res.status(401).json({ error: 'invalid LINE id token' });

  const player = await prisma.player.upsert({
    where: { lineUserId: verified.sub },
    update: { displayName: verified.name ?? undefined, pictureUrl: verified.picture ?? undefined },
    create: {
      lineUserId: verified.sub,
      displayName: verified.name || 'ผู้เล่น',
      pictureUrl: verified.picture || null,
    },
    include: { progress: { orderBy: { levelIndex: 'asc' } } },
  });

  issueSession(res, player);
  res.json({ player });
});

authRouter.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({
    where: { id: req.playerId },
    include: { progress: { orderBy: { levelIndex: 'asc' } } },
  });
  if (!player) return res.status(404).json({ error: 'player not found' });
  res.json({ player });
});
