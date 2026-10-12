import { STAR_PATH } from './StarIcon';

export default function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <radialGradient id="starFillGrad" cx="36%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFFCF0" />
          <stop offset="35%" stopColor="#FFE07A" />
          <stop offset="70%" stopColor="#F7B93D" />
          <stop offset="100%" stopColor="#D9800F" />
        </radialGradient>
        <clipPath id="starClipPath"><path d={STAR_PATH} /></clipPath>
      </defs>
    </svg>
  );
}
