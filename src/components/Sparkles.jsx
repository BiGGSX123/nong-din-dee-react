// the same diagonal light sweep the collected crop stickers have, but clipped
// to the art's own silhouette (CSS mask = the image itself), so on cut-out
// art like the special characters it glints across the character instead of
// showing as a box. Wrap the art: <Sparkles img={ch.img}><CharPortrait …/></Sparkles>
// Transform-only animation (GPU) — see .art-shine in index.css.
export default function Sparkles({ img, children, className = '' }) {
  return (
    <span className={`art-shine ${className}`} style={img ? { '--shine-mask': `url("${img}")` } : undefined}>
      {children}
      {img && <span className="art-shine-sweep" aria-hidden="true" />}
    </span>
  );
}
