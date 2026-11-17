import { STAR_PATH } from './StarIcon';

export default function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {/* star body: warm gold at the top darkening to deep orange at the base */}
        <linearGradient id="starBaseGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFC93A" />
          <stop offset="55%" stopColor="#F7A21B" />
          <stop offset="100%" stopColor="#E0700A" />
        </linearGradient>
        {/* raised top face: pale butter-yellow, catches the light */}
        <linearGradient id="starTopGrad" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#FFF8C4" />
          <stop offset="45%" stopColor="#FFE15A" />
          <stop offset="100%" stopColor="#FFC22E" />
        </linearGradient>
        <clipPath id="starClipPath"><path d={STAR_PATH} /></clipPath>
      </defs>
    </svg>
  );
}
