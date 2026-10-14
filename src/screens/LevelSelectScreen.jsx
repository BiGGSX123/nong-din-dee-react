import { useEffect, useRef } from 'react';
import { soilById, cropById } from '../data/content';
import StarIcon from '../components/StarIcon';
import { playUnlock } from '../lib/sound';

export default function LevelSelectScreen({ levels, levelStatus, playOrder, hasHome, onSelectLevel, justUnlockedIdx, onUnlockShown }) {
  const pathRef = useRef(null);
  const ledeRef = useRef(null);
  const svgRef = useRef(null);
  const currentNodeRef = useRef(null);
  const scrolledOnceRef = useRef(false);

  // plays once when this screen is the one showing a freshly-unlocked level —
  // the flag comes from App.jsx's finishLevel() and is cleared straight back
  // through onUnlockShown so the pop/sound never replays on later re-renders
  useEffect(() => {
    if (justUnlockedIdx == null) return;
    playUnlock();
    const t = setTimeout(() => onUnlockShown?.(), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justUnlockedIdx]);

  const firstUnlockedIdx = levelStatus.findIndex((s) => !s.locked && !s.completed);
  // walking order: the player's home province first (if chosen), then the
  // rest — falls back to plain index order when no playOrder is given
  const order = playOrder ?? levels.map((_, i) => i);

  // draws a wide asphalt road through the real (measured) center of every level
  // node, so it always lines up regardless of content-driven row height
  const drawTrail = () => {
    const container = pathRef.current;
    const svg = svgRef.current;
    if (!container || !svg) return;
    const nodes = [...container.querySelectorAll('.level-node')];
    if (!nodes.length) return;
    const cRect = container.getBoundingClientRect();
    const pts = nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return [r.left + r.width / 2 - cRect.left, r.top + r.height / 2 - cRect.top];
    });
    const bulge = 3;
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * bulge;
      const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * bulge;
      const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * bulge;
      const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * bulge;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
    }
    svg.setAttribute('width', cRect.width);
    svg.setAttribute('height', cRect.height);
    svg.querySelector('path.road-edge').setAttribute('d', d);
    svg.querySelector('path.road-surface').setAttribute('d', d);
    svg.querySelector('path.road-line').setAttribute('d', d);
  };

  // pushes the whole path down when the first node's crop art is tall enough
  // to collide with the title/subtitle above it — measured, not fixed
  useEffect(() => {
    const path = pathRef.current;
    const lede = ledeRef.current;
    if (!path || !lede) return;
    const basePadding = 40;
    const firstCrop = path.querySelector('.level-node .bubble-crop');
    const recalc = () => {
      path.style.paddingTop = basePadding + 'px';
      if (!firstCrop) { drawTrail(); return; }
      const ledeRect = lede.getBoundingClientRect();
      const cropRect = firstCrop.getBoundingClientRect();
      const minGap = 10;
      const overlap = ledeRect.bottom + minGap - cropRect.top;
      if (overlap > 0) path.style.paddingTop = basePadding + overlap + 'px';
      drawTrail();
    };
    recalc();
    if (firstCrop && !firstCrop.complete) {
      firstCrop.addEventListener('load', recalc, { once: true });
      return () => firstCrop.removeEventListener('load', recalc);
    }
  }, [levels, levelStatus, order]);

  useEffect(() => {
    if (scrolledOnceRef.current) return;
    if (currentNodeRef.current) {
      currentNodeRef.current.scrollIntoView({ block: 'center' });
      scrolledOnceRef.current = true;
    }
  }, [firstUnlockedIdx]);

  return (
    <>
      <div className="map-header">
        <h1>แผนที่ 77 จังหวัด</h1>
        <p className="lede" ref={ledeRef}>แต่ละด่านสุ่มชุดดินในพื้นที่ มีคำถาม 3 ข้อ ตอบถูกอย่างน้อย 1 ข้อเพื่อผ่านด่าน ยิ่งตอบถูกเยอะยิ่งได้ดาวเยอะ</p>
      </div>
      <div className="path" ref={pathRef}>
        <svg
          ref={svgRef}
          className="trail"
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 0 }}
        >
          <path className="road-edge" fill="none" stroke="#5C4230" strokeWidth="27" strokeLinecap="round" strokeLinejoin="round" />
          <path className="road-surface" fill="none" stroke="#C9A66D" strokeWidth="21" strokeLinecap="round" strokeLinejoin="round" />
          <path className="road-line" fill="none" stroke="#F5E9CE" strokeWidth="4.5" strokeDasharray="1 15" strokeLinecap="round" />
        </svg>
        {order.map((realIdx, pos) => {
          const lvl = levels[realIdx];
          const st = levelStatus[realIdx];
          const soil = soilById(lvl.soilId);
          const side = pos % 2 === 0 ? 'L' : 'R';
          const isCurrent = realIdx === firstUnlockedIdx;
          const cls = [st.locked ? 'locked' : '', st.completed ? 'completed' : '', isCurrent ? 'current' : '', realIdx === justUnlockedIdx ? 'just-unlocked' : ''].filter(Boolean).join(' ');
          const showCrop = !st.locked && st.completed && st.pickedCropId && st.stars >= 2;
          return (
            <div className={`level-node-row ${side}`} key={lvl.id ?? realIdx}>
              <div
                className={`level-node ${cls}`}
                tabIndex={st.locked ? -1 : 0}
                role="button"
                ref={isCurrent ? currentNodeRef : null}
                onClick={() => { if (!st.locked) onSelectLevel(realIdx); }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !st.locked) { e.preventDefault(); onSelectLevel(realIdx); }
                }}
              >
                <div className="bubble">
                  <span className="num">{pos + 1}</span>
                  {pos === 0 && hasHome && <span className="home-badge">🏠</span>}
                  {st.locked
                    ? <span className="lock-icon">🔒</span>
                    : <img className="bubble-soil" src={soil.img} alt="" />}
                  {showCrop && (
                    <img
                      className={`bubble-crop ${st.stars === 3 ? 'fresh' : 'wilted'}`}
                      src={cropById(st.pickedCropId).img}
                      alt=""
                    />
                  )}
                  {st.completed && (
                    <span className="stars">
                      {[0, 1, 2].map((si) => <StarIcon key={si} filled={si < st.stars} />)}
                    </span>
                  )}
                </div>
                <span className="prov-pill">{lvl.province}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
