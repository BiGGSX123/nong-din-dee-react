import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const MEDAL_COLORS = ['#E8A93A', '#B0B0B0', '#C97B4A'];
const MEDALS = ['🥇', '🥈', '🥉'];
const DISPLAY_ORDER = [1, 0, 2]; // classic podium arrangement: 2nd, 1st, 3rd

// mirrors DAILY_BONUS_RATE in server/src/cron/dailyBonus.js — the cron job
// is the one that actually pays it out at midnight, this is just a preview
const DAILY_BONUS_RATE = 0.01;

export default function RankingScreen({ player, isLoggedIn, points, completedCount, totalLevels }) {
  const myRowRef = useRef(null);
  const [liveBoard, setLiveBoard] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) { setLiveBoard(null); setLoadError(false); return; }
    let cancelled = false;
    setLoadError(false);
    api.getLeaderboard(500)
      .then(({ players }) => {
        if (cancelled) return;
        setLiveBoard(players.map((p) => ({
          name: p.displayName, pts: p.points, avatar: p.pictureUrl, me: p.id === player.id,
        })));
      })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [isLoggedIn, player, points]); // points changes after finishing a level — refetch so rank stays current

  const pct = Math.round((completedCount / totalLevels) * 100);
  const board = liveBoard ? [...liveBoard].sort((a, b) => b.pts - a.pts) : null;
  const myRank = board ? board.findIndex((p) => p.me) + 1 : null;
  const podium = board ? board.slice(0, 3) : [];
  const rest = board ? board.slice(3) : [];

  useEffect(() => {
    myRowRef.current?.scrollIntoView({ block: 'center' });
  }, [liveBoard]);

  return (
    <>
      <h1>อันดับ & ภาพรวม</h1>
      <div className="lede">สรุปความคืบหน้าทั้งหมดของคุณ และอันดับเทียบกับผู้เล่นคนอื่น</div>

      <div className="rank-stats">
        <div className="rank-stat-card">
          <div className="rank-stat-icon">🗺️</div>
          <div className="rank-stat-value">{completedCount}<small>/{totalLevels}</small></div>
          <div className="rank-stat-label">ด่านที่ผ่านแล้ว</div>
          <div className="rank-progress"><div className="rank-progress-bar" style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="rank-stat-card">
          <div className="rank-stat-icon">🌾</div>
          <div className="rank-stat-value">{points.toLocaleString()}</div>
          <div className="rank-stat-label">แต้มสะสมทั้งหมด</div>
        </div>
      </div>

      {isLoggedIn && (
        <div className="rank-dividend">
          <span className="rank-dividend-icon">🎁</span>
          <span>
            ปันผลคะแนนคืนนี้ (เที่ยงคืน): <b>+{Math.round(points * DAILY_BONUS_RATE).toLocaleString()}</b> แต้ม
            <span className="know-sub"> (1% ของแต้มสะสม {points.toLocaleString()} แต้ม)</span>
          </span>
        </div>
      )}

      {!isLoggedIn && (
        <div className="rank-empty-state">เข้าสู่ระบบด้วย LINE เพื่อดูอันดับเทียบกับผู้เล่นคนอื่น</div>
      )}
      {isLoggedIn && loadError && (
        <div className="rank-empty-state">โหลดอันดับผู้เล่นไม่สำเร็จ ลองใหม่อีกครั้ง</div>
      )}
      {isLoggedIn && !loadError && !board && (
        <div className="rank-empty-state">กำลังโหลดอันดับ...</div>
      )}

      {board && (
        <>
          <div className="rank-my-badge">
            <span className="rank-my-icon">📍</span>
            <span>อันดับของคุณตอนนี้คือ <b>#{myRank}</b> จากทั้งหมด {board.length} คน</span>
          </div>

          <div className="panel">
            <h3>จัดอันดับผู้เล่น ({board.length} คน)</h3>
            <div className="podium">
              {DISPLAY_ORDER.filter((i) => podium[i]).map((i) => {
                const p = podium[i];
                const rank = i + 1;
                return (
                  <div className={`podium-slot rank-${rank} ${p.me ? 'me' : ''}`} key={i}>
                    <div className="podium-medal">{MEDALS[i]}</div>
                    <div className="podium-avatar" style={p.avatar ? undefined : { background: MEDAL_COLORS[i] }}>
                      {p.avatar ? <img src={p.avatar} alt="" /> : p.name.charAt(0)}
                    </div>
                    <div className="podium-name">{p.name}</div>
                    <div className="podium-pts">{p.pts.toLocaleString()}</div>
                    <div className="podium-bar">#{rank}</div>
                  </div>
                );
              })}
            </div>
            <div className="rank-list">
              {rest.map((p, i) => (
                <div className={`rank-list-row ${p.me ? 'me' : ''}`} key={i} ref={p.me ? myRowRef : null}>
                  <span className="rank-list-num">#{i + 4}</span>
                  {p.avatar
                    ? <img className="rank-list-avatar" src={p.avatar} alt="" />
                    : <span className="rank-list-avatar placeholder">{p.name.charAt(0)}</span>}
                  <span className="rank-list-name">{p.name}</span>
                  <span className="rank-list-pts">{p.pts.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
