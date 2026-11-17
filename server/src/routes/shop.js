import { Router } from 'express';
import { prisma } from '../db.js';
import { logPoints } from '../pointLog.js';
import { requireAuth } from '../auth.js';
import { ITEM_PRICES } from '../shopItems.js';

export const shopRouter = Router();

const asItems = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

// a "double" used inside a quick-quiz round is armed here and then claimed by
// /api/quick-quiz when that round is submitted (in-memory, expires after a
// while — a round never takes anywhere near this long)
const ARM_TTL_MS = 15 * 60 * 1000;
const armedDouble = new Map();
export function takeArmedDouble(playerId) {
  const at = armedDouble.get(playerId);
  armedDouble.delete(playerId);
  return Boolean(at && Date.now() - at < ARM_TTL_MS);
}

// body: { itemId } — spend points on one item
shopRouter.post('/buy', requireAuth, async (req, res) => {
  const { itemId } = req.body || {};
  const price = ITEM_PRICES[itemId];
  if (!price) return res.status(400).json({ error: 'unknown item' });
  try {
    const player = await prisma.$transaction(async (tx) => {
      const p = await tx.player.findUnique({ where: { id: req.playerId } });
      if (!p) throw Object.assign(new Error('player not found'), { status: 404 });
      if (p.points < price) throw Object.assign(new Error('not enough points'), { status: 400 });
      const items = asItems(p.items);
      await logPoints(tx, req.playerId, -price, 'shop', itemId);
      return tx.player.update({
        where: { id: req.playerId },
        data: { points: { decrement: price }, items: { ...items, [itemId]: (items[itemId] || 0) + 1 } },
      });
    });
    res.json({ points: player.points, items: asItems(player.items) });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.status ? e.message : 'purchase failed' });
  }
});

// body: { itemId, context } — consume one owned item ("tf" context arms a
// quick-quiz double for the round being played)
shopRouter.post('/use', requireAuth, async (req, res) => {
  const { itemId, context } = req.body || {};
  if (!ITEM_PRICES[itemId]) return res.status(400).json({ error: 'unknown item' });
  try {
    const player = await prisma.$transaction(async (tx) => {
      const p = await tx.player.findUnique({ where: { id: req.playerId } });
      if (!p) throw Object.assign(new Error('player not found'), { status: 404 });
      const items = asItems(p.items);
      if ((items[itemId] || 0) < 1) throw Object.assign(new Error('item not owned'), { status: 400 });
      return tx.player.update({
        where: { id: req.playerId },
        data: { items: { ...items, [itemId]: items[itemId] - 1 } },
      });
    });
    if (itemId === 'double' && context === 'tf') armedDouble.set(req.playerId, Date.now());
    res.json({ items: asItems(player.items) });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.status ? e.message : 'use failed' });
  }
});
