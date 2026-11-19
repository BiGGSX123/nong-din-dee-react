// "hybrid" asset preloading:
//  1) preloadCritical() — starts on app mount, i.e. WHILE the loading screen is
//     already waiting for LINE + the game data, so it costs no extra wait:
//     what's on screen right after it (map, soil islands, menu/HUD icons,
//     the welcome popup's mascot poses).
//  2) preloadRest() — after the game is showing, quietly fetches everything
//     else (crops, characters, shop/reward icons, …) a few at a time when the
//     browser is idle, so later screens open with their art ready.
// Skipped on Data Saver / 2G. Browser caching (nginx: art cached for a day)
// makes later visits instant either way.
import { SOIL, CROPS } from '../data/content';
import { CHARACTERS } from '../data/characters';
import { SHOP_ITEMS } from '../data/shopItems';
import { REWARDS } from '../data/rewards';
import { NAV_TABS } from '../data/nav';
import { TF_LEVELS } from './tfQuestions';
import { CHOICE_ICON_URLS } from './choiceIcons';

const MASCOT = (pose) => `/mascot/nong-din-dee${pose ? `-${pose}` : ''}.webp`;
const UI = (name) => `/icons/ui/${name}.webp`;

const CRITICAL = [
  '/bg/map-bg.webp',
  ...SOIL.map((s) => s.img),
  ...NAV_TABS.map((t) => t.img),
  '/icons/shop/points.webp', '/icons/shop/shop.webp', UI('gear'), UI('lock'), UI('home'), UI('pin'),
  MASCOT(), MASCOT('point'), MASCOT('cheer'), MASCOT('thinking'),
];

const REST = [
  ...CROPS.map((c) => c.img),
  ...CHOICE_ICON_URLS,
  ...CHARACTERS.map((c) => c.img),
  ...SHOP_ITEMS.map((i) => i.img),
  ...REWARDS.map((r) => r.img),
  ...Object.values(TF_LEVELS).map((l) => l.img),
  MASCOT('happy'), MASCOT('sad'),
  UI('sprout'), UI('book'), UI('gift'), UI('trophy'), UI('basket'), UI('map'),
  '/icons/shop/combo.webp', '/icons/shop/heart.webp', '/icons/shop/survival.webp', '/icons/shop/time.webp', '/icons/shop/double.webp', '/icons/shop/fifty.webp',
  '/car/red.webp', '/car/blue.webp', '/car/yellow.webp', '/car/green.webp',
];

const started = new Set();

function load(url) {
  if (!url || started.has(url)) return Promise.resolve();
  started.add(url);
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve();
    img.onerror = () => resolve(); // a missing file must never break the game
    img.src = url;
  });
}

function saveDataOn() {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null;
  return Boolean(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
}

const idle = (cb) => (typeof window.requestIdleCallback === 'function'
  ? window.requestIdleCallback(cb, { timeout: 2000 })
  : setTimeout(cb, 200));

export function preloadCritical() {
  if (saveDataOn()) return;
  CRITICAL.forEach(load);
}

let restScheduled = false;
export function preloadRest() {
  if (restScheduled || saveDataOn()) return;
  restScheduled = true;
  const queue = [...new Set(REST)].filter((u) => u && !started.has(u));
  const CONCURRENCY = 3;
  const next = () => {
    if (!queue.length) return;
    idle(() => { const url = queue.shift(); load(url).then(next); });
  };
  for (let i = 0; i < CONCURRENCY; i++) next();
}

// exposed for tests/diagnostics
export const PRELOAD_LISTS = { CRITICAL, REST };
