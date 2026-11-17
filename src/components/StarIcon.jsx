// chunky 5-point star, fat rounded points (inner/outer radius ratio ~0.58)
export const STAR_PATH = 'M12 1 L15.76 6.82 L22.46 8.6 L18.09 13.98 L18.47 20.9 L12 18.4 L5.53 20.9 L5.91 13.98 L1.54 8.6 L8.24 6.82 Z';

// casual-mobile-game style star: dark rim, orange body, raised pale-gold top
// face and a glossy highlight — all vector so it stays crisp from 12px (HUD
// pills) up to the big result stars. Gradients/clip live in SvgDefs.jsx.
const TOP_FACE = 'translate(12 11.6) scale(0.66) translate(-12 -11.6)';

export default function StarIcon({ filled, className = '' }) {
  if (!filled) {
    return (
      <svg viewBox="-2 -2 28 28" className={`star-icon empty ${className}`} aria-hidden="true">
        <path d={STAR_PATH} fill="#4A3423" fillOpacity="0.28" stroke="#4A3423" strokeOpacity="0.38" strokeWidth="3" strokeLinejoin="round" />
        <path d={STAR_PATH} transform={TOP_FACE} fill="#4A3423" fillOpacity="0.18" />
        <path d={STAR_PATH} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.8" strokeLinejoin="round" transform="translate(0 0.9)" />
      </svg>
    );
  }
  return (
    <svg viewBox="-2 -2 28 28" className={`star-icon filled ${className}`} aria-hidden="true">
      <path d={STAR_PATH} fill="#8A4508" stroke="#8A4508" strokeWidth="3.4" strokeLinejoin="round" />
      <path d={STAR_PATH} fill="url(#starBaseGrad)" stroke="url(#starBaseGrad)" strokeWidth="1.1" strokeLinejoin="round" />
      <path d={STAR_PATH} transform={TOP_FACE} fill="url(#starTopGrad)" stroke="url(#starTopGrad)" strokeWidth="1.4" strokeLinejoin="round" />
      <ellipse cx="9.4" cy="7.9" rx="2.3" ry="3.6" transform="rotate(-35 9.4 7.9)" fill="#fff" opacity="0.8" clipPath="url(#starClipPath)" />
      <circle cx="16.4" cy="9.6" r="0.9" fill="#fff" opacity="0.75" />
    </svg>
  );
}
