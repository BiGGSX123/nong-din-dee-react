import { Router } from 'express';
import { prisma } from '../db.js';

export const leaderboardRouter = Router();

// spendable points + everything already spent in the shop = total ever
// earned. (Spending only exists since the PointLog ledger did, so `spent` is
// complete; summing earned entries instead would miss pre-ledger points.)
async function spentByPlayer() {
  const rows = await prisma.pointLog.groupBy({ by: ['playerId'], where: { amount: { lt: 0 } }, _sum: { amount: true } });
  return new Map(rows.map((r) => [r.playerId, -(r._sum.amount ?? 0)]));
}
export async function totalEarned(playerId, points) {
  const agg = await prisma.pointLog.aggregate({ where: { playerId, amount: { lt: 0 } }, _sum: { amount: true } });
  return points - (agg._sum.amount ?? 0);
}

// GET /api/leaderboard — "จัดอันดับผู้เล่น": ranked by total points EARNED
// (not the remaining balance, so buying items/characters doesn't drop you).
// Every ranking's LAST tie-breaker is the account's creation date (older first)
leaderboardRouter.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const [players, spent] = await Promise.all([
    prisma.player.findMany({ select: { id: true, displayName: true, pictureUrl: true, points: true, createdAt: true } }),
    spentByPlayer(),
  ]);
  const rows = players
    .map((p) => ({ ...p, earned: p.points + (spent.get(p.id) ?? 0) }))
    .sort((a, b) => b.earned - a.earned || b.points - a.points || a.createdAt - b.createdAt)
    .slice(0, limit);
  res.json({ players: rows });
});

// GET /api/leaderboard/stars — "อันดับดวงดาว": most stars first; ties go to the
// higher adventure score (sum of each level's best points), then to the higher
// total points earned, then to the older account
leaderboardRouter.get('/stars', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const [sums, players, spent] = await Promise.all([
    prisma.levelProgress.groupBy({ by: ['playerId'], _sum: { stars: true, points: true } }),
    prisma.player.findMany({ select: { id: true, displayName: true, pictureUrl: true, points: true, createdAt: true } }),
    spentByPlayer(),
  ]);
  const byId = new Map(sums.map((s) => [s.playerId, s._sum]));
  // last tie-breaker = total points EARNED (balance + spent), same as the
  // points ranking, so spending in the shop never costs a place
  const rows = players
    .map((p) => ({ ...p, stars: byId.get(p.id)?.stars ?? 0, mapScore: byId.get(p.id)?.points ?? 0, earned: p.points + (spent.get(p.id) ?? 0) }))
    .sort((a, b) => b.stars - a.stars || b.mapScore - a.mapScore || b.earned - a.earned || a.createdAt - b.createdAt)
    .slice(0, limit);
  res.json({ players: rows });
});

// GET /api/leaderboard/quiz?mode=easy|medium|hard|survival — "ถูกหรือผิด?"
// best runs: highest round score (x2 included), then longest combo, then the
// older account. Players with no record in this mode are listed too (score 0,
// hasRecord false) after everyone who has one, oldest account first.
const QUIZ_MODES = ['easy', 'medium', 'hard', 'survival'];
leaderboardRouter.get('/quiz', async (req, res) => {
  const mode = QUIZ_MODES.includes(req.query.mode) ? req.query.mode : 'medium';
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const [players, bests] = await Promise.all([
    prisma.player.findMany({ select: { id: true, displayName: true, pictureUrl: true, createdAt: true } }),
    prisma.quizBest.findMany({ where: { mode, bestScore: { gt: 0 } } }),
  ]);
  const byId = new Map(bests.map((b) => [b.playerId, b]));
  const rows = players
    .map((p) => {
      const b = byId.get(p.id);
      return { ...p, hasRecord: Boolean(b), score: b?.bestScore ?? 0, correct: b?.bestCorrect ?? 0, combo: b?.bestCombo ?? 0 };
    })
    .sort((a, b) => b.score - a.score || b.combo - a.combo || a.createdAt - b.createdAt)
    .slice(0, limit);
  res.json({ mode, players: rows });
});
