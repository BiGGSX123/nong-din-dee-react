import StarIcon from './StarIcon';

// coins or stars drifting down behind the ranking podium. Positions/timings
// are fixed pseudo-random (stable across renders); transform-only animation,
// so the GPU composites it without repainting the arena.
const COUNT = 14;
const ITEMS = Array.from({ length: COUNT }, (_, i) => ({
  x: (i * 71 + 7) % 100, // left %
  delay: -((i * 0.83) % 6), // negative: already mid-fall on first paint
  dur: 5 + ((i * 37) % 40) / 10, // 5–9s
  size: 14 + ((i * 13) % 14), // 14–27px
  spin: i % 2 ? 1 : -1,
}));

export default function FallingBits({ kind = 'coin' }) {
  return (
    <div className={`falling-bits ${kind}`} aria-hidden="true">
      {ITEMS.map((it, i) => (
        <span
          key={i}
          className="fall-bit"
          style={{ '--x': `${it.x}%`, '--d': `${it.delay}s`, '--t': `${it.dur}s`, '--s': `${it.size}px`, '--r': it.spin }}
        >
          {kind === 'coin' ? <img src="/icons/shop/points.webp" alt="" /> : <StarIcon filled />}
        </span>
      ))}
    </div>
  );
}
