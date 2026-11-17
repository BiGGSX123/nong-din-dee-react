import { useEffect, useRef, useState } from 'react';

const HUD_SUB = {
  quiz: (province) => province,
  harvest: () => 'เก็บเกี่ยว',
  ranking: () => 'จัดอันดับ & ภาพรวม',
  collection: () => 'คลังสะสม',
  knowledge: () => 'คลังความรู้',
  'true-false': () => 'โหมดถูกหรือผิด',
  shop: () => 'ร้านค้าไอเทม',
  profile: () => 'ข้อมูลส่วนตัว',
  admin: () => 'จัดการด่าน (แอดมิน)',
};

export default function Hud({ screen, currentProvince, rankTitle, points, quizStep, player, onOpenSettings, onOpenShop, onOpenProfile }) {
  // map screen has no subtitle — its header already shows progress
  const sub = screen === 'quiz'
    ? HUD_SUB.quiz(currentProvince)
    : (HUD_SUB[screen] ? HUD_SUB[screen]() : '');

  const avatarSrc = player?.pictureUrl || '/mascot/nong-din-dee.webp';
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
        {/* avatar + name open the profile / points history (not mid-quiz) */}
        <button
          type="button"
          className={`hud-profile-btn ${screen === 'profile' ? 'active' : ''}`}
          onClick={onOpenProfile}
          disabled={screen === 'quiz'}
          aria-label="ข้อมูลส่วนตัวและประวัติแต้ม"
        >
          <img className="avatar" src={avatarSrc} alt="" />
          <span className="hud-profile-text">
            <span className="hud-name">{displayName}</span>
            {/* mid-quiz: the province being played; otherwise the player's rank title */}
            {screen === 'quiz'
              ? sub && <span className="hud-sub">{sub}</span>
              : rankTitle && <span className="hud-rank">{rankTitle}</span>}
          </span>
        </button>
        <div className={`hud-points ${bump ? 'bump' : ''}`}><img src="/icons/shop/points.webp" alt="" />{points.toLocaleString()}</div>
        {/* separate shop button — hidden mid-quiz so it can't interrupt a timed question */}
        {screen !== 'quiz' && (
          <button
            className={`hud-shop-btn ${screen === 'shop' ? 'active' : ''}`}
            type="button"
            onClick={onOpenShop}
            aria-label="ร้านค้าไอเทม"
          >
            <img src="/icons/shop/shop.webp" alt="" />
          </button>
        )}
        <button className="hud-settings-btn" type="button" onClick={onOpenSettings} aria-label="ตั้งค่า"><img src="/icons/ui/gear.webp" alt="" /></button>
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
