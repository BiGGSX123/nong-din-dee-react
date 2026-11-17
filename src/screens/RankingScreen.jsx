import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import StarIcon from '../components/StarIcon';
import { CHARACTERS } from '../data/characters';
import QuizLeaderboard from '../components/QuizLeaderboard';

const MEDAL_COLORS = ['#E8A93A', '#B0B0B0', '#C97B4A'];
const DISPLAY_ORDER = [1, 0, 2]; // classic podium arrangement: 2nd, 1st, 3rd

// mirrors DAILY_BONUS_RATE in server/src/cron/dailyBonus.js — the cron job
// is the one that actually pays it out at midnight, this is just a preview
const DAILY_BONUS_RATE = 0.01;

// gold crown over 1st place (vector, so it stays crisp and matches the stars)
const Crown = () => (
  <svg className="podium-crown" viewBox="0 0 64 44" aria-hidden="true">
    <defs>
      <linearGradient id="crownGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFF2A8" /><stop offset="0.45" stopColor="#FFCF3F" /><stop offset="1" stopColor="#E08A12" />
      </linearGradient>
    </defs>
    <path d="M6 36 L3 10 L19 22 L32 4 L45 22 L61 10 L58 36 Z" fill="url(#crownGold)" stroke="#9A5A06" strokeWidth="3" strokeLinejoin="round" />
    <rect x="6" y="34" width="52" height="8" rx="3" fill="url(#crownGold)" stroke="#9A5A06" strokeWidth="3" />
    <circle cx="32" cy="24" r="4.2" fill="#FF5A6E" stroke="#9A5A06" strokeWidth="2" />
    <circle cx="17" cy="28" r="3" fill="#5BC0FF" stroke="#9A5A06" strokeWidth="1.8" />
    <circle cx="47" cy="28" r="3" fill="#5BC0FF" stroke="#9A5A06" strokeWidth="1.8" />
    <circle cx="3" cy="10" r="3" fill="#FFE27A" stroke="#9A5A06" strokeWidth="1.8" />
    <circle cx="32" cy="4" r="3" fill="#FFE27A" stroke="#9A5A06" strokeWidth="1.8" />
    <circle cx="61" cy="10" r="3" fill="#FFE27A" stroke="#9A5A06" strokeWidth="1.8" />
    <path d="M12 15 L15 31" stroke="#fff" strokeOpacity="0.6" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

// progress ring geometry (r=52 in a 120 box)
const RING_C = 2 * Math.PI * 52;

export default function RankingScreen({ player, isLoggedIn, points, completedCount, totalLevels, totalStars, characterCount = 0, charDailyBonus = 0, claimedToday = false }) {
  const myRowRef = useRef(null);
  const [liveBoard, setLiveBoard] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState('points'); // 'points' | 'stars' (อันดับดวงดาว)
  const [starBoard, setStarBoard] = useState(null);

  // star ranking: stars, then total map score, then spendable points
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let cancelled = false;
    api.getStarLeaderboard(500)
      .then(({ players }) => {
        if (cancelled) return;
        setStarBoard(players.map((p) => ({
          name: p.displayName, pts: p.points, stars: p.stars, mapScore: p.mapScore, avatar: p.pictureUrl, me: p.id === player.id,
        })));
      })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [isLoggedIn, player, points]);

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
  const dividend = Math.round(points * DAILY_BONUS_RATE);
  const dailyTotal = (isLoggedIn ? dividend : 0) + charDailyBonus;
  const isStars = tab === 'stars';
  const board = isStars
    ? (starBoard ? [...starBoard].sort((a, b) => b.stars - a.stars || b.mapScore - a.mapScore || b.pts - a.pts) : null)
    : (liveBoard ? [...liveBoard].sort((a, b) => b.pts - a.pts) : null);
  // the number each tab ranks by (+ the tie-breakers, shown smaller, on stars)
  const metric = (p) => (isStars
    ? <><StarIcon filled />{p.stars.toLocaleString()}</>
    : <><img src="/icons/shop/points.webp" alt="" />{p.pts.toLocaleString()}</>);
  const myRank = board ? board.findIndex((p) => p.me) + 1 : null;
  const podium = board ? board.slice(0, 3) : [];
  const rest = board ? board.slice(3) : [];

  useEffect(() => {
    myRowRef.current?.scrollIntoView({ block: 'center' });
  }, [liveBoard, starBoard, tab]);

  return (
    <>
      <section className="rank-banner">
        <div className="rank-banner-text">
          <span className="rank-banner-tag"><img src="/icons/ui/trophy.webp" alt="" />อันดับ & ภาพรวม</span>
          <h1>ฟาร์มของฉัน</h1>
          <p>ความคืบหน้าทั้งหมด และอันดับเทียบกับผู้เล่นทั่วประเทศ</p>
        </div>
        <img className="rank-banner-mascot" src="/mascot/nong-din-dee-cheer.webp" alt="" />
      </section>

      {/* overview: big progress ring + points / stars tiles */}
      <section className="rank-hero">
        <div className="ring" role="img" aria-label={`ผ่านแล้ว ${completedCount} จาก ${totalLevels} ด่าน`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" className="ring-track" />
            <circle
              cx="60" cy="60" r="52" className="ring-fill"
              strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - pct / 100)}
            />
          </svg>
          <div className="ring-center">
            <b>{pct}%</b>
            <span>{completedCount}/{totalLevels} ด่าน</span>
          </div>
        </div>
        <div className="hero-tiles">
          <div className="hero-tile">
            <img src="/icons/shop/points.webp" alt="" />
            <div><b>{points.toLocaleString()}</b><span>แต้มสะสม</span></div>
          </div>
          <div className="hero-tile">
            <StarIcon filled />
            <div><b>{totalStars}<small>/{totalLevels * 3}</small></b><span>ดาวที่เก็บได้</span></div>
          </div>
          <div className="hero-tile">
            <img src="/characters/drone.webp" alt="" />
            <div><b>{characterCount}<small>/{CHARACTERS.length}</small></b><span>ตัวละครพิเศษ</span></div>
          </div>
        </div>
      </section>

      {/* daily income: nightly dividend (server cron, logged-in players only)
          + special characters' daily bonus (claimed from the collection) */}
      <section className="income-card">
        <h3><img src="/icons/shop/points.webp" alt="" />รายได้ต่อวัน</h3>
        <div className="income-row">
          <img src="/icons/ui/gift.webp" alt="" />
          <div className="income-text">
            <b>ปันผลเที่ยงคืน</b>
            <span>{isLoggedIn ? `1% ของแต้มสะสม ${points.toLocaleString()} แต้ม` : 'เข้าสู่ระบบด้วย LINE เพื่อรับปันผลทุกคืน'}</span>
          </div>
          <strong className={isLoggedIn ? '' : 'off'}>+{isLoggedIn ? dividend.toLocaleString() : 0}</strong>
        </div>
        <div className="income-row">
          <img src="/characters/soil-doctor.webp" alt="" />
          <div className="income-text">
            <b>ตัวละครพิเศษ ({characterCount}/{CHARACTERS.length})</b>
            <span>
              {characterCount === 0
                ? 'ซื้อตัวละครที่ร้านค้าเพื่อรับแต้มทุกวัน'
                : claimedToday ? 'วันนี้รับแล้ว ✓ — รับได้อีกพรุ่งนี้ที่คลังสะสม' : 'กดรับได้ที่หน้าคลังสะสม'}
            </span>
          </div>
          <strong className={characterCount ? '' : 'off'}>+{charDailyBonus.toLocaleString()}</strong>
        </div>
        <div className="income-total">
          <span>รวมต่อวัน</span>
          <b><img src="/icons/shop/points.webp" alt="" />+{dailyTotal.toLocaleString()} แต้ม</b>
        </div>
      </section>

      {!isLoggedIn && (
        <div className="rank-locked">
          <img src="/mascot/nong-din-dee-point.webp" alt="" />
          <div>
            <b>อยากรู้ว่าเราอยู่อันดับไหน?</b>
            <p>เข้าสู่ระบบด้วย LINE เพื่อดูอันดับเทียบกับผู้เล่นคนอื่นทั่วประเทศ</p>
          </div>
        </div>
      )}
      {isLoggedIn && loadError && (
        <div className="rank-empty-state">โหลดอันดับผู้เล่นไม่สำเร็จ ลองใหม่อีกครั้ง</div>
      )}
      {isLoggedIn && !loadError && !board && (
        <div className="rank-empty-state">กำลังโหลดอันดับ...</div>
      )}

      {board && (
        <>
          {/* the arena: night-sky stage with spinning light rays + 3D podium */}
          <section className="arena">
            <div className="arena-rays" aria-hidden="true" />
            <div className="arena-head">
              <h3><img src="/icons/ui/trophy.webp" alt="" />จัดอันดับผู้เล่น</h3>
              {myRank > 0 && <span className="arena-me">อันดับของคุณ <b>#{myRank}</b> / {board.length}</span>}
            </div>
            <div className="arena-tabs" role="tablist" aria-label="ประเภทอันดับ">
              <button type="button" role="tab" aria-selected={!isStars} className={!isStars ? 'on' : ''} onClick={() => setTab('points')}>
                <img src="/icons/shop/points.webp" alt="" />อันดับแต้ม
              </button>
              <button type="button" role="tab" aria-selected={isStars} className={isStars ? 'on' : ''} onClick={() => setTab('stars')}>
                <StarIcon filled />อันดับดวงดาว
              </button>
            </div>
            {isStars && <p className="arena-rule">ดาวมากสุดก่อน · ดาวเท่ากันดูคะแนนรวมแผนที่ · ยังเท่ากันดูแต้ม</p>}
            <div className="podium">
              {DISPLAY_ORDER.filter((i) => podium[i]).map((i) => {
                const p = podium[i];
                const rank = i + 1;
                return (
                  <div className={`podium-slot rank-${rank} ${p.me ? 'me' : ''}`} key={i}>
                    <div className="podium-player">
                      {rank === 1 && <Crown />}
                      <div className="podium-avatar-wrap">
                        {rank === 1 && <div className="podium-glow" aria-hidden="true" />}
                        <div className="podium-avatar" style={p.avatar ? undefined : { background: MEDAL_COLORS[i] }}>
                          {p.avatar ? <img src={p.avatar} alt="" /> : p.name.charAt(0)}
                        </div>
                        <span className="podium-medal" aria-label={`อันดับ ${rank}`}>{rank}</span>
                      </div>
                      <div className="podium-name"><span>{p.name}</span>{p.me && <span className="me-tag">คุณ</span>}</div>
                      <div className={`podium-pts ${isStars ? 'stars' : ''}`}>{metric(p)}</div>
                      {isStars && <div className="podium-sub">แผนที่ {p.mapScore.toLocaleString()} · {p.pts.toLocaleString()} แต้ม</div>}
                    </div>
                    <div className="podium-block" aria-hidden="true"><span className="podium-num">{rank}</span></div>
                  </div>
                );
              })}
              <div className="podium-floor" aria-hidden="true" />
            </div>
          </section>

          {rest.length > 0 && (
            <div className="rank-list">
              {rest.map((p, i) => (
                <div className={`rank-list-row ${p.me ? 'me' : ''}`} key={i} ref={p.me ? myRowRef : null}>
                  <span className="rank-list-num">{i + 4}</span>
                  {p.avatar
                    ? <img className="rank-list-avatar" src={p.avatar} alt="" />
                    : <span className="rank-list-avatar placeholder">{p.name.charAt(0)}</span>}
                  <span className="rank-list-name">
                    <span className="rank-list-name-row">{p.name}{p.me && <span className="me-tag">คุณ</span>}</span>
                    {isStars && <small>แผนที่ {p.mapScore.toLocaleString()} · {p.pts.toLocaleString()} แต้ม</small>}
                  </span>
                  <span className={`rank-list-pts ${isStars ? 'stars' : ''}`}>{metric(p)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* separate board for the ถูก/ผิด mode */}
      {isLoggedIn && player && <QuizLeaderboard playerId={player.id} refreshKey={points} />}
    </>
  );
}
