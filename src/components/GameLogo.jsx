// game logo: the clay emblem art (public/logo.webp, its ribbon is left blank)
// with the Thai title drawn as vector text on top — AI image models can't
// letter Thai reliably, and text keeps it crisp at any size. Title follows the
// ribbon's curve; "77 จังหวัด" sits under it as a chunky badge.
const LAYERS = [
  { key: 'rim', stroke: '#3B2210', strokeWidth: 22 }, // dark outer outline
  { key: 'edge', stroke: '#fff', strokeWidth: 11 }, // white sticker edge
  { key: 'fill', fill: 'url(#logoTitleFill)' }, // green glossy body
];

export default function GameLogo({ className = '', rays = false }) {
  return (
    <div className={`game-logo ${className}`} role="img" aria-label="น้องดินดี 77 จังหวัด">
      {rays && <div className="game-logo-rays" aria-hidden="true" />}
      <img className="game-logo-art" src="/logo.webp" alt="" />
      <svg className="game-logo-title" viewBox="0 0 512 464" aria-hidden="true">
        <defs>
          <linearGradient id="logoTitleFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#C9F27A" />
            <stop offset="0.5" stopColor="#6CC83F" />
            <stop offset="1" stopColor="#2E8A2A" />
          </linearGradient>
          {/* gentle smile curve matching the ribbon's front panel */}
          <path id="logoTitleArc" d="M 50 376 Q 256 436 462 376" />
        </defs>
        {LAYERS.map((l) => (
          <text
            key={l.key}
            className="game-logo-text"
            fill={l.fill || l.stroke}
            stroke={l.stroke || 'none'}
            strokeWidth={l.strokeWidth || 0}
            strokeLinejoin="round"
          >
            <textPath href="#logoTitleArc" startOffset="50%" textAnchor="middle">น้องดินดี</textPath>
          </text>
        ))}
      </svg>
      <div className="game-logo-badge"><b>77</b><span>จังหวัด</span></div>
    </div>
  );
}
