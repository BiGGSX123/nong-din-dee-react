import { createPortal } from 'react-dom';
import { SOIL_PROBLEMS } from '../data/knowledge';

// shown after tapping a level on the map, before the quiz starts: which soil
// this province mostly has and its typical problems, then "เริ่มแก้ปัญหา"
export default function LevelIntroModal({ level, levelNumber, soil, bestPoints, onStart, onCancel }) {
  const place = level.province === 'กรุงเทพมหานคร' ? level.province : `จังหวัด${level.province}`;
  const problems = (SOIL_PROBLEMS[soil.id] || []).slice(0, 3);
  return createPortal(
    <div className="intro-overlay" onClick={onCancel}>
      <div className="intro-card welcome-card level-intro" role="dialog" aria-labelledby="level-intro-title" onClick={(e) => e.stopPropagation()}>
        <button className="welcome-close" type="button" onClick={onCancel} aria-label="กลับหน้าผจญภัย">✕</button>
        <div className="welcome-hero" aria-hidden="true">
          <div className="welcome-rays" />
          <img className="level-intro-soil" src={soil.img} alt="" />
        </div>
        <div className="welcome-page">
          <div className="level-intro-num">ด่านที่ {levelNumber}</div>
          <h2 id="level-intro-title" className="welcome-ribbon"><span>{level.province}</span></h2>
          <p className="level-intro-lead">
            {place} ส่วนมากค้นพบ<br />
            <b className="level-intro-soilname">{soil.nameTh}</b>
          </p>
          {problems.length > 0 && (
            <div className="level-intro-problems">
              <small>ปัญหาที่พบบ่อย</small>
              <div>{problems.map((p) => <span key={p.label}>{p.label}</span>)}</div>
            </div>
          )}
          {bestPoints > 0 && (
            <div className="level-intro-best">
              <img src="/icons/ui/trophy.webp" alt="" />
              <span>สถิติเดิม <b>{bestPoints}</b> แต้ม <br/>ทำให้เกินสถิติถึงจะได้แต้มเพิ่ม</span>
            </div>
          )}
          <button className="btn welcome-start" type="button" onClick={onStart}>เริ่มแก้ปัญหา</button>
          <button className="welcome-back" type="button" onClick={onCancel}>‹ กลับหน้าผจญภัย</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
