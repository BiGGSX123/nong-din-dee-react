// chunky 5-point star, fat rounded points (inner/outer radius ratio ~0.58)
export const STAR_PATH = 'M12 1 L15.76 6.82 L22.46 8.6 L18.09 13.98 L18.47 20.9 L12 18.4 L5.53 20.9 L5.91 13.98 L1.54 8.6 L8.24 6.82 Z';

export default function StarIcon({ filled }) {
  if (!filled) {
    return (
      <svg viewBox="0 0 24 24" className="star-icon">
        <path className="star-shape empty" d={STAR_PATH} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="star-icon">
      <path className="star-outline" d={STAR_PATH} />
      <path className="star-shape filled" d={STAR_PATH} transform="translate(12 12) scale(0.84) translate(-12 -12)" />
      <ellipse className="star-shine-big" cx="8.6" cy="7.8" rx="2.5" ry="3.4" transform="rotate(-32 8.6 7.8)" clipPath="url(#starClipPath)" />
      <ellipse className="star-shine-small" cx="6.3" cy="11.6" rx="0.9" ry="1.2" clipPath="url(#starClipPath)" />
    </svg>
  );
}
