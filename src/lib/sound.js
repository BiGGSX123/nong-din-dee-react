// lightweight synthesized SFX via Web Audio API — no audio files to fetch/host,
// generated on the fly so every sound is a plain JS function call
const VOLUME_KEY = 'ndd_sfx_volume';

function readStoredVolume() {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    const v = raw === null ? 1 : Number(raw);
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
  } catch {
    return 1; // storage unavailable (private mode, etc.) — just default on
  }
}

let masterVolume = typeof window === 'undefined' ? 1 : readStoredVolume();

export function getVolume() {
  return masterVolume;
}

// 0 = muted, 1 = full volume — every tone()'s gain is scaled by this
export function setVolume(v) {
  masterVolume = Math.min(1, Math.max(0, v));
  try { localStorage.setItem(VOLUME_KEY, String(masterVolume)); } catch { /* storage unavailable */ }
}

let ctx = null;
function getCtx() {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq, duration = 0.12, type = 'sine', gain = 0.16, delay = 0 }) {
  if (masterVolume <= 0) return;
  const c = getCtx();
  if (!c) return;
  const effectiveGain = gain * masterVolume;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(effectiveGain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

// short neutral tick for generic button presses across the app
export function playClick() {
  tone({ freq: 720, duration: 0.045, type: 'square', gain: 0.05 });
}

// quiz: right answer — quick rising major triad
export function playCorrect() {
  tone({ freq: 523.25, duration: 0.11, gain: 0.16 });
  tone({ freq: 659.25, duration: 0.14, gain: 0.16, delay: 0.07 });
  tone({ freq: 783.99, duration: 0.18, gain: 0.14, delay: 0.14 });
}

// quiz: wrong answer / timeout — short descending buzz
export function playWrong() {
  tone({ freq: 220, duration: 0.16, type: 'sawtooth', gain: 0.11 });
  tone({ freq: 164.81, duration: 0.22, type: 'sawtooth', gain: 0.11, delay: 0.09 });
}

// map: a new level just unlocked — cheerful 4-note fanfare
export function playUnlock() {
  tone({ freq: 392.0, duration: 0.1, type: 'triangle', gain: 0.14 });
  tone({ freq: 523.25, duration: 0.1, type: 'triangle', gain: 0.14, delay: 0.08 });
  tone({ freq: 659.25, duration: 0.16, type: 'triangle', gain: 0.16, delay: 0.16 });
  tone({ freq: 783.99, duration: 0.24, type: 'triangle', gain: 0.16, delay: 0.24 });
}

// harvest: passed the level (score >= 2, matches HarvestScreen's `passed`)
export function playHarvestPass() {
  tone({ freq: 392.0, duration: 0.12, gain: 0.16 });
  tone({ freq: 493.88, duration: 0.12, gain: 0.16, delay: 0.1 });
  tone({ freq: 587.33, duration: 0.14, gain: 0.16, delay: 0.2 });
  tone({ freq: 783.99, duration: 0.3, gain: 0.18, delay: 0.32 });
}

// harvest: failed the level
export function playHarvestFail() {
  tone({ freq: 349.23, duration: 0.18, gain: 0.13 });
  tone({ freq: 293.66, duration: 0.3, gain: 0.13, delay: 0.15 });
}

// harvest: one result star landing — a bright "ding" that climbs a step per
// star (i = 0, 1, 2) so three stars in a row sound like a rising fanfare
export function playStarLand(i = 0) {
  const base = [659.25, 783.99, 987.77][i] ?? 987.77;
  tone({ freq: base, duration: 0.18, type: 'triangle', gain: 0.17 });
  tone({ freq: base * 2, duration: 0.22, gain: 0.07, delay: 0.03 });
}

// short filtered white-noise burst — the "crackle" half of a firework
function noise({ duration = 0.4, gain = 0.12, delay = 0, freq = 2400 }) {
  if (masterVolume <= 0) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * duration));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain * masterVolume, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
}

// harvest: a firework bursting — low thump plus a sparkly crackle tail
export function playFirework() {
  tone({ freq: 110, duration: 0.18, type: 'sine', gain: 0.16 });
  noise({ duration: 0.12, gain: 0.1, freq: 900 });
  noise({ duration: 0.55, gain: 0.05, freq: 4200, delay: 0.06 });
}
