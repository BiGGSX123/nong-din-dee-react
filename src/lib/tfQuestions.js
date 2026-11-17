// True/False quiz generator for the "ถูกหรือผิด?" mode. Every statement is
// built from the same LDD-sourced data the Knowledge screen shows
// (src/data/knowledge.js), so the answer key is never hand-written:
//   - crop ↔ soil   (only "best" = true / "poor" = false — "moderate" fits are
//                     skipped because they're not clearly right or wrong)
//   - crop ↔ fertilizer, remedy ↔ problem, soil ↔ problem
import { SOIL, CROPS, cropById, soilById } from '../data/content';
import { careIcon } from './choiceIcons';
import {
  CROP_KNOWLEDGE, CROP_FERT_CORRECT, CARE_PROBLEM_LABELS, SOIL_PROBLEMS,
} from '../data/knowledge';

// difficulty levels — time per question, which statement kinds appear, and
// base points per correct answer. Combo bonus: the n-th correct answer in a
// row adds +(n-1) on top (2nd +1, 3rd +2, …), reset by a miss. Mirrors LEVELS /
// scoring in server/src/routes/quickQuiz.js, which awards them for logged-in
// players.
export const TF_ROUND_SIZE = 10;
export const TF_LEVELS = {
  easy: { id: 'easy', label: 'ง่าย', icon: '🌱', img: '/icons/level/easy.webp', timeMs: 15000, perCorrect: 1, hint: 'พืชกับดิน · พืชกับปุ๋ย' },
  medium: { id: 'medium', label: 'กลาง', icon: '🌿', img: '/icons/level/medium.webp', timeMs: 10000, perCorrect: 2, hint: 'ครบทุกเรื่อง' },
  hard: { id: 'hard', label: 'ยาก', icon: '🌳', img: '/icons/level/hard.webp', timeMs: 5000, perCorrect: 3, hint: 'เน้นปัญหาดิน · วิธีแก้' },
  // endless mode: keep answering until all lives are gone; flat points, no combo
  survival: {
    id: 'survival', label: 'เอาตัวรอด', icon: '❤️', img: '/icons/shop/survival.webp', timeMs: 10000, perCorrect: 2,
    survival: true, lives: 3, hint: 'ตอบไปเรื่อยๆ จนหัวใจหมด',
  },
};
export const TF_LEVEL_IDS = Object.keys(TF_LEVELS);

// points for one answer: base + combo bonus for the streak it extends
export const answerPoints = (streak, difficulty = 'medium') => {
  const lv = TF_LEVELS[difficulty] || TF_LEVELS.medium;
  return lv.perCorrect + (lv.noCombo ? 0 : Math.max(0, streak - 1));
};

// whole round from per-question results ([true, false, …]) → { base, combo, total }
export function roundPoints(results, difficulty = 'medium') {
  const lv = TF_LEVELS[difficulty] || TF_LEVELS.medium;
  let streak = 0; let base = 0; let combo = 0;
  for (const ok of results) {
    if (ok) { streak += 1; base += lv.perCorrect; if (!lv.noCombo) combo += streak - 1; } else streak = 0;
  }
  return { base, combo, total: base + combo };
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const coin = () => Math.random() < 0.5;

// strip the English part in parentheses from labels like "ดินเค็ม (Saline Soils)"
const short = (label) => label.replace(/\s*\(.*?\)\s*/g, '').trim();

function cropSoil() {
  const playable = (ids) => ids.filter((id) => soilById(id));
  // only crops that can produce BOTH a true and a false statement, so the
  // answer key stays ~50/50 (crops whose only "best" soil is loam — not in
  // the game — would otherwise always be "false")
  const candidates = CROP_KNOWLEDGE.filter((c) => cropById(c.id) && playable(c.best).length && playable(c.poor).length);
  if (!candidates.length) return null;
  const k = pick(candidates);
  const best = playable(k.best);
  const poor = playable(k.poor);
  const truth = coin();
  const soil = soilById(pick(truth ? best : poor));
  const bestNames = best.map((id) => soilById(id).nameTh);
  return {
    text: `${k.nameTh} เหมาะที่จะปลูกบน${soil.nameTh}`,
    answer: truth,
    explain: truth
      ? `${k.nameTh}เหมาะมากกับ${soil.nameTh}`
      : `${k.nameTh}ไม่ค่อยเหมาะกับ${soil.nameTh}${bestNames.length ? ` — ดินที่เหมาะคือ ${bestNames.join(', ')}` : ''}`,
    img: cropById(k.id).img,
  };
}

function cropFert(fertilizers) {
  const crop = pick(CROPS);
  const rightIdx = CROP_FERT_CORRECT[crop.id];
  const right = fertilizers[rightIdx];
  if (!right) return null;
  const truth = coin();
  const others = fertilizers.map((_, i) => i).filter((i) => i !== rightIdx);
  const shownIdx = truth ? rightIdx : pick(others);
  const shown = fertilizers[shownIdx];
  // labels may already start with "ปุ๋ย" (e.g. ปุ๋ยอินทรีย์) — don't say it twice
  const named = shown.label.startsWith('ปุ๋ย') ? shown.label : `ปุ๋ย${shown.label}`;
  return {
    text: `${crop.nameTh} ควรใส่${named}`,
    answer: truth,
    explain: `${crop.nameTh}ควรใส่ ${right.label}${right.sub ? ` (${right.sub})` : ''}`,
    img: crop.img,
  };
}

function careProblem(careMethods) {
  const n = Math.min(careMethods.length, CARE_PROBLEM_LABELS.length);
  if (n < 2) return null;
  const idx = Math.floor(Math.random() * n);
  const truth = coin();
  const probIdx = truth ? idx : pick([...Array(n).keys()].filter((i) => i !== idx));
  // skip giveaways where the problem's name is already in the method's own
  // text (e.g. "...ไถระเบิดดินดาน" → "แก้ปัญหาดินดาน")
  const probName = short(CARE_PROBLEM_LABELS[probIdx]).split(' /')[0];
  if (careMethods[idx].includes(probName)) return null;
  return {
    text: `"${careMethods[idx]}" ใช้แก้ปัญหา${short(CARE_PROBLEM_LABELS[probIdx])}`,
    answer: truth,
    explain: `"${careMethods[idx]}" ใช้แก้ปัญหา${short(CARE_PROBLEM_LABELS[idx])}`,
    img: careIcon(careMethods[idx]),
    icon: '🛠️',
  };
}

function soilProblem() {
  const soil = pick(SOIL);
  const mine = SOIL_PROBLEMS[soil.id].map((p) => p.label);
  // skip giveaways like "ดินเค็ม มักพบปัญหาดินเค็ม" (answer is in the name)
  const notObvious = (l) => !l.includes(soil.nameTh) && !soil.nameTh.includes(l.split(' /')[0]);
  const all = [...new Set(Object.values(SOIL_PROBLEMS).flat().map((p) => p.label))];
  const notMine = all.filter((l) => !mine.includes(l));
  const truth = coin() || !notMine.length;
  const pool = truth ? mine.filter(notObvious) : notMine;
  if (!pool.length) return null;
  const label = pick(pool);
  return {
    text: `${soil.nameTh} มักพบปัญหา${label}`,
    answer: truth,
    explain: `${soil.nameTh}มักพบปัญหา: ${mine.join(', ')}`,
    img: soil.img,
  };
}

// a round of `count` distinct statements. Easy sticks to crop↔soil and
// crop↔fertilizer; medium mixes all four kinds; hard leans on the soil-problem
// and remedy statements, which are the trickiest.
export function makeRound(count, { careMethods, fertilizers }, difficulty = 'medium') {
  const fert = () => cropFert(fertilizers);
  const care = () => careProblem(careMethods);
  const makers = {
    easy: [cropSoil, cropSoil, fert],
    medium: [cropSoil, cropSoil, fert, care, soilProblem],
    hard: [cropSoil, fert, care, care, soilProblem, soilProblem],
  }[difficulty === 'survival' ? 'medium' : difficulty] || [cropSoil, cropSoil, fert, care, soilProblem];
  const out = [];
  const seen = new Set();
  for (let tries = 0; out.length < count && tries < count * 30; tries++) {
    const q = pick(makers)();
    if (!q || seen.has(q.text)) continue;
    seen.add(q.text);
    out.push(q);
  }
  return out;
}

// survival mode: top up an endless run with `count` more statements, avoiding
// ones already asked this run when possible (repeats only once the pool runs dry)
export function moreQuestions(count, data, asked) {
  const seen = new Set(asked.map((q) => q.text));
  const fresh = [];
  for (let tries = 0; fresh.length < count && tries < 8; tries++) {
    for (const q of makeRound(count, data, 'survival')) {
      if (!seen.has(q.text)) { seen.add(q.text); fresh.push(q); }
      if (fresh.length >= count) break;
    }
  }
  return fresh.length ? fresh : makeRound(count, data, 'survival');
}
