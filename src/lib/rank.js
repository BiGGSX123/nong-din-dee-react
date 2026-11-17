// player rank title from levels passed (≥1 star) — shown under the name in
// the HUD and on the profile, with progress toward the next title
export const RANKS = [
  { min: 0, title: 'มือใหม่หัดปลูก' },
  { min: 5, title: 'เกษตรกรฝึกหัด' },
  { min: 20, title: 'เกษตรกรตัวจริง' },
  { min: 40, title: 'ปราชญ์ดิน' },
  { min: 77, title: 'เซียนดินทั่วไทย' },
];

export function rankOf(passed) {
  let i = 0;
  while (i + 1 < RANKS.length && passed >= RANKS[i + 1].min) i++;
  const next = RANKS[i + 1];
  const pct = next ? Math.round(((passed - RANKS[i].min) / (next.min - RANKS[i].min)) * 100) : 100;
  return { level: i + 1, title: RANKS[i].title, next, pct };
}
