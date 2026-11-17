// decorative QR-code-looking pattern (NOT a scannable code): three finder
// squares + pseudo-random modules seeded by `seed`, so each prize gets its own
// stable look. Used faded behind the "สินค้าหมด" stamp until real redemption
// (with real voucher QR codes) exists.
const N = 25;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function inFinder(x, y) {
  const zones = [[0, 0], [N - 7, 0], [0, N - 7]];
  return zones.some(([zx, zy]) => x >= zx - 1 && x <= zx + 7 && y >= zy - 1 && y <= zy + 7);
}

export default function FakeQR({ seed = 'qr', className = '' }) {
  let s = hash(seed) || 1;
  const rand = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1000) / 1000; };
  const cells = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // leave the middle clear for the prize icon, skip finder zones
      const mid = x >= 9 && x <= 15 && y >= 9 && y <= 15;
      if (!inFinder(x, y) && !mid && rand() < 0.5) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  }
  const finder = (fx, fy) => (
    <g key={`f${fx}${fy}`}>
      <rect x={fx} y={fy} width="7" height="7" />
      <rect x={fx + 1} y={fy + 1} width="5" height="5" fill="#fff" />
      <rect x={fx + 2} y={fy + 2} width="3" height="3" />
    </g>
  );
  return (
    <svg className={`fake-qr ${className}`} viewBox={`-1 -1 ${N + 2} ${N + 2}`} shapeRendering="crispEdges" aria-hidden="true">
      <rect x="-1" y="-1" width={N + 2} height={N + 2} fill="#fff" />
      <g fill="#2B2B2B">
        {cells}
        {finder(0, 0)}{finder(N - 7, 0)}{finder(0, N - 7)}
      </g>
    </svg>
  );
}
