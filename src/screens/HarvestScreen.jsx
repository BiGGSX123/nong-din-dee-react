import { useEffect, useRef } from 'react';
import { cropById, soilById } from '../data/content';
import StarIcon from '../components/StarIcon';
import { playHarvestPass, playHarvestFail } from '../lib/sound';

export default function HarvestScreen({ level, levelNumber, status, score, totalPoints, totalLevels, completedCount, lastPoints, isNewRecord, nextLocked, onNext, onPlayAgain, onBackToMap }) {
  const stageRef = useRef(null);
  const islandRef = useRef(null);
  const cropImgRef = useRef(null);

  const planted = cropById(status.pickedCropId || level.cropCorrectId);
  const soil = soilById(level.soilId);
  const passed = score >= 2;
  const showCrop = status.stars >= 2;
  const isFresh = status.stars === 3;
  const cropSrc = planted.img;

  // plays once per harvest reveal — App.jsx only renders this screen right
  // after leaving the quiz screen, so it always mounts fresh here
  useEffect(() => {
    if (passed) playHarvestPass(); else playHarvestFail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const island = islandRef.current;
    const crop = cropImgRef.current;
    const cropBottom = 143;
    const topPad = 24;
    const recalc = () => {
      const islandH = island ? island.getBoundingClientRect().height : 0;
      const needed = crop ? cropBottom + crop.getBoundingClientRect().height + topPad : islandH + topPad;
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
        {passed && [...Array(16)].map((_, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{ left: `${5 + i * 6}%`, animationDelay: `${(i % 5) * 0.08}s` }}
          />
        ))}
        <div className="stage" ref={stageRef}>
          <img className="island" ref={islandRef} src={soil.img} alt="" />
          {showCrop && <img className={`crop-img ${isFresh ? 'fresh' : 'wilted'}`} ref={cropImgRef} src={cropSrc} alt="" />}
        </div>
        <h2>{level.province} · ปลูก{planted.nameTh}</h2>
        <span className={`fresh-pill ${score === 3 ? '' : 'half'}`}>
          ตอบถูก {score}/3 ·{' '}
          {[0, 1, 2].map((i) => (
            <span key={i} className="star-reveal" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
              <StarIcon filled={i < score} />
            </span>
          ))}
        </span>
      </div>
      {score === 0 && (
        <div className="lede" style={{ textAlign: 'center' }}>ตอบถูกอย่างน้อย 1 ข้อ ถึงจะปลดล็อกด่านถัดไปได้ ลองใหม่อีกครั้งนะ</div>
      )}
      {isNewRecord && <div className="new-record-badge">New Record!</div>}
      <div className={`points-earned ${lastPoints === 0 ? 'zero' : ''}`}>+{lastPoints}<span>แต้มสะสม</span></div>
      <div className="panel">
        <h3>ภาพรวมฟาร์ม</h3>
        <div className="lb-row"><span>ด่านที่ผ่านแล้ว</span><span className="n">{completedCount}/{totalLevels}</span></div>
        <div className="lb-row"><span>แต้มสะสมทั้งหมด</span><span className="n">{totalPoints.toLocaleString()}</span></div>
      </div>
      {!nextLocked && <button className="btn" type="button" onClick={onNext}>ด่านถัดไป</button>}
      <button className={nextLocked ? 'btn' : 'btn secondary'} type="button" onClick={onPlayAgain}>เล่นอีกครั้ง</button>
      <button className="btn secondary" type="button" onClick={onBackToMap}>กลับแผนที่ด่าน</button>
    </>
  );
}
