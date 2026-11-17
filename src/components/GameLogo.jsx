// game logo "LDD Soil Quest": the clay soil-pot emblem (public/logo.webp —
// its ribbon is left blank) with a big "LDD" lettered on the ribbon, then the
// two-tone "SOIL QUEST" wordmark and the "77 จังหวัด" badge. All lettering is
// vector text: crisp at any size and always spelled right.

// thick game-title look: dark outer outline → white sticker edge → fill
const OUTLINE = [
  { key: 'rim', stroke: '#3B2210', strokeWidth: 22 },
  { key: 'edge', stroke: '#fff', strokeWidth: 11 },
];

export default function GameLogo({ className = '', rays = false }) {
  return (
    <div className={`game-logo ${className}`} role="img" aria-label="LDD Soil Quest 77 จังหวัด">
      {rays && <div className="game-logo-rays" aria-hidden="true" />}
      {/* clay soil-pot emblem with "LDD" lettered big on its blank ribbon */}
      <div className="game-logo-emblem">
        <img className="game-logo-art" src="/logo.webp" alt="" />
        <svg className="game-logo-title" viewBox="0 0 512 464" aria-hidden="true">
          <defs>
            {/* gentle smile curve matching the ribbon's front panel */}
            <path id="logoTitleArc" d="M 40 392 Q 256 450 472 392" />
          </defs>
          {[...OUTLINE, { key: 'fill' }].map((l) => (
            <text key={l.key} className="game-logo-ldd" fill={l.stroke || 'url(#logoLddFill)'} stroke={l.stroke || 'none'} strokeWidth={l.strokeWidth || 0} strokeLinejoin="round">
              <textPath href="#logoTitleArc" startOffset="50%" textAnchor="middle">LDD</textPath>
            </text>
          ))}
        </svg>
      </div>

      <svg className="game-logo-word" viewBox="0 8 600 140" aria-hidden="true">
        <defs>
          <linearGradient id="logoLddFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFE4B8" />
            <stop offset="0.5" stopColor="#FF9F5C" />
            <stop offset="1" stopColor="#E0601F" />
          </linearGradient>
          <linearGradient id="logoSoilFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFD3A0" />
            <stop offset="0.5" stopColor="#E9894A" />
            <stop offset="1" stopColor="#A9531F" />
          </linearGradient>
          <linearGradient id="logoQuestFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D8F78F" />
            <stop offset="0.5" stopColor="#6CC83F" />
            <stop offset="1" stopColor="#2E8A2A" />
          </linearGradient>
        </defs>
        {/* curves the same way as the ribbon above it */}
        <path id="logoWordArc" d="M 24 90 Q 300 168 576 90" fill="none" />
        {[...OUTLINE, { key: 'fill' }].map((l) => (
          <text key={l.key} className="game-logo-wordtext"
            fill={l.stroke || undefined} stroke={l.stroke || 'none'} strokeWidth={l.strokeWidth ? l.strokeWidth * 1.1 : 0} strokeLinejoin="round">
            <textPath href="#logoWordArc" startOffset="50%" textAnchor="middle">
              <tspan fill={l.stroke ? undefined : 'url(#logoSoilFill)'}>SOIL</tspan>
              <tspan dx="22" fill={l.stroke ? undefined : 'url(#logoQuestFill)'}>QUEST</tspan>
            </textPath>
          </text>
        ))}
      </svg>

      <div className="game-logo-badge"><b>77</b><span>จังหวัด</span></div>
    </div>
  );
}
