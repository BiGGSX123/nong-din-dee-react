import { useEffect, useRef, useState } from 'react';

const HUD_SUB = {
  'level-select': (completedCount, total) => `ผ่านด่านแล้ว ${completedCount}/${total}`,
  quiz: (province) => province,
  harvest: () => 'เก็บเกี่ยว',
  ranking: () => 'จัดอันดับ & ภาพรวม',
  collection: () => 'คลังสะสม',
  knowledge: () => 'คลังความรู้',
  admin: () => 'จัดการด่าน (แอดมิน)',
};

export default function Hud({ screen, completedCount, totalLevels, currentProvince, points, quizStep, player }) {
  const sub = screen === 'quiz'
    ? HUD_SUB.quiz(currentProvince)
    : screen === 'level-select'
      ? HUD_SUB['level-select'](completedCount, totalLevels)
      : (HUD_SUB[screen] ? HUD_SUB[screen]() : '');

  const avatarSrc = player?.pictureUrl || '/mascot/nong-din-dee.png';
  const displayName = player?.displayName || 'น้องดินดี';

  // brief scale+glow pulse whenever points go up (e.g. after a harvest) —
  // purely presentational, doesn't affect the points value itself
  const prevPointsRef = useRef(points);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (points > prevPointsRef.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 500);
      prevPointsRef.current = points;
      return () => clearTimeout(t);
    }
    prevPointsRef.current = points;
  }, [points]);

  return (
    <div className="hud">
      <div className="hud-top">
        <img className="avatar" src={avatarSrc} alt="" />
        <div>
          <div className="hud-name">{displayName}</div>
          <div className="hud-sub">{sub}</div>
        </div>
        <div className={`hud-points ${bump ? 'bump' : ''}`}><img src="/crops/01-rice.png" alt="" />{points.toLocaleString()}</div>
      </div>
      {screen === 'quiz' && (
        <div className="qdots">
          {[0, 1, 2].map((i) => (
            <i key={i} className={i < quizStep ? 'done' : i === quizStep ? 'active' : ''} />
          ))}
        </div>
      )}
    </div>
  );
}
