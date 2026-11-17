import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';

export const playerRouter = Router();

// sets the player's home province — that level becomes the first unlocked
// level and the starting point of their personal play order (see levelOrder.js)
playerRouter.put('/home-province', requireAuth, async (req, res) => {
  const { province } = req.body || {};
  if (!province) return res.status(400).json({ error: 'province required' });

  const level = await prisma.adminLevel.findFirst({ where: { province } });
  if (!level) return res.status(400).json({ error: 'unknown province' });

  const player = await prisma.player.update({
    where: { id: req.playerId },
    data: { homeLevelIndex: level.index },
    include: { progress: { orderBy: { levelIndex: 'asc' } } },
  });
  res.json({ player });
});

// GET /api/player/history?limit=60 — the player's points history (newest
// first) plus lifetime earned/spent totals from the PointLog ledger
playerRouter.get('/history', requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 60, 1), 200);
  const where = { playerId: req.playerId };
  const [entries, earned, spent] = await prisma.$transaction([
    prisma.pointLog.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit,
      select: { id: true, amount: true, kind: true, ref: true, createdAt: true },
    }),
    prisma.pointLog.aggregate({ where: { ...where, amount: { gt: 0 } }, _sum: { amount: true } }),
    prisma.pointLog.aggregate({ where: { ...where, amount: { lt: 0 } }, _sum: { amount: true } }),
  ]);
  res.json({ entries, earned: earned._sum.amount ?? 0, spent: -(spent._sum.amount ?? 0) });
});
