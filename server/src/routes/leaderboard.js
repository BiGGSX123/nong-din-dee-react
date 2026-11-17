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

// GET /api/leaderboard/stars — "อันดับดวงดาว": most map stars first; ties go
// to the higher total map score (sum of each level's best points), then to
// the higher spendable points (Player.points, "เงิน")
leaderboardRouter.get('/stars', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const [sums, players] = await Promise.all([
    prisma.levelProgress.groupBy({ by: ['playerId'], _sum: { stars: true, points: true } }),
    prisma.player.findMany({ select: { id: true, displayName: true, pictureUrl: true, points: true } }),
  ]);
  const byId = new Map(sums.map((s) => [s.playerId, s._sum]));
  const rows = players
    .map((p) => ({ ...p, stars: byId.get(p.id)?.stars ?? 0, mapScore: byId.get(p.id)?.points ?? 0 }))
    .sort((a, b) => b.stars - a.stars || b.mapScore - a.mapScore || b.points - a.points)
    .slice(0, limit);
  res.json({ players: rows });
});

// GET /api/leaderboard/quiz?mode=easy|medium|hard|survival — "ถูกหรือผิด?"
// best runs: highest round score (x2 included), then longest combo, then whoever
// got there first
const QUIZ_MODES = ['easy', 'medium', 'hard', 'survival'];
leaderboardRouter.get('/quiz', async (req, res) => {
  const mode = QUIZ_MODES.includes(req.query.mode) ? req.query.mode : 'medium';
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const rows = await prisma.quizBest.findMany({
    where: { mode, bestScore: { gt: 0 } },
    orderBy: [{ bestScore: 'desc' }, { bestCombo: 'desc' }, { achievedAt: 'asc' }],
    take: limit,
    include: { player: { select: { id: true, displayName: true, pictureUrl: true } } },
  });
  res.json({
    mode,
    players: rows.map((r) => ({ ...r.player, score: r.bestScore, correct: r.bestCorrect, combo: r.bestCombo })),
  });
});
