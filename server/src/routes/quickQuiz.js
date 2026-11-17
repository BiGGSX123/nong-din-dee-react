import { Router } from 'express';
import { prisma } from '../db.js';
import { logPoints } from '../pointLog.js';
import { requireAuth } from '../auth.js';
import { takeArmedDouble } from './shop.js';

export const quickQuizRouter = Router();

// "ถูกหรือผิด?" quick-quiz rounds award points on top of map progress and can
// be replayed forever. The client only reports how many it got right — the
// point value is computed HERE so a client can't send an arbitrary amount.
// Mirrors TF_ROUND_SIZE / TF_LEVELS / roundPoints() in src/lib/tfQuestions.js:
// base points per correct answer by difficulty, plus a stacking combo bonus —
// the n-th correct answer in a row adds +(n-1), reset by a miss.
const ROUND_SIZE = 10;
const LEVELS = {
  easy: { perCorrect: 1 },
  medium: { perCorrect: 2 },
  hard: { perCorrect: 3 },
  // endless "เอาตัวรอด": flat 2 per correct, no combo; the run ends on the
  // 3rd miss, so a valid run has at most 3 misses (cap length as a sanity limit)
  survival: { perCorrect: 2, maxLen: 300, maxMisses: 3 }, // combo counts here too
};

function scoreRound(results, level) {
  let streak = 0;
  let total = 0;
  for (const ok of results) {
    if (ok) { streak += 1; total += level.perCorrect + (level.noCombo ? 0 : streak - 1); } else streak = 0;
  }
  return total;
}
// a real round can't finish faster than this; stops scripted rapid-fire farming
const MIN_ROUND_MS = 20_000;

// in-memory throttle (resets on restart — a light speed bump, not a ledger)
const lastAwardAt = new Map();

// body: { results, boost, difficulty } — results = per-question right/wrong
// (true/false) for the round, in order, so the combo can be scored here;
// difficulty easy|medium|hard|survival (default medium). An older client may send just
// { correct } (a count): it gets base points only, no combo. boost =
// the player used a "double" item during it (only honoured if /api/shop/use
// actually armed one for them)
quickQuizRouter.post('/', requireAuth, async (req, res) => {
  const level = LEVELS[req.body?.difficulty ?? 'medium'];
  if (!level) return res.status(400).json({ error: 'invalid difficulty' });
  let results = req.body?.results;
  if (results !== undefined) {
    if (!Array.isArray(results) || results.length > (level.maxLen || ROUND_SIZE) || !results.every((r) => typeof r === 'boolean')) {
      return res.status(400).json({ error: 'invalid results' });
    }
    if (level.maxMisses !== undefined && results.filter((r) => !r).length > level.maxMisses) {
      return res.status(400).json({ error: 'too many misses' });
    }
  } else {
    if (level.maxLen) return res.status(400).json({ error: 'results required' });
    const correct = Number(req.body?.correct);
    if (!Number.isInteger(correct) || correct < 0 || correct > ROUND_SIZE) {
      return res.status(400).json({ error: 'invalid correct count' });
    }
    // legacy count-only submission: no order known, so no combo
    results = null;
    req.legacyCorrect = correct;
  }
  const now = Date.now();
  if (now - (lastAwardAt.get(req.playerId) ?? 0) < MIN_ROUND_MS) {
    return res.status(429).json({ error: 'round submitted too soon' });
  }
  lastAwardAt.set(req.playerId, now);

  const base = results ? scoreRound(results, level) : req.legacyCorrect * level.perCorrect;
  const doubled = req.body?.boost === true && takeArmedDouble(req.playerId);
  const awarded = doubled ? base * 2 : base;
  const difficulty = req.body?.difficulty ?? 'medium';
  const [player] = await prisma.$transaction([
    prisma.player.update({
      where: { id: req.playerId },
      data: { points: { increment: awarded } },
    }),
    ...(awarded > 0 ? [logPoints(prisma, req.playerId, awarded, 'quiz', doubled ? `${difficulty}:x2` : difficulty)] : []),
  ]);
  if (results) await recordQuizBest(req.playerId, difficulty, results, awarded).catch((e) => console.error('[quiz-best]', e));
  res.json({ awarded, doubled, points: player.points });
});

// keep the player's best run for this mode (score incl. the x2 item) and longest combo
async function recordQuizBest(playerId, mode, results, score) {
  let streak = 0;
  let combo = 0;
  for (const ok of results) { streak = ok ? streak + 1 : 0; combo = Math.max(combo, streak); }
  const correct = results.filter(Boolean).length;
  const where = { playerId_mode: { playerId, mode } };
  const prev = await prisma.quizBest.findUnique({ where });
  if (!prev) {
    await prisma.quizBest.create({ data: { playerId, mode, bestScore: score, bestCorrect: correct, bestCombo: combo } });
    return;
  }
  const better = score > prev.bestScore;
  if (!better && combo <= prev.bestCombo) return;
  await prisma.quizBest.update({
    where,
    data: {
      ...(better ? { bestScore: score, bestCorrect: correct, achievedAt: new Date() } : {}),
      bestCombo: Math.max(prev.bestCombo, combo),
    },
  });
}
