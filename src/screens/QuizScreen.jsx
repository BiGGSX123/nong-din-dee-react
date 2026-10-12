import { useEffect, useRef, useState } from 'react';
import { cropById } from '../data/content';
import { getSuitabilityTier } from '../data/knowledge';
import { playCorrect, playWrong } from '../lib/sound';

const QUIZ_TIME_MS = 20000;

export default function QuizScreen({ level, levelNumber, soil, step, pickedCropId, careMethods, fertilizers, onStepComplete, onBack }) {
  const [answeredIdx, setAnsweredIdx] = useState(null);
  const [correct, setCorrect] = useState(null);
  const [timedOut, setTimedOut] = useState(false);
  const [timerClass, setTimerClass] = useState('');
  const [barAnimating, setBarAnimating] = useState(false);

  const timeoutRef = useRef(null);
  const warnRef = useRef(null);
  const dangerRef = useRef(null);
  const advanceRef = useRef(null);
  const rafRef = useRef(null);

  const stageRef = useRef(null);
  const islandRef = useRef(null);
  const cropImgRef = useRef(null);

  const kind = step === 0 ? 'care' : step === 1 ? 'crop' : 'fert';
  const picked = pickedCropId ? cropById(pickedCropId) : null;

  const answered = answeredIdx !== null;

  useEffect(() => {
    setAnsweredIdx(null);
    setCorrect(null);
    setTimedOut(false);
    setTimerClass('');
    clearTimeout(timeoutRef.current);
    clearTimeout(warnRef.current);
    clearTimeout(dangerRef.current);
    clearTimeout(advanceRef.current);
    cancelAnimationFrame(rafRef.current);

    setBarAnimating(false);
    rafRef.current = requestAnimationFrame(() => setBarAnimating(true));

    warnRef.current = setTimeout(() => setTimerClass('warn'), QUIZ_TIME_MS * 0.5);
    dangerRef.current = setTimeout(() => setTimerClass('danger'), QUIZ_TIME_MS * 0.8);
    // eslint-disable-next-line no-use-before-define
    timeoutRef.current = setTimeout(() => handleAnswer(-1, null, true), QUIZ_TIME_MS);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timeoutRef.current);
      clearTimeout(warnRef.current);
      clearTimeout(dangerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => () => clearTimeout(advanceRef.current), []);

  function handleAnswer(idx, extra, wasTimedOut) {
    clearTimeout(timeoutRef.current);
    clearTimeout(warnRef.current);
    clearTimeout(dangerRef.current);
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
      else if (kind === 'fert') isCorrect = extra === level.fertCorrectIdx;
    }
    setAnsweredIdx(idx);
    setCorrect(isCorrect);
    setTimedOut(wasTimedOut);
    if (isCorrect) playCorrect(); else playWrong();

    advanceRef.current = setTimeout(() => {
      onStepComplete(kind, isCorrect, extra);
    }, 1100);
  }

  // resize the stage so the crop art never overlaps or leaves a gap, measured not fixed
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const island = islandRef.current;
    const crop = cropImgRef.current;
    const cropBottom = 140;
    const topPad = 24;
    const recalc = () => {
      const islandH = island ? island.getBoundingClientRect().height : 0;
      const needed = crop ? cropBottom + crop.getBoundingClientRect().height + topPad : islandH + topPad;
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

  let feedbackText = '';
  let feedbackCls = 'feedback';
  if (answered) {
    feedbackText = timedOut ? 'หมดเวลา! ⏰' : (correct ? 'ถูกต้อง! 🌱' : 'ยังไม่ถูก');
    feedbackCls = 'feedback ' + (correct ? 'ok' : 'miss');
  }

  return (
    <>
      <div className="quiz-header">
        <button className="quiz-back-btn" type="button" onClick={onBack} aria-label="กลับแผนที่ด่าน">‹</button>
        <h1>ด่านที่ {levelNumber} · {level.province}</h1>
      </div>
      <div className="quiz-timer">
        <div
          className={`quiz-timer-bar ${timerClass}`}
          style={{
            width: barAnimating ? '0%' : '100%',
            transition: barAnimating ? `width ${QUIZ_TIME_MS}ms linear` : 'none',
          }}
        />
      </div>
      <div className="quiz-stage-wrap">
        <div className="quiz-stage" ref={stageRef}>
          <img className="island" ref={islandRef} src={soil.img} alt="" />
          {picked && <img className="crop-img" ref={cropImgRef} src={picked.img} alt="" />}
        </div>
        <div className="quiz-stage-label">
          {picked
            ? <>กำลังปลูก <b>{picked.nameTh}</b> บน{soil.nameTh}</>
            : <>ชุดดินที่สุ่มได้: <b>{soil.nameTh}</b></>}
        </div>
      </div>
      <div className="q-card">
        {kind === 'care' && (
          <>
            <h2>1/3 · ควรดูแลดินชุดนี้ด้วยวิธีใด?</h2>
            <div className="choices-8">
              {careMethods.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  className={`choice-btn ${answered && i === answeredIdx ? (correct ? 'correct' : 'wrong') : ''}`}
                  disabled={answered}
                  onClick={() => handleAnswer(i, null, false)}
                >
                  <span className="letter">{String.fromCharCode(65 + i)}</span>{m}
                </button>
              ))}
            </div>
          </>
        )}
        {kind === 'crop' && (
          <>
            <h2>2/3 · ควรปลูกพืชใดในแปลงนี้?</h2>
            <div className="choices-4">
              {level.cropChoices.map((cropId, i) => {
                const c = cropById(cropId);
                if (!c) return null;
                return (
                  <button
                    key={cropId}
                    type="button"
                    className={`crop-choice ${answered && i === answeredIdx ? (correct ? 'correct' : 'wrong') : ''}`}
                    disabled={answered}
                    onClick={() => handleAnswer(i, cropId, false)}
                  >
                    <img src={c.img} alt="" />
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
          const correctCrop = cropById(level.cropCorrectId);
          return (
            <>
              <h2>3/3 · ควรใส่ปุ๋ยชนิดใดให้ {correctCrop ? correctCrop.nameTh : ''}?</h2>
              {fertOrder.map((fertIdx, i) => {
                const f = fertilizers[fertIdx];
                if (!f) return null;
                return (
                  <button
                    key={fertIdx}
                    type="button"
                    className={`fert-choice-btn ${answered && i === answeredIdx ? (correct ? 'correct' : 'wrong') : ''}`}
                    disabled={answered}
                    onClick={() => handleAnswer(i, fertIdx, false)}
                  >
                    <span className="letter" style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', background: 'var(--soil-mid)', color: 'var(--cream)', fontSize: 9, textAlign: 'center', lineHeight: '16px', marginRight: 6 }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {f.label} <span style={{ opacity: 0.65, fontWeight: 500 }}>— {f.sub}</span>
                  </button>
                );
              })}
            </>
          );
        })()}
      </div>
      <div className={feedbackCls}>{feedbackText}</div>
    </>
  );
}
