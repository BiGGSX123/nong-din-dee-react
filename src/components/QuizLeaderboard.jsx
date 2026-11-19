import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { TF_LEVELS, TF_ROUND_SIZE } from '../lib/tfQuestions';

// "ถูกหรือผิด?" leaderboard — its own card on the ranking screen, separate
// from the main points/stars arena. One tab per mode; ranked by the best
// round score (x2 item included), ties → longest combo → who got it first.
const MODES = ['easy', 'medium', 'hard', 'survival'];
const MEDALS = ['gold', 'silver', 'bronze'];

// small gold crown over 1st place's avatar
const MiniCrown = () => (
  <svg className="qb-crown" viewBox="0 0 64 44" aria-hidden="true">
    <defs>
      <linearGradient id="qbCrownGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFF2A8" /><stop offset="0.45" stopColor="#FFCF3F" /><stop offset="1" stopColor="#E08A12" />
      </linearGradient>
    </defs>
    <path d="M6 36 L3 10 L19 22 L32 4 L45 22 L61 10 L58 36 Z" fill="url(#qbCrownGold)" stroke="#9A5A06" strokeWidth="4" strokeLinejoin="round" />
    <rect x="6" y="33" width="52" height="9" rx="3" fill="url(#qbCrownGold)" stroke="#9A5A06" strokeWidth="4" />
    <circle cx="32" cy="24" r="4.5" fill="#FF5A6E" stroke="#9A5A06" strokeWidth="2" />
  </svg>
);

export default function QuizLeaderboard({ playerId, refreshKey }) {
  const [mode, setMode] = useState('medium');
  const [result, setResult] = useState(null); // { mode, players } | { mode, error }

  useEffect(() => {
    let cancelled = false;
    api.getQuizLeaderboard(mode, 100)
      .then(({ players }) => { if (!cancelled) setResult({ mode, players }); })
      .catch(() => { if (!cancelled) setResult({ mode, error: true }); });
    return () => { cancelled = true; };
  }, [mode, refreshKey]);

  const loading = !result || result.mode !== mode;
  const rows = !loading && !result.error ? result.players : [];
  const myIdx = rows.findIndex((r) => r.id === playerId);
  const lv = TF_LEVELS[mode];

  return (
    <section className="quiz-board">
      <div className="quiz-board-head">
        <h3 className="quiz-board-title">
          <span className="yes">ถูก</span><small>หรือ</small><span className="no">ผิด?</span>
          <em>อันดับ</em>
        </h3>
        {myIdx >= 0 && <span className="quiz-board-me">อันดับของคุณ <b>#{myIdx + 1}</b></span>}
      </div>

      <div className="quiz-board-tabs" role="tablist" aria-label="ระดับ">
        {MODES.map((m) => {
          const l = TF_LEVELS[m];
          return (
            <button key={m} type="button" role="tab" aria-selected={m === mode} className={`lv-${m} ${m === mode ? 'on' : ''}`} onClick={() => setMode(m)}>
              {l.img && <img src={l.img} alt="" />}{l.label}
            </button>
          );
        })}
      </div>
      <p className="quiz-board-rule">คะแนนรอบที่ดีที่สุด</p>

      {loading ? (
        <div className="quiz-board-empty">กำลังโหลดอันดับ...</div>
      ) : result.error ? (
        <div className="quiz-board-empty">โหลดอันดับไม่สำเร็จ</div>
      ) : rows.length === 0 ? (
        <div className="quiz-board-empty">ยังไม่มีใครทำสถิติใน{lv.survival ? 'โหมด' : 'ระดับ'}{lv.label} เป็นคนแรกเลย!</div>
      ) : (
        <ol className="quiz-board-list">
          {rows.map((r, i) => (
            <li key={r.id} className={`${MEDALS[i] || ''} ${r.id === playerId ? 'me' : ''}`}>
              <span className="qb-rank">{i + 1}</span>
              <span className="qb-avatar-wrap">
                {i === 0 && <MiniCrown />}
                {r.pictureUrl
                  ? <img className="qb-avatar" src={r.pictureUrl} alt="" />
                  : <span className="qb-avatar placeholder">{r.displayName.charAt(0)}</span>}
              </span>
              <span className="qb-name">
                <span className="qb-name-row">{r.displayName}{r.id === playerId && <span className="me-tag">คุณ</span>}</span>
                <small>
                  {lv.survival ? `รอด ${r.correct} ข้อ` : `ถูก ${r.correct}/${TF_ROUND_SIZE}`}
                  {' · '}<img src="/icons/shop/combo.webp" alt="" />คอมโบ {r.combo}
                </small>
              </span>
              <span className="qb-score"><b>{r.score.toLocaleString()}</b>คะแนน</span>
            </li>
          ))}
        </ol>
      )}
      {!loading && !result.error && rows.length > 0 && myIdx < 0 && (
        <div className="quiz-board-hint">คุณยังไม่มีสถิติใน{lv.survival ? 'โหมด' : 'ระดับ'}{lv.label} — ไปเล่นถูก หรือ ผิด เพื่อติดอันดับ!</div>
      )}
    </section>
  );
}
