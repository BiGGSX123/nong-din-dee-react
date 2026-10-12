import cron from 'node-cron';
import { prisma } from '../db.js';

const DAILY_BONUS_RATE = 0.01; // 1% — e.g. 100 points -> +1 point

// gives every player a 1% bonus on their current total points, rounded per
// player (100 -> 101, 50 -> 51 since 50*1.01=50.5 rounds up) — players with 0
// points get 0*1.01=0, so no bonus until they've earned something
export async function applyDailyBonus() {
  const players = await prisma.player.findMany({ select: { id: true, points: true } });
  let updated = 0;
  for (const p of players) {
    const bonus = Math.round(p.points * DAILY_BONUS_RATE);
    if (bonus <= 0) continue;
    await prisma.player.update({ where: { id: p.id }, data: { points: p.points + bonus } });
    updated++;
  }
  console.log(`[daily-bonus] applied 1% bonus to ${updated}/${players.length} player(s)`);
}

// fires at 00:00 Asia/Bangkok every day — this is a Thai farming game, so
// "midnight" means Thailand midnight regardless of where the server runs
export function scheduleDailyBonus() {
  cron.schedule('0 0 * * *', () => {
    applyDailyBonus().catch((err) => console.error('[daily-bonus] failed', err));
  }, { timezone: 'Asia/Bangkok' });
  console.log('[daily-bonus] scheduled for 00:00 Asia/Bangkok daily');
}
