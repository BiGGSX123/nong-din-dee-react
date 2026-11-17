import { useEffect, useRef, useState } from 'react';
import { soilById, cropById } from '../data/content';
import StarIcon from '../components/StarIcon';
import { playUnlock } from '../lib/sound';
import IntroModal from '../components/IntroModal';

export default function LevelSelectScreen({ levels, levelStatus, playOrder, hasHome, onSelectLevel, justUnlockedIdx, onUnlockShown }) {
  const pathRef = useRef(null);
  const ledeRef = useRef(null);
  const svgRef = useRef(null);
  const carRef = useRef(null);
  const [showHelp, setShowHelp] = useState(false); // ⓘ map how-to

  // a fresh random paint job for the truck on mount (and every lap, via
  // onAnimationIteration below) so it looks like different trucks passing by
  useEffect(() => { if (carRef.current) paintCar(carRef.current); }, []);
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

  const clearedCount = levelStatus.filter((s) => s.completed && s.stars > 0).length;
  const starCount = levelStatus.reduce((sum, s) => sum + (s.stars || 0), 0);
  // walking order: the player's home province first (if chosen), then the
  // rest — falls back to plain index order when no playOrder is given
  const order = playOrder ?? levels.map((_, i) => i);
  // the level to play next ("เล่นเลย!" flag, truck, auto-scroll): first in
  // walking order that's unlocked and not yet passed — a level finished with
  // 0 stars doesn't unlock the next one, so it still counts as "to play"
  const firstUnlockedIdx = order.find((i) => levelStatus[i] && !levelStatus[i].locked && (!levelStatus[i].completed || !levelStatus[i].stars)) ?? -1;

  // draws a wide road through the real (measured) center of every level
  // node, so it always lines up regardless of content-driven row height —
  // plus the little truck's route: from the first node to the next level the
  // player hasn't cleared yet (it drives further as they progress)
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
    const d = smoothPath(pts);
    svg.setAttribute('width', cRect.width);
    svg.setAttribute('height', cRect.height);
    svg.querySelectorAll('path.road').forEach((el) => el.setAttribute('d', d));

    const car = carRef.current;
    if (!car) return;
    const curPos = firstUnlockedIdx >= 0 ? order.indexOf(firstUnlockedIdx) : pts.length - 1;
    const end = Math.min(Math.max(curPos, 0) + 1, pts.length - 1);
    if (end < 1) { car.style.display = 'none'; return; }
    // same curve as the road (control points use ALL nodes), just cut short
    const route = smoothPath(pts, end);
    const measure = svg.querySelector('path.car-route');
    measure.setAttribute('d', route);
    const len = measure.getTotalLength();
    car.style.display = '';
    car.style.offsetPath = `path("${route}")`;
    // steady ~70px/s whatever the route length, never a frantic short loop
    car.style.animationDuration = `${Math.max(4, len / 70)}s`;
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
      {showHelp && <IntroModal mode="map" onNext={() => setShowHelp(false)} />}
      <div className="map-header" ref={ledeRef}>
        <button className="tf-info-btn map-info-btn" type="button" onClick={() => setShowHelp(true)} aria-label="วิธีเล่นแผนที่">i</button>
        <div className="map-title-row">
          <span className="map-badge"><img src="/icons/ui/map.webp" alt="" /></span>
          <div className="map-title-text">
            <h1>แผนที่ <em>{levels.length}</em> จังหวัด</h1>
            <ul className="map-rules">
              <li>ด่านละ 3 ข้อ</li>
              <li>ถูก 1 ข้อผ่านด่าน</li>
            </ul>
          </div>
        </div>
        <div className="map-progress">
          <span className="map-progress-label">ผ่าน <b>{clearedCount}</b>/{levels.length}</span>
          <div className="map-progress-bar"><i style={{ width: `${Math.max(3, (clearedCount / levels.length) * 100)}%` }} /></div>
          <span className="map-progress-stars"><StarIcon filled />{starCount}</span>
        </div>
      </div>
      <div className="path" ref={pathRef}>
        <svg
          ref={svgRef}
          className="trail"
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 0 }}
        >
          {/* layered country road: cream curb, dark edge, sandy surface,
              a lighter crown strip for a little bevel, white center dashes */}
          <path className="road" fill="none" stroke="#FBF5E8" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" />
          <path className="road" fill="none" stroke="#6B4A31" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
          <path className="road" fill="none" stroke="#D2A86A" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
          <path className="road" fill="none" stroke="#E6C48D" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 -2)" />
          <path className="road" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeDasharray="10 14" strokeLinecap="round" />
          <path className="car-route" fill="none" stroke="none" />
        </svg>
        <div className="map-car" ref={carRef} aria-hidden="true" onAnimationIteration={(e) => paintCar(e.currentTarget)}>
          {/* top-down clay pickup, nose pointing +x (offset-rotate turns it along the road) */}
          <img src="/car/red.webp" alt="" />
        </div>
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
                {isCurrent && <span className="play-flag" aria-hidden="true">เล่นเลย!</span>}
                <div className="bubble">
                  <span className="num">{pos + 1}</span>
                  {pos === 0 && hasHome && <span className="home-badge"><img src="/icons/ui/home.webp" alt="บ้านเกิด" /></span>}
                  {st.locked
                    ? <img className="lock-icon" src="/icons/ui/lock.webp" alt="ล็อก" />
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
                <span className={`prov-pill ${lvl.province.length >= 11 ? 'long' : ''}`}>
                  <span className="prov-name">{lvl.province}</span>
                  {st.completed && (
                    <span className="prov-points" aria-label={`${st.points} แต้ม`}>
                      <img src="/icons/shop/points.webp" alt="" />{st.points.toLocaleString()}
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// smooth Catmull-Rom-ish cubic through the points (same curve as before);
// `segments` stops it early while still computing each segment's control
// points from its real neighbours, so a partial route lies exactly on the road
function smoothPath(pts, segments = pts.length - 1) {
  const bulge = 3;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < Math.min(segments, pts.length - 1); i++) {
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
  return d;
}

// clay truck art in four paint jobs — one is picked at random each lap
const CAR_COLORS = ['red', 'blue', 'yellow', 'green'];

function paintCar(el) {
  // never the same color twice in a row
  const prev = Number(el.dataset.color ?? -1);
  const n = CAR_COLORS.length;
  let i = Math.floor(Math.random() * (prev >= 0 ? n - 1 : n));
  if (prev >= 0 && i >= prev) i += 1;
  el.dataset.color = String(i);
  const img = el.querySelector('img');
  if (img) img.src = `/car/${CAR_COLORS[i]}.webp`;
}
