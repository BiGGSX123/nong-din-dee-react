import { useState } from 'react';

// round sticker-style portrait for a special character: clay art in a colored
// badge (falls back to the emoji if the image can't load)
// variant="sticker": no colored badge — just the cut-out art with a white
// die-cut outline (used in the shop)
export default function CharPortrait({ ch, size = 64, locked = false, variant = 'badge' }) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className={`char-portrait ${variant === 'sticker' ? 'sticker-art' : ''} ${locked ? 'locked' : ''}`}
      style={{ '--c': ch.color, width: size, height: size, fontSize: size * 0.56 }}
      aria-hidden="true"
    >
      {ch.img && !broken
        ? <img src={ch.img} alt="" onError={() => setBroken(true)} />
        : ch.emoji}
    </span>
  );
}
