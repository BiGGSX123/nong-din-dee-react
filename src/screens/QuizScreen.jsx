import { useEffect, useRef, useState } from 'react';
import { cropById } from '../data/content';
import { getSuitabilityTier, CROP_FERT_CORRECT } from '../data/knowledge';
import { playCorrect, playWrong, playUnlock } from '../lib/sound';
import ItemBar from '../components/ItemBar';
import { careIcon, fertIcon } from '../lib/choiceIcons';
import { TIME_BONUS_MS } from '../data/shopItems';

const QUIZ_TIME_MS = 30000; // 30s per question on map levels

export default function QuizScreen({ level, levelNumber, soil, step, pickedCropId, careMethods, fertilizers, onStepComplete, onBack, inventory = {}, onUseItem }) {
  const [answeredIdx, setAnsweredIdx] = useState(null);
  const [correct, setCorrect] = useState(null);
  const [timedOut, setTimedOut] = useState(false);
  const [timerClass, setTimerClass] = useState('');
  const [barAnimating, setBarAnimating] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(QUIZ_TIME_MS / 1000);
  // timer bar: starts at `barFrom` (fraction of full) and shrinks over `barMs`
  const [barFrom, setBarFrom] = useState(1);
  const [barMs, setBarMs] = useState(QUIZ_TIME_MS);
  // items: choices hidden by 💡 this step, x2 active for this level (the
  // component remounts per level, so this resets between levels)
  const [eliminated, setEliminated] = useState([]);
  const [boostOn, setBoostOn] = useState(false);
  const [timeFlash, setTimeFlash] = useState(0);
  const deadlineRef = useRef(0);
  const startedAtRef = useRef(0); // when this question appeared (speed bonus)

  const timeoutRef = useRef(null);
  const warnRef = useRef(null);
  const dangerRef = useRef(null);
  const advanceRef = useRef(null);
  const rafRef = useRef(null);
  const tickRef = useRef(null);

  const stageRef = useRef(null);
  const islandRef = useRef(null);
  const cropImgRef = useRef(null);

  const kind = step === 0 ? 'care' : step === 1 ? 'crop' : 'fert';
  const picked = pickedCropId ? cropById(pickedCropId) : null;

  const answered = answeredIdx !== null;

  function clearTimers() {
    clearInterval(tickRef.current);
    cancelAnimationFrame(rafRef.current);
    clearTimeout(timeoutRef.current);
    clearTimeout(warnRef.current);
    clearTimeout(dangerRef.current);
  }

  // (re)start the countdown with `ms` left — used at the start of each step
  // and again when a ⏱️ item adds time mid-question
  function armTimer(ms) {
    clearTimers();
    deadlineRef.current = Date.now() + ms;
    setBarFrom(Math.min(1, ms / QUIZ_TIME_MS));
    setBarMs(ms);
    setBarAnimating(false);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => setBarAnimating(true));
    });
    setTimerClass(ms <= QUIZ_TIME_MS * 0.2 ? 'danger' : ms <= QUIZ_TIME_MS * 0.5 ? 'warn' : '');
    const warnIn = ms - QUIZ_TIME_MS * 0.5;
    const dangerIn = ms - QUIZ_TIME_MS * 0.2;
    if (warnIn > 0) warnRef.current = setTimeout(() => setTimerClass('warn'), warnIn);
    if (dangerIn > 0) dangerRef.current = setTimeout(() => setTimerClass('danger'), dangerIn);
    // eslint-disable-next-line no-use-before-define
    timeoutRef.current = setTimeout(() => handleAnswer(-1, null, true), ms);
    setSecondsLeft(Math.ceil(ms / 1000));
    tickRef.current = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
    }, 200);
  }

  useEffect(() => {
    setAnsweredIdx(null);
    setCorrect(null);
    setTimedOut(false);
    setEliminated([]);
    clearTimeout(advanceRef.current);
    startedAtRef.current = Date.now();
    armTimer(QUIZ_TIME_MS);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => () => clearTimeout(advanceRef.current), []);

  function handleAnswer(idx, extra, wasTimedOut) {
    clearTimers();
    setBarAnimating(false);

    let isCorrect = false;
    if (!wasTimedOut) {
      if (kind === 'care') isCorrect = idx === level.careCorrectIdx;
      else if (kind === 'crop') {
        // accept any choice rated at least "moderate" fit for this soil, not
        // just the level's one stored answer — a real moderate-fit crop is a
        // genuinely acceptable answer, not a wrong one, and the flat bar (vs.
        // matching the stored answer's own tier) is what lets crops whose
        // best soil isn't in the game (e.g. only loam) still count correct
        // wherever the real data says they're at least moderately suited
        isCorrect = getSuitabilityTier(extra, soil.id) >= 1;
      }
      else if (kind === 'fert') {
        const fertCorrectIdx = picked ? CROP_FERT_CORRECT[picked.id] : level.fertCorrectIdx;
        isCorrect = extra === fertCorrectIdx;
      }
    }
    setAnsweredIdx(idx);
    setCorrect(isCorrect);
    setTimedOut(wasTimedOut);
    if (isCorrect) playCorrect(); else playWrong();

    const usedMs = Date.now() - startedAtRef.current; // answer time, before the feedback pause
    advanceRef.current = setTimeout(() => {
      onStepComplete(kind, isCorrect, extra, usedMs);
    }, 1100);
  }

  const fertCorrect = picked ? CROP_FERT_CORRECT[picked.id] : level.fertCorrectIdx;

  // hide ⌈half⌉ of this step's wrong choices (never a right one)
  function fiftyFifty() {
    let wrong;
    if (kind === 'care') wrong = careMethods.map((_, i) => i).filter((i) => i !== level.careCorrectIdx);
    else if (kind === 'crop') wrong = level.cropChoices.filter((id) => getSuitabilityTier(id, soil.id) < 1);
    else wrong = fertilizers.map((_, i) => i).filter((i) => i !== fertCorrect);
    const shuffled = [...wrong].sort(() => Math.random() - 0.5);
    setEliminated(shuffled.slice(0, Math.ceil(wrong.length / 2)));
  }

  function applyItem(itemId) {
    if (answered || !onUseItem) return;
    onUseItem(itemId, 'map').then((ok) => {
      if (!ok || answeredIdx !== null) return;
      playUnlock();
      if (itemId === 'time') {
        armTimer(Math.max(0, deadlineRef.current - Date.now()) + TIME_BONUS_MS);
        setTimeFlash((n) => n + 1);
      } else if (itemId === 'fifty') fiftyFifty();
      else if (itemId === 'double') setBoostOn(true);
    });
  }

  // resize the stage so the crop art never overlaps or leaves a gap, measured not fixed
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const island = islandRef.current;
    const crop = cropImgRef.current;
    const cropBottom = 148;
    const topPad = 24;
    const recalc = () => {
      const islandH = island ? island.getBoundingClientRect().height : 0;
      const needed = crop ? cropBottom + crop.offsetHeight + topPad : islandH + topPad;
      stage.style.height = Math.max(220, Math.min(420, needed)) + 'px';
    };
    recalc();
    const onLoad = () => recalc();
    if (island && !island.complete) island.addEventListener('load', onLoad, { once: true });
    if (crop && !crop.complete) crop.addEventListener('load', onLoad, { once: true });
    return () => {
      if (island) island.removeEventListener('load', onLoad);
      if (crop) crop.removeEventListener('load', onLoad);
    };
  }, [picked, soil]);


  const danger = !answered && secondsLeft <= 3;
  return (
    <section className="tf-show quiz-show">
      <div className="tf-spot" aria-hidden="true" />
      <div className="quiz-header">
        <button className="quiz-back-btn" type="button" onClick={onBack} aria-label="กลับแผนที่ด่าน">‹</button>
        <h1>ด่านที่ {levelNumber} · {level.province}</h1>
        {boostOn && <span className="boost-badge">✨ x2</span>}
      </div>
      <div className="tf-timer">
        <div className="tf-timer-track">
          <div
            className={`quiz-timer-bar ${timerClass}`}
            style={{
              width: barAnimating ? '0%' : `${barFrom * 100}%`,
              transition: barAnimating ? `width ${barMs}ms linear` : 'none',
            }}
          />
        </div>
        <span className={`tf-secs ${danger ? 'danger' : ''}`}>
          {answered ? '—' : secondsLeft}
          {timeFlash > 0 && <i key={timeFlash} className="tf-secs-plus">+10</i>}
        </span>
      </div>
      <ItemBar mode="map" inventory={inventory} active={{ double: boostOn }} blocked={answered} onUse={applyItem} />
      <div className="quiz-stage-wrap">
        <div className="quiz-stage" ref={stageRef}>
          <img className="island" ref={islandRef} src={soil.img} alt="" />
          {picked && <img className="crop-img" ref={cropImgRef} src={picked.img} alt="" />}
        </div>
        <div className="quiz-stage-label">
          {picked
            ? <>กำลังปลูก <b>{picked.nameTh}</b> บน{soil.nameTh}</>
            : <><b>{soil.nameTh}</b></>}
        </div>
      </div>
      <div className={`q-card ${answered ? (correct ? 'is-correct' : 'is-wrong') : ''}`}>
        <span className="tf-qnum">ข้อ {step + 1}/3</span>
        {answered && (
          <>
            <span className={`tf-stamp ${correct ? 'ok' : 'miss'}`} aria-hidden="true">
              {timedOut ? 'หมดเวลา' : correct ? 'ถูก!' : 'ผิด!'}
            </span>
            {correct && <span className="tf-plus" aria-hidden="true">+1</span>}
          </>
        )}
        {kind === 'care' && (
          <>
            <h2>ควรดูแลดินชุดนี้ด้วยวิธีใด?</h2>
            <div className="choices-8">
              {careMethods.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  className={`choice-btn ${answered && i === answeredIdx ? (correct ? 'correct' : 'wrong') : ''} ${eliminated.includes(i) ? 'eliminated' : ''}`}
                  disabled={answered || eliminated.includes(i)}
                  onClick={() => handleAnswer(i, null, false)}
                >
                  {/* letter rides on the icon's corner so the text gets the full width */}
                  <span className="choice-badge">
                    {careIcon(m) && <img className="choice-icon" src={careIcon(m)} alt="" />}
                    <span className="letter">{String.fromCharCode(65 + i)}</span>
                  </span>
                  <span className="choice-text">{m}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {kind === 'crop' && (
          <>
            <h2>ควรปลูกพืชใดในแปลงนี้?</h2>
            <div className="choices-4">
              {level.cropChoices.map((cropId, i) => {
                const c = cropById(cropId);
                if (!c) return null;
                return (
                  <button
                    key={cropId}
                    type="button"
                    className={`crop-choice ${answered && i === answeredIdx ? (correct ? 'correct' : 'wrong') : ''} ${eliminated.includes(cropId) ? 'eliminated' : ''}`}
                    disabled={answered || eliminated.includes(cropId)}
                    onClick={() => handleAnswer(i, cropId, false)}
                  >
                    <span className="sticker-frame"><img src={c.img} alt="" /></span>
                    <div className="name">{String.fromCharCode(65 + i)}. {c.nameTh}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {kind === 'fert' && (() => {
          const fertOrder = level.fertOrder.slice();
          for (let idx = 0; idx < fertilizers.length; idx++) {
            if (!fertOrder.includes(idx)) fertOrder.push(idx);
          }
          const correctCrop = picked || cropById(level.cropCorrectId);
          return (
            <>
              <h2>ควรใส่ปุ๋ยชนิดใดให้ {correctCrop ? correctCrop.nameTh : ''}?</h2>
              {fertOrder.map((fertIdx, i) => {
                const f = fertilizers[fertIdx];
                if (!f) return null;
                return (
                  <button
                    key={fertIdx}
                    type="button"
                    className={`fert-choice-btn ${answered && i === answeredIdx ? (correct ? 'correct' : 'wrong') : ''} ${eliminated.includes(fertIdx) ? 'eliminated' : ''}`}
                    disabled={answered || eliminated.includes(fertIdx)}
                    onClick={() => handleAnswer(i, fertIdx, false)}
                  >
                    <span className="letter" style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', background: 'var(--soil-mid)', color: 'var(--cream)', fontSize: 9, textAlign: 'center', lineHeight: '16px', marginRight: 6 }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {fertIcon(f) && <img className="choice-icon" src={fertIcon(f)} alt="" />}
                    <span className="choice-text">{f.label} <span style={{ opacity: 0.65, fontWeight: 500 }}>— {f.sub}</span></span>
                  </button>
                );
              })}
            </>
          );
        })()}
      </div>
    </section>
  );
}
