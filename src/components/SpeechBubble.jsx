// sticker-style speech bubble: white body wrapped in a white die-cut sticker
// edge and a soft drop shadow (no dark outline), plus a short tail
// aimed at the speaker. Body is CSS and the tail is one inline SVG, so it
// stretches to any amount of text without distorting — see .speech-bubble
// in index.css.
// tail="left"  → tail at the bottom-left, pointing down-left
// tail="right" → tail at the bottom-right, pointing down-right
export default function SpeechBubble({ tail = 'left', className = '', children, ...rest }) {
  return (
    <div className={`speech-bubble tail-${tail} ${className}`} {...rest}>
      {children}
      <svg className="speech-tail" viewBox="0 0 40 30" aria-hidden="true">
        {/* white sticker edge around the tail, then the tail body (reaches
            above y=0 so it opens into the bubble) */}
        <path d="M11 -2 Q12 12 3 24 Q16 16 28 -2" fill="none" stroke="#fff" strokeWidth="15" strokeLinejoin="round" />
        <path d="M9 -5 Q12 12 3 24 Q16 16 30 -5 Z" fill="#fff" />
      </svg>
    </div>
  );
}
