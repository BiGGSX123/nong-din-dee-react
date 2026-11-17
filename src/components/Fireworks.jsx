import { useEffect, useRef } from 'react';
import { playFirework } from '../lib/sound';

// saturated hues only — pale/white sparks vanish against the game's cream background
const COLORS = ['#FF3B5C', '#FF8A00', '#FFC300', '#2DB84C', '#1E9BF0', '#9B5CFF', '#FF4FA3'];
const GRAVITY = 0.045;

// canvas firework show for the harvest result — rockets rise from the bottom
// with a spark trail, then burst into a ring of colored, twinkling particles.
// Runs once (`bursts` rockets staggered from `startDelay` ms) and stops its
// animation loop as soon as the last particle fades, so it costs nothing after.
// `opening` extra rockets fire immediately from the left/right as the screen
// opens (this replaced the old CSS confetti), before the main show.
export default function Fireworks({ bursts = 6, startDelay = 0, opening = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const rockets = [];
    const sparks = [];
    const timers = [];
    let raf = 0;
    let running = false;

    const explode = (x, y, big) => {
      playFirework();
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const accent = COLORS[Math.floor(Math.random() * COLORS.length)];
      const n = big ? 80 : 58;
      const speed = big ? 5.4 : 4.3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.12;
        const s = speed * (0.55 + Math.random() * 0.5);
        sparks.push({
          x, y, px: x, py: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 1, decay: 0.011 + Math.random() * 0.01,
          color: i % 3 === 0 ? accent : color, size: 2.4 + Math.random() * 1.8,
        });
      }
      // bright flash core
      sparks.push({ x, y, px: x, py: y, vx: 0, vy: 0, life: 1, decay: 0.07, color, size: 22, flash: true });
    };

    // opening rockets (xFrac given) start mid-screen so they pop within ~0.5s
    const launch = (i, xFrac) => {
      const x = W * (xFrac ?? 0.15 + Math.random() * 0.7);
      const targetY = H * (0.12 + Math.random() * 0.3);
      rockets.push({ x, y: xFrac == null ? H + 6 : H * 0.6, vx: (Math.random() - 0.5) * 0.8, vy: -(5.2 + Math.random() * 1.6), targetY, big: i % 3 === 2 });
      if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
    };

    // physics is written per 60fps frame; `dt` rescales each step by real
    // elapsed time so a slow phone plays the show at the same speed (just
    // with fewer frames) instead of in slow motion
    let last = 0;
    function frame(now) {
      const dt = last ? Math.min(3, (now - last) / 16.67) : 1;
      last = now;
      const drag = 0.985 ** dt;
      ctx.clearRect(0, 0, W, H);
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx * dt; r.y += r.vy * dt; r.vy += GRAVITY * 0.6 * dt;
        ctx.fillStyle = '#FF9F1C';
        ctx.beginPath(); ctx.arc(r.x, r.y, 3, 0, Math.PI * 2); ctx.fill();
        // trailing sparks behind the rocket
        sparks.push({ x: r.x, y: r.y + 3, px: r.x, py: r.y + 3, vx: (Math.random() - 0.5) * 0.4, vy: 0.6, life: 0.7, decay: 0.045, color: '#FF9F1C', size: 1.8 });
        if (r.y <= r.targetY || r.vy >= -0.6) { rockets.splice(i, 1); explode(r.x, r.y, r.big); }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.px = p.x; p.py = p.y;
        p.vx *= drag; p.vy = p.vy * drag + GRAVITY * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.life -= p.decay * dt;
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        if (p.flash) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          g.addColorStop(0, `rgba(255,255,255,${p.life})`);
          g.addColorStop(0.35, p.color);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = p.life;
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          continue;
        }
        // twinkle: late in life, particles flicker
        const alpha = p.life < 0.35 ? p.life * (0.5 + Math.random() * 0.8) : p.life;
        // soft halo = a wide faint stroke under the spark (cheap stand-in for
        // shadowBlur, which is far too slow on phones with hundreds of sparks)
        const a = Math.min(1, alpha);
        ctx.strokeStyle = p.color;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.px - p.vx * 2.4, p.py - p.vy * 2.4); ctx.lineTo(p.x, p.y);
        ctx.globalAlpha = a * 0.25; ctx.lineWidth = p.size * 3; ctx.stroke();
        ctx.globalAlpha = a; ctx.lineWidth = p.size; ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (rockets.length || sparks.length) raf = requestAnimationFrame(frame);
      else { running = false; ctx.clearRect(0, 0, W, H); }
    }

    for (let k = 0; k < opening; k++) {
      const side = k % 2 === 0 ? 0.2 : 0.8;
      timers.push(setTimeout(() => launch(-1, side + (Math.random() - 0.5) * 0.1), k * 150));
    }
    for (let i = 0; i < bursts; i++) {
      const jitter = Math.random() * 180;
      timers.push(setTimeout(() => launch(i), startDelay + i * 320 + jitter));
    }
    window.addEventListener('resize', resize);
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [bursts, startDelay, opening]);

  return <canvas ref={canvasRef} className="fireworks-canvas" aria-hidden="true" />;
}
