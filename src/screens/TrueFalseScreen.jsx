import { useEffect, useRef, useState } from 'react';
import { makeRound, moreQuestions, TF_ROUND_SIZE, TF_LEVELS, TF_LEVEL_IDS, answerPoints, roundPoints } from '../lib/tfQuestions';
import { playCorrect, playWrong, playHarvestPass, playHarvestFail, playUnlock } from '../lib/sound';
import ItemBar from '../components/ItemBar';
import { TIME_BONUS_MS } from '../data/shopItems';
import StarIcon from '../components/StarIcon';
import Fireworks from '../components/Fireworks';
import IntroModal from '../components/IntroModal';

const ROUND_SIZE = TF_ROUND_SIZE;
// best score per difficulty; medium also reads the pre-difficulty key so an
// old best isn't lost
const bestKey = (d) => `ndd_tf_best_${d}`;

function readBest(d) {
  try {
    const v = Number(localStorage.getItem(bestKey(d)));
    if (v) return v;
    return d === 'medium' ? Number(localStorage.getItem('ndd_tf_best')) || 0 : 0;
  } catch { return 0; }
}
function saveBest(d, v) {
  try { localStorage.setItem(bestKey(d), String(v)); } catch { /* storage unavailable */ }
}
// all-time best combo (longest correct streak) per difficulty, this device
const comboKey = (d) => `ndd_tf_combo_${d}`;
function readBestCombo(d) {
  try { return Number(localStorage.getItem(comboKey(d))) || 0; } catch { return 0; }
}
function saveBestCombo(d, v) {
  try { localStorage.setItem(comboKey(d), String(v)); } catch { /* storage unavailable */ }
}
// the 10-question levels shown in the picker (survival has its own box)
const ROUND_LEVEL_IDS = TF_LEVEL_IDS.filter((d) => !TF_LEVELS[d].survival);
const survivalStars = (n) => (n >= 20 ? 3 : n >= 10 ? 2 : n >= 5 ? 1 : 0);
const starsFor = (score) => (score >= 9 ? 3 : score >= 7 ? 2 : score >= 4 ? 1 : 0);
const TITLES = ['สู้ๆ ลองใหม่อีกครั้ง!', 'ดีแล้ว ลองอีกนะ!', 'เก่งมาก!', 'สุดยอด! เซียนดินตัวจริง'];

// "ถูกหรือผิด?" — a quick standalone quiz mode, separate from the map: 10
// true/false statements generated from the knowledge data at the chosen
// difficulty (easy/medium/hard: time per question, topics, points), with a
// streak counter, then a result card. Every finished round adds points to the
// player's total (via onRoundFinished → App → server); it never touches map
// progress. The best round score is kept on this device.
export default function TrueFalseScreen({ careMethods, fertilizers, onRoundFinished, inventory = {}, onUseItem }) {
  const [phase, setPhase] = useState('intro'); // intro | play | done
  const [difficulty, setDifficulty] = useState('medium'); // picker selection — always opens on กลาง
  const [runMode, setRunMode] = useState(difficulty); // what's being played: a level id or 'survival'
  const mode = phase === 'intro' ? difficulty : runMode;
  const level = TF_LEVELS[mode];
  const timeMs = level.timeMs;
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]); // true/false per answered question
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [picked, setPicked] = useState(null); // null | true | false | 'timeout'
  const [secondsLeft, setSecondsLeft] = useState(timeMs / 1000);
  const [bests, setBests] = useState(() => Object.fromEntries(TF_LEVEL_IDS.map((d) => [d, readBest(d)])));
  const best = bests[mode];
  const [bestCombos, setBestCombos] = useState(() => Object.fromEntries(TF_LEVEL_IDS.map((d) => [d, readBestCombo(d)])));
  const bestCombo = bestCombos[mode];
  const [newComboRecord, setNewComboRecord] = useState(false);
  const [showHelp, setShowHelp] = useState(null); // ⓘ how-to popup: 'tf' | 'survival' | null (intro only)
  const [newBest, setNewBest] = useState(false);
  // points this round added to the total: null = saving, number = done, 'error'
  const [earned, setEarned] = useState(null);
  const timerRef = useRef(null);
  const tickRef = useRef(null);
  const deadlineRef = useRef(0);
  // timer bar restarts (new key) from `barFrom` over `barMs` — lets ⏱️ add time
  const [bar, setBar] = useState({ key: 0, from: 1, ms: timeMs });
  const [boostOn, setBoostOn] = useState(false); // ✨ x2 used this round
  const [timeFlash, setTimeFlash] = useState(0);
  const [gain, setGain] = useState({ pts: 0, streak: 0 }); // last answer's points (for the +X pop)
  const [lives, setLives] = useState(0); // survival only

  const q = questions[idx];
  const answered = picked !== null;
  const correct = answered && picked === q?.answer;
  const score = results.filter(Boolean).length;

  function start(m = difficulty) {
    setRunMode(m);
    setLives(TF_LEVELS[m].lives || 0);
    setQuestions(makeRound(ROUND_SIZE, { careMethods, fertilizers }, m));
    setIdx(0); setResults([]); setStreak(0); setBestStreak(0); setPicked(null); setNewBest(false); setNewComboRecord(false); setEarned(null); setBoostOn(false);
    setPhase('play');
  }

  function clearTimers() {
    clearTimeout(timerRef.current);
    clearInterval(tickRef.current);
  }

  function armTimer(ms) {
    clearTimers();
    deadlineRef.current = Date.now() + ms;
    setBar((b) => ({ key: b.key + 1, from: Math.min(1, ms / timeMs), ms }));
    setSecondsLeft(Math.ceil(ms / 1000));
    tickRef.current = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
    }, 200);
    // eslint-disable-next-line no-use-before-define
    timerRef.current = setTimeout(() => answer('timeout'), ms);
  }

  function applyItem(itemId) {
    if (answered || !onUseItem) return;
    onUseItem(itemId, 'tf').then((ok) => {
      if (!ok) return;
      playUnlock();
      if (itemId === 'time') {
        armTimer(Math.max(0, deadlineRef.current - Date.now()) + TIME_BONUS_MS);
        setTimeFlash((n) => n + 1);
      } else if (itemId === 'double') setBoostOn(true);
    });
  }

  function answer(value) {
    if (answered) return;
    clearTimers();
    setPicked(value);
    const ok = value === q.answer;
    setResults((r) => [...r, ok]);
    if (ok) {
      playCorrect();
      const n = streak + 1;
      setStreak(n);
      setBestStreak((b) => Math.max(b, n));
      setGain({ pts: answerPoints(n, mode), streak: n });
    } else {
      playWrong();
      setStreak(0);
      if (level.survival) setLives((l) => l - 1); // a miss (or timeout) costs a heart
    }
  }

  function next() {
    if (level.survival) {
      if (lives > 0) {
        // endless: keep a few questions queued ahead
        if (idx + 3 >= questions.length) setQuestions((qs) => [...qs, ...moreQuestions(10, { careMethods, fertilizers }, qs)]);
        setIdx(idx + 1);
        setPicked(null);
        return;
      }
    } else if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setPicked(null);
      return;
    }
    const isBest = score > best;
    if (isBest) { setBests((b) => ({ ...b, [mode]: score })); saveBest(mode, score); }
    setNewBest(isBest);
    const isComboRecord = bestStreak > bestCombo;
    if (isComboRecord) { setBestCombos((c) => ({ ...c, [mode]: bestStreak })); saveBestCombo(mode, bestStreak); }
    setNewComboRecord(isComboRecord);
    if ((level.survival ? survivalStars(score) : starsFor(score)) >= 2) playHarvestPass(); else playHarvestFail();
    setPhase('done');
    Promise.resolve(onRoundFinished?.(results, boostOn, mode))
      .then((pts) => setEarned(typeof pts === 'number' ? pts : 0))
      .catch(() => setEarned('error'));
  }

  // per-question countdown (running out counts as a miss) + the seconds readout
  useEffect(() => {
    if (phase !== 'play') return undefined;
    armTimer(timeMs);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  if (phase === 'intro') {
    const sv = TF_LEVELS.survival;
    return (
      <>
      {showHelp && <IntroModal mode={showHelp} onNext={() => setShowHelp(null)} />}
      <section className={`tf-hero lv-${difficulty}`}>
        <div className="tf-rays" aria-hidden="true" />
        <button className="tf-info-btn" type="button" onClick={() => setShowHelp('tf')} aria-label="วิธีเล่น ถูก/ผิด">i</button>
        <h1 className="tf-logo">
          <span className="yes">ถูก</span><small>หรือ</small><span className="no">ผิด?</span>
        </h1>
        <p className="tf-tagline">ทายให้ไว! ข้อความเรื่องดิน พืช ปุ๋ย ถูกหรือผิด</p>
        <div className="tf-hero-stage">
          <span className="tf-float true" aria-hidden="true">✓</span>
          <img className="tf-hero-mascot" src="/mascot/nong-din-dee-happy.webp" alt="" />
          <span className="tf-float false" aria-hidden="true">✗</span>
        </div>
        <div className="tf-levels" role="radiogroup" aria-label="ระดับความยาก">
          {ROUND_LEVEL_IDS.map((d) => {
            const lv = TF_LEVELS[d];
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={difficulty === d}
                className={`tf-level lv-${d} ${difficulty === d ? 'on' : ''}`}
                onClick={() => setDifficulty(d)}
              >
                <img className="tf-level-icon" src={lv.img} alt="" />
                <b>{lv.label}</b>
              </button>
            );
          })}
        </div>
        <div className="tf-record">
          <span className="tf-record-title">สถิติของฉัน · ระดับ{level.label}</span>
          <span className="tf-record-item"><img src="/icons/shop/combo.webp" alt="" />คอมโบสูงสุด <b>{bestCombo}</b></span>
          <span className="tf-record-item"><img src="/icons/ui/trophy.webp" alt="" />ถูกสูงสุด <b>{best}/{ROUND_SIZE}</b></span>
        </div>
        <div className="tf-chips">
          <span><i>🎯</i>{ROUND_SIZE} ข้อ</span>
          <span><i>📚</i>{level.hint}</span>
          <span><img className="tf-ico" src="/icons/shop/combo.webp" alt="" />คอมโบ</span>
        </div>
        <p className="tf-points-note">ระดับ{level.label}: ข้อละ {level.timeMs / 1000} วินาที · ถูกข้อละ {level.perCorrect} แต้ม · ตอบถูกติดกันได้โบนัสคอมโบ — เล่นกี่รอบก็สะสมแต้มได้!</p>
        <button className={`tf-start lv-${difficulty}`} type="button" onClick={() => start(difficulty)}>
          <img className="tf-start-icon" src={level.img} alt="" />เริ่มเลย! ระดับ{level.label}
        </button>
      </section>

      {/* separate box: endless survival mode */}
      <section className="surv-box">
        <button className="tf-info-btn surv-info-btn" type="button" onClick={() => setShowHelp('survival')} aria-label="วิธีเล่น เอาตัวรอด">i</button>
        <div className="surv-head">
          <img className="surv-badge" src="/icons/shop/survival.webp" alt="" />
          <div>
            <h2 className="tf-logo surv-logo">
              <span className="yes">ถูก</span><small>หรือ</small><span className="no">ผิด?</span>
              <em>เอาตัวรอด</em>
            </h2>
            <p>ตอบไปเรื่อยๆ ไม่จำกัดข้อ · มี 3 หัวใจ · ผิดหรือหมดเวลาเสีย 1 หัวใจ</p>
          </div>
        </div>
        <div className="tf-chips">
          <span><i>⏱️</i>ข้อละ {sv.timeMs / 1000} วิ</span>
          <span><img className="tf-ico" src="/icons/shop/points.webp" alt="" />ถูกข้อละ {sv.perCorrect} แต้ม</span>
        </div>
        <div className="tf-record">
          <span className="tf-record-item"><img src="/icons/ui/trophy.webp" alt="" />รอดได้สูงสุด <b>{bests.survival}</b> ข้อ</span>
          <span className="tf-record-item"><img src="/icons/shop/combo.webp" alt="" />คอมโบสูงสุด <b>{bestCombos.survival}</b></span>
        </div>
        <button className="tf-start lv-survival" type="button" onClick={() => start('survival')}><img className="heart-ico" src="/icons/shop/heart.webp" alt="" />เริ่มเอาตัวรอด!</button>
      </section>
      </>
    );
  }

  if (phase === 'done') {
    const stars = level.survival ? survivalStars(score) : starsFor(score);
    return (
      <>
        <section className="tf-done">
          {stars >= 2 && <Fireworks opening={2} bursts={stars === 3 ? 9 : 5} startDelay={900} />}
          <div className="tf-ribbon"><span>{TITLES[stars]}</span></div>
          <span className={`tf-level-chip lv-${mode}`}>{level.img ? <img src={level.img} alt="" /> : level.icon}{level.survival ? level.label : `ระดับ${level.label}`}</span>
          <div className="tf-done-stars">
            {stars > 0 && <div className="tf-rays small" aria-hidden="true" />}
            {[0, 1, 2].map((i) => (
              <span key={i} className={`tf-done-star s${i} ${i < stars ? 'earned' : ''}`} style={{ '--delay': `${0.25 + i * 0.3}s` }}>
                <StarIcon filled={i < stars} />
              </span>
            ))}
          </div>
          <div className="tf-done-row">
            {/* น้องดินดี reacts: trophy cheer on a good round, encouraging thumbs-up otherwise */}
            <img className="tf-done-mascot" src={stars >= 2 ? '/mascot/nong-din-dee-cheer.webp' : '/mascot/nong-din-dee-sad.webp'} alt="" />
            {level.survival
              ? <div className="tf-done-score"><b>{score}</b> ข้อ<span>ที่รอดได้</span></div>
              : <div className="tf-done-score"><b>{score}</b>/{questions.length}<span>ข้อที่ตอบถูก</span></div>}
          </div>
          <div className={`tf-earned ${earned === 'error' ? 'error' : ''}`}>
            {earned === null && 'กำลังบันทึกแต้ม...'}
            {typeof earned === 'number' && <><img src="/icons/shop/points.webp" alt="" />+{earned} แต้มสะสม</>}
          </div>
          <div className="tf-earned-breakdown">
            {(() => {
              const r = roundPoints(results, mode);
              return level.noCombo
                ? <>ถูก {score} ข้อ × {level.perCorrect} แต้ม{boostOn ? ' · ✨ x2' : ''}</>
                : <>แต้มพื้นฐาน {r.base} + โบนัสคอมโบ {r.combo}{boostOn ? ' · ✨ x2' : ''}</>;
            })()}
            {earned === 'error' && 'บันทึกแต้มไม่สำเร็จ ลองเล่นรอบใหม่อีกครั้งนะ'}
          </div>
          {!level.survival && <div className="tf-result-dots" aria-hidden="true">
            {results.map((ok, i) => <i key={i} className={ok ? 'ok' : 'miss'}>{ok ? '✓' : '✗'}</i>)}
          </div>}
          <div className="tf-done-stats">
            <div><img className="tf-ico big" src="/icons/shop/combo.webp" alt="" /><b>{bestStreak}</b><span>คอมโบรอบนี้ · สถิติ {Math.max(bestCombo, bestStreak)}</span></div>
            <div><img className="tf-ico big" src="/icons/ui/trophy.webp" alt="" /><b>{best}</b><span>{level.survival ? 'รอดได้สูงสุด (ข้อ)' : `คะแนนสูงสุด (${level.label})`}</span></div>
          </div>
          {(newBest || newComboRecord) && (
            <div className="tf-records-row">
              {newComboRecord && <div className="new-record-badge combo">คอมโบสูงสุดใหม่!</div>}
              {newBest && <div className="new-record-badge">New Record!</div>}
            </div>
          )}
        </section>
        <button className="tf-start" type="button" onClick={() => start(runMode)}>เล่นอีกรอบ</button>
        <button className="btn secondary tf-back" type="button" onClick={() => setPhase('intro')}>กลับหน้าเริ่ม</button>
      </>
    );
  }

  if (!q) return null;
  const danger = !answered && secondsLeft <= 3;
  return (
    <section className="tf-show">
      <div className="tf-spot" aria-hidden="true" />
      <div className="tf-top">
        {level.survival ? (
          <div className="tf-lives" aria-label={`เหลือ ${lives} หัวใจ · ถูก ${score} ข้อ`}>
            {Array.from({ length: level.lives }, (_, i) => <img key={i} className={`heart-ico ${i < lives ? 'on' : 'off'}`} src="/icons/shop/heart.webp" alt="" />)}
            <b className="tf-surv-count">ถูก {score}</b>
          </div>
        ) : (
          <>
            <div className="tf-dots" aria-label={`ข้อ ${idx + 1} จาก ${questions.length}`}>
              {questions.map((_, i) => (
                <i key={i} className={i < results.length ? (results[i] ? 'ok' : 'miss') : i === idx ? 'now' : ''} />
              ))}
            </div>
            <span className={`tf-level-chip small lv-${mode}`}><img src={level.img} alt="" />{level.label}</span>
          </>
        )}
        {boostOn && <span className="boost-badge">✨ x2</span>}
        <span className={`tf-streak ${streak >= 2 ? 'hot' : ''}`}><img className="tf-ico" src="/icons/shop/combo.webp" alt="" />{streak}</span>
      </div>
      <div className="tf-timer">
        <div className="tf-timer-track">
          <div key={`${idx}-${bar.key}`} className={`tf-timer-bar ${answered ? 'stopped' : ''} ${danger ? 'danger' : ''}`} style={{ animationDuration: `${bar.ms}ms`, '--from': bar.from }} />
        </div>
        <span className={`tf-secs ${danger ? 'danger' : ''}`}>
          {answered ? '—' : secondsLeft}
          {timeFlash > 0 && <i key={timeFlash} className="tf-secs-plus">+10</i>}
        </span>
      </div>
      <ItemBar mode="tf" inventory={inventory} active={{ double: boostOn }} blocked={answered} onUse={applyItem} />

      <div className={`tf-card ${answered ? (correct ? 'is-correct' : 'is-wrong') : ''}`} key={idx}>
        <span className="tf-qnum">ข้อ {idx + 1}</span>
        <div className="tf-art-badge">
          {q.img ? <img src={q.img} alt="" /> : <span>{q.icon}</span>}
        </div>
        <p className="tf-statement">{q.text}</p>
        {answered && (
          <>
            <span className={`tf-stamp ${correct ? 'ok' : 'miss'}`} aria-hidden="true">
              {picked === 'timeout' ? 'หมดเวลา' : correct ? 'ถูก!' : 'ผิด!'}
            </span>
            {correct && <span className="tf-plus" aria-hidden="true">+{gain.pts}{gain.streak >= 2 && <small>คอมโบ x{gain.streak}</small>}</span>}
            <div className="tf-verdict">
              <span>ข้อนี้ <b className={q.answer ? 'yes' : 'no'}>{q.answer ? 'ถูก' : 'ผิด'}</b> — {q.explain}</span>
            </div>
            {!correct && level.survival && <span className="tf-heart-lost" aria-hidden="true">-1 <img className="heart-ico" src="/icons/shop/heart.webp" alt="" /></span>}
          </>
        )}
      </div>

      {!answered ? (
        <div className="tf-buttons">
          <button type="button" className="tf-btn true" onClick={() => answer(true)}>
            <span className="tf-btn-icon">✓</span>ถูก
          </button>
          <button type="button" className="tf-btn false" onClick={() => answer(false)}>
            <span className="tf-btn-icon">✗</span>ผิด
          </button>
        </div>
      ) : (
        <button className="tf-start tf-next" type="button" onClick={next}>
          {(level.survival ? lives > 0 : idx + 1 < questions.length)
            ? 'ข้อต่อไป ›'
            : <><img className="tf-ico btn" src="/icons/ui/trophy.webp" alt="" />{level.survival ? 'หมดหัวใจ — ดูผลคะแนน' : 'ดูผลคะแนน'}</>}
        </button>
      )}
    </section>
  );
}
