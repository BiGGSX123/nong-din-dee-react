import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { itemById } from '../data/shopItems';
import { characterById } from '../data/characters';
import { TF_LEVELS } from '../lib/tfQuestions';
import StarIcon from '../components/StarIcon';
import { rankOf } from '../lib/rank';

// ข้อมูลส่วนตัว — opened from the HUD avatar. Profile card, stat tiles and the
// points history (PointLog on the server; an in-memory list for guests).
const HISTORY_LIMIT = 60;
const FILTERS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'in', label: 'ได้รับ' },
  { id: 'out', label: 'ใช้ไป' },
];

// what a ledger entry was for → icon + Thai title (+ optional tag)
function describe(e, levels) {
  switch (e.kind) {
    case 'level': {
      const province = levels[Number(e.ref)]?.province || `ด่าน ${Number(e.ref) + 1}`;
      return { icon: '/icons/ui/map.webp', title: e.amount >= 0 ? `ผ่านด่าน ${province}` : `ปรับแต้มด่าน ${province}` };
    }
    case 'quiz': {
      const [diff, x2] = String(e.ref || '').split(':');
      const lv = TF_LEVELS[diff];
      return { icon: lv?.img || '/icons/shop/combo.webp', title: `ถูก หรือ ผิด · ${lv?.label || 'รอบเล่น'}`, tag: x2 ? 'x2' : null };
    }
    case 'shop': {
      const item = itemById(e.ref);
      return { icon: item?.img || '/icons/shop/shop.webp', title: `ซื้อ ${item?.name || 'ไอเทม'}` };
    }
    case 'character': {
      const ch = characterById(e.ref);
      return { icon: ch?.img || '/icons/ui/basket.webp', title: `ซื้อ ${ch?.name || 'ตัวละครพิเศษ'}`, round: true };
    }
    case 'daily':
      return { icon: '/icons/ui/gift.webp', title: 'โบนัสตัวละครพิเศษประจำวัน' };
    case 'char-bonus': {
      const ch = characterById(e.ref);
      return { icon: ch?.img || '/icons/ui/gift.webp', title: `โบนัสวันนี้ ${ch?.name || 'ตัวละครพิเศษ'} (ซื้อใหม่)`, round: true };
    }
    case 'dividend':
      return { icon: '/icons/shop/points.webp', title: 'ปันผลรายวัน 1%' };
    default:
      return { icon: '/icons/shop/points.webp', title: 'แต้ม' };
  }
}

function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function dayLabel(d) {
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return 'วันนี้';
  if (dayKey(d) === dayKey(yesterday)) return 'เมื่อวาน';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}
const timeLabel = (d) => `${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;
const fmt = (n) => n.toLocaleString('th-TH');

export default function ProfileScreen({ player, isLoggedIn, points, levels, levelStatus, homeLevelIdx, characters, guestLog, onGoPlay }) {
  const [filter, setFilter] = useState('all');
  const [server, setServer] = useState(null); // { entries, earned, spent }
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let alive = true;
    api.getPointHistory(HISTORY_LIMIT)
      .then((res) => { if (alive) setServer(res); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [isLoggedIn, reload]);

  // guests: newest first, totals from the in-memory log
  const data = useMemo(() => {
    if (isLoggedIn) return server;
    const entries = guestLog.slice().reverse();
    return {
      entries,
      earned: entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0),
      spent: Math.abs(entries.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0)),
    };
  }, [isLoggedIn, server, guestLog]);

  const groups = useMemo(() => {
    if (!data) return [];
    const list = data.entries.filter((e) => (filter === 'in' ? e.amount > 0 : filter === 'out' ? e.amount < 0 : true));
    const out = [];
    for (const e of list) {
      const d = new Date(e.createdAt);
      const key = dayKey(d);
      if (!out.length || out[out.length - 1].key !== key) out.push({ key, label: dayLabel(d), items: [] });
      out[out.length - 1].items.push({ ...e, date: d });
    }
    return out;
  }, [data, filter]);

  const name = player?.displayName || 'น้องดินดี';
  const avatar = player?.pictureUrl || '/mascot/nong-din-dee.webp';
  const home = homeLevelIdx != null ? levels[homeLevelIdx]?.province : null;
  const joined = player?.createdAt ? new Date(player.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const completed = levelStatus.filter((s) => s.completed && s.stars > 0).length;
  const stars = levelStatus.reduce((sum, s) => sum + (s.stars || 0), 0);

  const rank = rankOf(completed);
  const STATS = [
    { key: 'levels', icon: <img src="/icons/ui/map.webp" alt="" />, value: `${completed}/${levels.length}`, label: 'ด่านที่ผ่าน' },
    { key: 'stars', icon: <StarIcon filled />, value: fmt(stars), label: 'ดาวสะสม' },
    { key: 'chars', icon: <img src="/icons/ui/basket.webp" alt="" />, value: characters.length, label: 'ตัวละครพิเศษ' },
  ];

  return (
    <div className="profile">
      <section className="pf-hero">
        <div className="pf-banner" aria-hidden="true">
          <span className="pf-cloud c1" /><span className="pf-cloud c2" /><span className="pf-cloud c3" />
        </div>
        <div className="pf-avatar-wrap">
          <div className="pf-avatar-rays" aria-hidden="true" />
          <img className="pf-avatar" src={avatar} alt="" />
          <span className="pf-rank-num" title="ระดับผู้เล่น">{rank.level}</span>
        </div>
        <h1 className="pf-name">{name}</h1>
        <div className="pf-rank">
          <StarIcon filled /><span>{rank.title}</span>
        </div>
        <div className="pf-chips">
          <span className={`pf-chip ${isLoggedIn ? 'line' : 'guest'}`}>{isLoggedIn ? 'เข้าสู่ระบบด้วย LINE' : 'ผู้เยี่ยมชม'}</span>
          {home && <span className="pf-chip home"><img src="/icons/ui/home.webp" alt="" />{home}</span>}
        </div>
        <div className="pf-next">
          <div className="pf-next-bar"><span style={{ width: `${rank.pct}%` }} /></div>
          <small>{rank.next ? <>ผ่านอีก <b>{rank.next.min - completed}</b> ด่าน เป็น “{rank.next.title}”</> : 'ระดับสูงสุดแล้ว เก่งมาก!'}</small>
        </div>
        {joined && <div className="pf-joined">เริ่มผจญภัยเมื่อ {joined}</div>}
      </section>

      <section className="pf-wallet" aria-label="แต้ม">
        <div className="pf-wallet-main">
          <img className="pf-wallet-coin" src="/icons/shop/points.webp" alt="" />
          <div>
            <small>แต้มคงเหลือ</small>
            <b>{fmt(points)}</b>
          </div>
        </div>
        <div className="pf-wallet-split">
          <div className="in"><span className="pf-sign in">+</span><div><small>ได้รับทั้งหมด</small><b>{data ? fmt(data.earned) : '–'}</b></div></div>
          <div className="out"><span className="pf-sign out">−</span><div><small>ใช้ไปแล้ว</small><b>{data ? fmt(data.spent) : '–'}</b></div></div>
        </div>
      </section>

      <div className="pf-stats">
        {STATS.map((s) => (
          <div key={s.key} className={`pf-stat ${s.tone || ''}`}>
            <span className="pf-stat-icon">{s.icon}</span>
            <b>{s.value}</b>
            <small>{s.label}</small>
          </div>
        ))}
      </div>

      <section className="pf-history">
        <div className="pf-history-head">
          <h2><img src="/icons/shop/points.webp" alt="" />ประวัติแต้ม</h2>
          <div className="pf-filters" role="tablist" aria-label="กรองประวัติ">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>{f.label}</button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="pf-empty">
            <p>โหลดประวัติไม่สำเร็จ</p>
            <button type="button" className="btn secondary" onClick={() => { setError(false); setReload((n) => n + 1); }}>ลองใหม่</button>
          </div>
        ) : !data ? (
          <div className="pf-loading" aria-label="กำลังโหลด">{[0, 1, 2].map((i) => <div key={i} className="pf-skel" />)}</div>
        ) : groups.length === 0 ? (
          <div className="pf-empty">
            <img src="/mascot/nong-din-dee-thinking.webp" alt="" />
            <p>{filter === 'all' ? 'ยังไม่มีประวัติแต้ม ไปเล่นด่านแรกกันเลย!' : filter === 'in' ? 'ยังไม่มีแต้มที่ได้รับ' : 'ยังไม่ได้ใช้แต้มเลย'}</p>
            {filter === 'all' && <button type="button" className="btn" onClick={onGoPlay}>ไปผจญภัย</button>}
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.key} className="pf-day">
              <div className="pf-day-label">{g.label}</div>
              <ul className="pf-list">
                {g.items.map((e) => {
                  const d = describe(e, levels);
                  return (
                    <li key={e.id} className="pf-row">
                      <span className={`pf-row-icon ${d.round ? 'round' : ''}`}><img src={d.icon} alt="" /></span>
                      <span className="pf-row-text">
                        <b>{d.title}{d.tag && <em className="pf-tag">{d.tag}</em>}</b>
                        <small>{timeLabel(e.date)}</small>
                      </span>
                      <span className={`pf-amount ${e.amount >= 0 ? 'in' : 'out'}`}>
                        {e.amount >= 0 ? '+' : '−'}{fmt(Math.abs(e.amount))}
                        <img src="/icons/shop/points.webp" alt="" />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}

        <p className="pf-note">
          {isLoggedIn
            ? `แสดง ${HISTORY_LIMIT} รายการล่าสุด · แต้มที่ได้ก่อนเปิดระบบประวัติจะไม่แสดงในรายการ`
            : 'โหมดผู้เยี่ยมชม ประวัติจะหายเมื่อปิดเกม เข้าสู่ระบบด้วย LINE เพื่อเก็บไว้'}
        </p>
      </section>
    </div>
  );
}
