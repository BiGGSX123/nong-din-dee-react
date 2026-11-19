// synthesized game SFX via the Web Audio API — no audio files to fetch/host.
// Every voice runs through one shared bus (light reverb + compressor) so the
// sounds feel polished, sit at an even loudness and never clip when stacked.
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

// 0 = muted, 1 = full volume — every voice's gain is scaled by this
export function setVolume(v) {
  masterVolume = Math.min(1, Math.max(0, v));
  try { localStorage.setItem(VOLUME_KEY, String(masterVolume)); } catch { /* storage unavailable */ }
}

// ---------------------------------------------------------------- engine ---

let ctx = null;
let bus = null;
let noiseBuf = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  // iOS can also report 'interrupted' (call, other app) — wake it either way
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  return ctx;
}

// small, bright room: decaying stereo noise as the reverb impulse
function makeImpulse(c, seconds = 1.5, decay = 3.2) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
  }
  return buf;
}

function getBus(c) {
  if (bus) return bus;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.18;
  const out = c.createGain();
  out.gain.value = 1.15; // make-up gain after the compressor
  comp.connect(out).connect(c.destination);
  const dry = c.createGain();
  dry.connect(comp);
  const verb = c.createConvolver();
  verb.buffer = makeImpulse(c);
  const wet = c.createGain();
  wet.gain.value = 0.9;
  verb.connect(wet).connect(comp);
  bus = { dry, verb };
  return bus;
}

// one shared second of white noise, reused (random offset) by every hiss()
function getNoise(c) {
  if (noiseBuf) return noiseBuf;
  noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function ready() {
  if (masterVolume <= 0) return null;
  return getCtx();
}

// node → (pan) → dry bus, plus a reverb send of `rev`
function route(c, node, pan, rev) {
  const b = getBus(c);
  let n = node;
  if (pan && c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = pan;
    n.connect(p);
    n = p;
  }
  n.connect(b.dry);
  if (rev > 0) {
    const send = c.createGain();
    send.gain.value = rev;
    n.connect(send).connect(b.verb);
  }
}

// one synth note: optional pitch glide, detuned unison, low-pass sweep, vibrato
function voice({
  freq, to, glide, type = 'sine', dur = 0.15, gain = 0.15, delay = 0, attack = 0.004, hold = 0,
  unison = 1, detune = 0, lp, lpTo, q = 0.7, vib = 0, vibRate = 6, pan = 0, rev = 0.15,
}) {
  const c = ready();
  if (!c) return;
  const t0 = c.currentTime + 0.005 + delay;
  const end = t0 + dur;
  const peak = Math.max(0.0002, (gain * masterVolume) / Math.sqrt(unison));
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  if (hold) g.gain.setValueAtTime(peak, t0 + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  let out = g;
  if (lp) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = q;
    f.frequency.setValueAtTime(lp, t0);
    if (lpTo) f.frequency.exponentialRampToValueAtTime(lpTo, end);
    g.connect(f);
    out = f;
  }
  route(c, out, pan, rev);
  let vibGain = null;
  if (vib) {
    const lfo = c.createOscillator();
    lfo.frequency.value = vibRate;
    vibGain = c.createGain();
    vibGain.gain.value = vib; // cents
    lfo.connect(vibGain);
    lfo.start(t0);
    lfo.stop(end + 0.05);
  }
  for (let k = 0; k < unison; k++) {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + (glide ?? dur));
    osc.detune.value = unison > 1 ? (k / (unison - 1) - 0.5) * 2 * detune : detune;
    if (vibGain) vibGain.connect(osc.detune);
    osc.connect(g);
    osc.start(t0);
    osc.stop(end + 0.05);
  }
}

// filtered noise: whooshes, shimmer, crackle, impact texture
function hiss({ dur = 0.2, gain = 0.08, delay = 0, type = 'bandpass', freq = 3000, to, q = 1, attack = 0.004, pan = 0, rev = 0.1 }) {
  const c = ready();
  if (!c) return;
  const t0 = c.currentTime + 0.005 + delay;
  const end = t0 + dur;
  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (to) f.frequency.exponentialRampToValueAtTime(to, end);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * masterVolume), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  src.connect(f).connect(g);
  route(c, g, pan, rev);
  src.start(t0, Math.random() * 0.8);
  src.stop(end + 0.05);
}

// bell/chime: fundamental + inharmonic partials that die away faster
function bell(freq, { delay = 0, dur = 0.6, gain = 0.12, pan = 0, rev = 0.3 } = {}) {
  voice({ freq, type: 'sine', dur, gain, delay, pan, rev });
  voice({ freq: freq * 2.0, type: 'sine', dur: dur * 0.6, gain: gain * 0.35, delay, pan, rev });
  voice({ freq: freq * 3.01, type: 'sine', dur: dur * 0.35, gain: gain * 0.16, delay, pan, rev });
  voice({ freq: freq * 4.2, type: 'sine', dur: dur * 0.18, gain: gain * 0.08, delay, pan, rev });
}

const SPARKLE = [2093, 2349.3, 2637, 3136, 3520, 4186];
// a quick glittery run of tiny high notes, scattered across the stereo field
function sparkle({ n = 5, delay = 0, step = 0.035, gain = 0.035, rev = 0.45 } = {}) {
  for (let i = 0; i < n; i++) {
    const f = SPARKLE[Math.floor(Math.random() * SPARKLE.length)];
    voice({ freq: f, type: 'sine', dur: 0.14, gain, delay: delay + i * step, pan: Math.random() * 1.4 - 0.7, rev });
  }
}

const semis = (n) => 2 ** (n / 12);

// ---------------------------------------------------------------- sounds ---

// soft bubbly "pop" for generic button presses across the app
export function playClick() {
  voice({ freq: 420, to: 980, glide: 0.05, type: 'sine', dur: 0.08, gain: 0.19, rev: 0.04 });
  voice({ freq: 1900, type: 'triangle', dur: 0.03, gain: 0.025, rev: 0 });
}

// right answer — bright double chime + glitter. `streak` (1, 2, 3…) lifts the
// pitch a step per combo so a hot streak audibly climbs
export function playCorrect(streak = 1) {
  const up = semis(Math.min(Math.max(streak - 1, 0), 9) * 2);
  bell(1046.5 * up, { dur: 0.35, gain: 0.11, rev: 0.25 });
  bell(1568 * up, { delay: 0.075, dur: 0.55, gain: 0.12, rev: 0.3 });
  voice({ freq: 523.25 * up, type: 'triangle', dur: 0.22, gain: 0.07, delay: 0.075 });
  sparkle({ n: 4, delay: 0.12 });
  if (streak >= 3) {
    // combo: a rising whoosh under the chime
    hiss({ type: 'bandpass', freq: 900, to: 6000, q: 1.4, dur: 0.32, gain: 0.05, attack: 0.12, rev: 0.2 });
    sparkle({ n: 4, delay: 0.25, gain: 0.03 });
  }
}

// wrong answer / timeout — a rubbery "bwomp-bwomp", clear but not harsh
export function playWrong() {
  voice({ freq: 330, to: 290, type: 'square', lp: 1100, lpTo: 500, dur: 0.17, gain: 0.065, unison: 2, detune: 10, rev: 0.08 });
  voice({ freq: 262, to: 180, glide: 0.3, type: 'square', lp: 900, lpTo: 300, dur: 0.34, gain: 0.07, delay: 0.14, unison: 2, detune: 12, vib: 30, vibRate: 9, rev: 0.1 });
  voice({ freq: 110, to: 70, type: 'sine', dur: 0.2, gain: 0.07, delay: 0.14, rev: 0 });
}

// can't do that (sold out, not enough coins) — short gentle double boop
export function playDenied() {
  voice({ freq: 392, type: 'triangle', lp: 1600, dur: 0.1, gain: 0.11, rev: 0.05 });
  voice({ freq: 311, type: 'triangle', lp: 1400, dur: 0.16, gain: 0.11, delay: 0.1, rev: 0.08 });
}

// a new level unlocked / something opened up — magical rising arpeggio that
// blooms into a chord with a shimmer on top
export function playUnlock() {
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  notes.forEach((f, i) => voice({ freq: f, type: 'triangle', dur: 0.22, gain: 0.09, delay: i * 0.05, pan: (i - 2) * 0.15, rev: 0.3 }));
  bell(1568, { delay: 0.26, dur: 0.9, gain: 0.1, rev: 0.45 });
  bell(2093, { delay: 0.3, dur: 0.8, gain: 0.06, rev: 0.45 });
  hiss({ type: 'highpass', freq: 3000, to: 9000, dur: 0.6, gain: 0.03, delay: 0.1, attack: 0.2, rev: 0.4 });
  sparkle({ n: 6, delay: 0.3, step: 0.04 });
}

// power-up item used (extra time, x2, hint) — charging zap up + ding
export function playPowerUp() {
  voice({ freq: 220, to: 1320, glide: 0.26, type: 'sawtooth', lp: 900, lpTo: 5000, q: 4, dur: 0.3, gain: 0.07, unison: 3, detune: 14, rev: 0.15 });
  hiss({ type: 'bandpass', freq: 600, to: 5000, q: 2, dur: 0.28, gain: 0.04, attack: 0.15, rev: 0.15 });
  bell(1760, { delay: 0.26, dur: 0.6, gain: 0.1, rev: 0.4 });
  sparkle({ n: 4, delay: 0.3 });
}

// single coin pickup — the classic two-step "ba-ding!"
export function playCoin({ delay = 0, pitch = 1, gain = 1, pan = 0 } = {}) {
  voice({ freq: 987.77 * pitch, type: 'square', lp: 5000, dur: 0.07, gain: 0.05 * gain, delay, pan, rev: 0.1 });
  voice({ freq: 1318.5 * pitch, type: 'square', lp: 6000, dur: 0.38, gain: 0.055 * gain, delay: delay + 0.065, pan, rev: 0.25 });
  voice({ freq: 2637 * pitch, type: 'sine', dur: 0.3, gain: 0.03 * gain, delay: delay + 0.065, pan, rev: 0.3 });
}

// shop purchase — "ka-ching!": register clack, coin, glitter
export function playPurchase() {
  hiss({ type: 'bandpass', freq: 2500, q: 3, dur: 0.05, gain: 0.12, rev: 0.05 });
  voice({ freq: 180, to: 90, type: 'sine', dur: 0.08, gain: 0.12, rev: 0 });
  playCoin({ delay: 0.05 });
  bell(2637, { delay: 0.14, dur: 0.5, gain: 0.05, rev: 0.4 });
  sparkle({ n: 5, delay: 0.16 });
}

// daily coins claimed — a little shower of coins landing, then a chord
export function playCoinShower(count = 7) {
  for (let i = 0; i < count; i++) {
    playCoin({ delay: i * 0.075 + Math.random() * 0.02, pitch: semis([0, 2, 4, 7, 9, 12][i % 6]), gain: 0.7, pan: Math.random() * 1.2 - 0.6 });
  }
  const t = count * 0.075 + 0.05;
  [523.25, 659.25, 783.99, 1046.5].forEach((f) => bell(f, { delay: t, dur: 0.9, gain: 0.06, rev: 0.45 }));
  sparkle({ n: 6, delay: t, step: 0.05 });
}

// level passed — bright brassy fanfare with a timpani hit and a held chord
export function playHarvestPass() {
  const brass = (freq, delay, dur, gain = 0.09) => voice({
    freq, type: 'sawtooth', unison: 3, detune: 9, lp: 1400, lpTo: 2600, q: 1.2, attack: 0.02, dur, gain, delay, rev: 0.3,
  });
  brass(392, 0, 0.13);
  brass(523.25, 0.12, 0.13);
  brass(659.25, 0.24, 0.13);
  voice({ freq: 98, to: 60, type: 'sine', dur: 0.4, gain: 0.2, delay: 0.36, rev: 0.1 });
  hiss({ type: 'lowpass', freq: 500, dur: 0.15, gain: 0.08, delay: 0.36, rev: 0.1 });
  [523.25, 659.25, 783.99, 1046.5].forEach((f) => brass(f, 0.36, 0.85, 0.075));
  bell(2093, { delay: 0.42, dur: 1, gain: 0.07, rev: 0.5 });
  sparkle({ n: 8, delay: 0.45, step: 0.05 });
}

// level not passed — a friendly "aww" slide, not a punishment
export function playHarvestFail() {
  const horn = (freq, to, delay, dur) => voice({
    freq, to, type: 'sawtooth', unison: 2, detune: 8, lp: 1000, lpTo: 600, attack: 0.03, dur, gain: 0.08, delay, rev: 0.25,
  });
  horn(392, 392, 0, 0.2);
  horn(370, 370, 0.22, 0.2);
  horn(349.2, 349.2, 0.44, 0.2);
  voice({ freq: 329.6, to: 293.7, glide: 0.7, type: 'sawtooth', unison: 2, detune: 8, lp: 1000, lpTo: 400, attack: 0.03, dur: 0.8, gain: 0.085, delay: 0.66, vib: 35, vibRate: 5.5, rev: 0.3 });
}

// one result star landing (i = 0, 1, 2): thump + a chime that climbs a step
// per star; the third star gets a bigger shimmer
export function playStarLand(i = 0) {
  const base = [1318.5, 1568, 2093][i] ?? 2093;
  voice({ freq: 170, to: 60, type: 'sine', dur: 0.16, gain: 0.2, rev: 0 });
  hiss({ type: 'lowpass', freq: 1200, dur: 0.06, gain: 0.06, rev: 0 });
  bell(base, { delay: 0.02, dur: 0.7, gain: 0.16, pan: (i - 1) * 0.35, rev: 0.4 });
  voice({ freq: base / 2, type: 'triangle', dur: 0.3, gain: 0.06, delay: 0.02, rev: 0.2 });
  sparkle({ n: i === 2 ? 8 : 3, delay: 0.06, gain: i === 2 ? 0.04 : 0.03 });
  if (i === 2) hiss({ type: 'highpass', freq: 4000, to: 10000, dur: 0.8, gain: 0.035, delay: 0.05, attack: 0.15, rev: 0.5 });
}

// fireworks: a show fires many rockets ~0.3s apart, so each burst is a short,
// punchy "crack-boom" (not a long rumble that would pile up into mud), placed
// left/right by where it bursts, slightly re-pitched every time, and ducked
// when it lands right on top of the previous one
let lastBurstAt = -1;

// rocket leaving the ground — a quick airy "fwee" rising whistle
export function playFireworkLaunch({ pan = 0 } = {}) {
  const c = ready();
  if (!c) return;
  const f = 900 + Math.random() * 300;
  voice({ freq: f, to: f * 1.9, glide: 0.45, type: 'sine', dur: 0.5, gain: 0.018, attack: 0.08, vib: 25, vibRate: 14, pan, rev: 0.25 });
  hiss({ type: 'bandpass', freq: 1500, to: 4500, q: 3, dur: 0.45, gain: 0.03, attack: 0.1, pan, rev: 0.2 });
}

// the burst itself: sharp crack + round boom + short rumble, then a scattered
// glittery crackle as the sparks fall. `big` = the bigger rockets in the show
export function playFirework({ big = false, pan = 0 } = {}) {
  const c = ready();
  if (!c) return;
  const now = c.currentTime;
  const duck = lastBurstAt >= 0 && now - lastBurstAt < 0.25 ? 0.65 : 1;
  lastBurstAt = now;
  const v = (big ? 1.25 : 1) * duck;
  const pitch = 0.85 + Math.random() * 0.3;
  // "ปุ้ง": a deep, round thump — low sine dropping in pitch with a long tail
  voice({ freq: 105 * pitch, to: 38, glide: 0.35, type: 'sine', dur: 0.75, gain: 0.32 * v, attack: 0.003, pan: pan * 0.4, rev: 0.25 });
  // mid "body" an octave up so phone speakers (no real bass) still hear it as deep
  voice({ freq: 210 * pitch, to: 70, glide: 0.25, type: 'triangle', lp: 700, lpTo: 200, dur: 0.4, gain: 0.12 * v, attack: 0.003, pan, rev: 0.2 });
  // soft muffled attack instead of a bright crack
  hiss({ type: 'lowpass', freq: 1400, to: 300, dur: 0.12, gain: 0.12 * v, attack: 0.002, pan, rev: 0.2 });
  // low rumble the reverb carries away
  hiss({ type: 'lowpass', freq: 380, to: 90, dur: 0.8, gain: 0.11 * v, attack: 0.01, pan, rev: 0.5 });
  // a light fizz of falling sparks, kept quiet so the boom stays in front
  const n = big ? 8 : 5;
  for (let k = 0; k < n; k++) {
    hiss({
      type: 'bandpass', freq: 2000 + Math.random() * 3500, q: 8, dur: 0.025 + Math.random() * 0.02,
      gain: (0.015 + Math.random() * 0.015) * duck, attack: 0.001, delay: 0.35 + Math.random() * 0.7,
      pan: Math.max(-1, Math.min(1, pan + Math.random() * 0.7 - 0.35)), rev: 0.35,
    });
  }
  if (big) sparkle({ n: 3, delay: 0.2, step: 0.07, gain: 0.018 });
}
