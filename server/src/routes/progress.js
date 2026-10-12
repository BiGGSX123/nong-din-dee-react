import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';
import { personalizedOrder } from '../levelOrder.js';

export const progressRouter = Router();

// body: { levelIndex, completed, locked, stars, pickedCropId, points }
// `points` is this level's point value for the current attempt. Player.points
// is kept as the sum of every level's points — replaying a level replaces its
// stored value rather than adding a new amount on top, so grinding a level
// you've already finished can't inflate your total.
progressRouter.post('/', requireAuth, async (req, res) => {
  const { levelIndex, completed, locked, stars, pickedCropId, points } = req.body || {};
  if (typeof levelIndex !== 'number') return res.status(400).json({ error: 'levelIndex required' });

  const newPoints = typeof points === 'number' ? points : 0;
  const existing = await prisma.levelProgress.findUnique({
    where: { playerId_levelIndex: { playerId: req.playerId, levelIndex } },
  });
  const delta = newPoints - (existing?.points ?? 0);

  const [progressRow, player] = await prisma.$transaction([
    prisma.levelProgress.upsert({
      where: { playerId_levelIndex: { playerId: req.playerId, levelIndex } },
      create: { playerId: req.playerId, levelIndex, completed, locked, stars, pickedCropId, points: newPoints },
      update: { completed, locked, stars, pickedCropId, points: newPoints },
    }),
    delta !== 0
      ? prisma.player.update({ where: { id: req.playerId }, data: { points: { increment: delta } } })
      : prisma.player.findUnique({ where: { id: req.playerId } }),
  ]);

  // unlock the next level on a passing score, same rule the demo used (>=1 correct) —
  // "next" follows this player's personal order (home province first), not raw index+1
  if (typeof stars === 'number' && stars >= 1) {
    const allLevels = await prisma.adminLevel.findMany({ orderBy: { index: 'asc' }, select: { index: true } });
    const order = personalizedOrder(allLevels.map((l) => l.index), player.homeLevelIndex);
    const pos = order.indexOf(levelIndex);
    const nextIndex = pos === -1 ? undefined : order[pos + 1];
    if (nextIndex !== undefined) {
      await prisma.levelProgress.upsert({
        where: { playerId_levelIndex: { playerId: req.playerId, levelIndex: nextIndex } },
        create: { playerId: req.playerId, levelIndex: nextIndex, locked: false },
        update: { locked: false },
      });
    }
  }

  res.json({ progress: progressRow, points: player.points });
});
