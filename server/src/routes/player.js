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
