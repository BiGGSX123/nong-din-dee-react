import { useEffect, useRef } from 'react';
import { cropById, soilById } from '../data/content';
import StarIcon from '../components/StarIcon';
import Fireworks from '../components/Fireworks';
import { playHarvestPass, playHarvestFail, playStarLand } from '../lib/sound';

// result stars slam down one after another; these drive both the CSS
// animation-delay and the matching "ding" so sound and motion stay in sync
const STAR_FIRST_DELAY = 0.35; // s
const STAR_STEP = 0.38; // s
const STAR_LAND_AT = 0.3; // s into each star's slam animation where it "hits"

export default function HarvestScreen({ level, levelNumber, pickedCropId, score, lastPoints, breakdown, isNewRecord, nextLocked, onNext, onPlayAgain, onBackToMap }) {
  const stageRef = useRef(null);
  const islandRef = useRef(null);
  const cropImgRef = useRef(null);

  // always the crop the player actually picked in THIS attempt (same art as
  // the quiz's answer card / growing preview) — never the saved best record
  // or the level's answer key. No pick (crop question timed out) = no crop.
  const planted = pickedCropId ? cropById(pickedCropId) : null;
  const soil = soilById(level.soilId);
  // same rule as the game: 1 correct answer (1 star) passes the level and
  // unlocks the next one — fireworks/pass sound/title follow it
  const passed = score >= 1;
  const showCrop = Boolean(planted);
  // a weak result shows the same plant, just wilted
  const isFresh = score >= 2;
  const cropSrc = planted?.img;

  // plays once per harvest reveal — App.jsx only renders this screen right
  // after leaving the quiz screen, so it always mounts fresh here
  useEffect(() => {
    if (passed) playHarvestPass(); else playHarvestFail();
    const timers = [];
    for (let i = 0; i < score; i++) {
      timers.push(setTimeout(() => playStarLand(i), (STAR_FIRST_DELAY + i * STAR_STEP + STAR_LAND_AT) * 1000));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const island = islandRef.current;
    const crop = cropImgRef.current;
    const cropBottom = 151;
    const topPad = 24;
    const recalc = () => {
      const islandH = island ? island.getBoundingClientRect().height : 0;
      const needed = crop ? cropBottom + crop.offsetHeight + topPad : islandH + topPad;
      stage.style.height = Math.max(200, Math.min(480, needed)) + 'px';
    };
    recalc();
    const onLoad = () => recalc();
    if (island && !island.complete) island.addEventListener('load', onLoad, { once: true });
    if (crop && !crop.complete) crop.addEventListener('load', onLoad, { once: true });
    return () => {
      if (island) island.removeEventListener('load', onLoad);
      if (crop) crop.removeEventListener('load', onLoad);
    };
  }, [showCrop, cropSrc, soil]);

  return (
    <>
      <h1 style={{ textAlign: 'center' }}>{passed ? `ผ่านด่าน ${levelNumber}!` : `ยังไม่ผ่านด่าน ${levelNumber}`}</h1>
      <div className={`harvest-hero ${passed ? 'passed' : 'failed'}`}>
        {passed && <Fireworks opening={2} bursts={score === 3 ? 11 : 6} startDelay={(STAR_FIRST_DELAY + score * STAR_STEP) * 1000} />}
        <div className={`result-stars ${passed ? 'passed' : ''}`} aria-label={`ได้ ${score} ดาว`} role="img">
          {[0, 1, 2].map((i) => {
            const earned = i < score;
            return (
              <span
                key={i}
                className={`result-star s${i} ${earned ? 'earned' : ''}`}
                style={{ '--delay': `${STAR_FIRST_DELAY + i * STAR_STEP}s` }}
              >
                <StarIcon filled={earned} />
                {earned && (
                  <span className="star-burst" aria-hidden="true">
                    {[...Array(8)].map((_, k) => <i key={k} style={{ '--a': `${k * 45}deg` }} />)}
                  </span>
                )}
              </span>
            );
          })}
        </div>
        <div className="stage" ref={stageRef}>
          {/* light rays for any earned star (fireworks stay reserved for a pass) */}
          {score > 0 && <div className="sunburst" aria-hidden="true" />}
          <img className="island" ref={islandRef} src={soil.img} alt="" />
          {showCrop && <img className={`crop-img ${isFresh ? 'fresh' : 'wilted'}`} ref={cropImgRef} src={cropSrc} alt="" />}
        </div>
        <h2>{level.province}{planted ? ` · ปลูก${planted.nameTh}` : ''}</h2>
        <span className={`fresh-pill ${score === 3 ? '' : 'half'}`}>ตอบถูก {score}/3</span>
      </div>
      {score === 0 && (
        <div className="lede" style={{ textAlign: 'center' }}>ตอบถูกอย่างน้อย 1 ข้อ ถึงจะปลดล็อกด่านถัดไปได้ ลองใหม่อีกครั้งนะ</div>
      )}
      {isNewRecord && <div className="new-record-badge">New Record!</div>}
      {/* this round's score and how it was made */}
      <div className="round-score">คะแนนรอบนี้ <b>{lastPoints}</b></div>
      {breakdown && score > 0 && (
        <div className="points-breakdown">
          <span className="pb-chip stars"><StarIcon filled />{score} ดาว × 20 = {breakdown.stars}</span>
          <span className="pb-chip speed"><img src="/icons/shop/time.webp" alt="" />ตอบเร็ว +{breakdown.speed}</span>
          {breakdown.boosted && <span className="pb-chip boost">x2</span>}
        </div>
      )}
      {/* what was actually added to the total — only the part above the old best */}
      {(() => {
        const gained = breakdown?.gained ?? lastPoints;
        const prevBest = breakdown?.prevBest ?? null;
        return (
          <>
            <div className={`points-earned ${gained === 0 ? 'zero' : ''}`}>+{gained}<span>แต้มสะสมที่ได้</span></div>
            {prevBest != null && (gained > 0
              ? <div className="best-note up">ทำลายสถิติเดิม <b>{prevBest}</b> → <b>{lastPoints}</b> ได้แต้มเพิ่ม +{gained}</div>
              : <div className="best-note">ยังไม่เกินสถิติเดิม <b>{prevBest}</b> แต้ม <br/>ต้องทำคะแนนให้สูงกว่าสถิติถึงจะได้แต้มเพิ่ม</div>)}
          </>
        );
      })()}
      {!nextLocked && <button className="btn" type="button" onClick={onNext}>ด่านถัดไป</button>}
      <button className={nextLocked ? 'btn' : 'btn secondary'} type="button" onClick={onPlayAgain}>เล่นอีกครั้ง</button>
      <button className="btn secondary" type="button" onClick={onBackToMap}>กลับแผนที่ด่าน</button>
    </>
  );
}
