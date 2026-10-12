import { Router } from 'express';
import { prisma } from '../db.js';

export const leaderboardRouter = Router();

leaderboardRouter.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const players = await prisma.player.findMany({
    orderBy: { points: 'desc' },
    take: limit,
    select: { id: true, displayName: true, pictureUrl: true, points: true },
  });
  res.json({ players });
});
