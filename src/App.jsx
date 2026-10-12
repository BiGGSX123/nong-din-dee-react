import { useCallback, useEffect, useRef, useState } from 'react';
import { cropById, soilById, PROVINCES } from './data/content';
import { useGameConfig } from './hooks/useGameConfig';
import { usePlayerSession } from './hooks/usePlayerSession';
import { adminApi } from './lib/api';
import { personalizedOrder } from './lib/levelOrder';
import { playClick } from './lib/sound';
import { NAV_TABS } from './data/nav';

import SvgDefs from './components/SvgDefs';
import Hud from './components/Hud';
import NavBar from './components/NavBar';
import IntroModal from './components/IntroModal';
import MascotTip from './components/MascotTip';
import HomeProvinceModal from './components/HomeProvinceModal';
import ProvinceRegisteredModal from './components/ProvinceRegisteredModal';

import LevelSelectScreen from './screens/LevelSelectScreen';
import QuizScreen from './screens/QuizScreen';
import HarvestScreen from './screens/HarvestScreen';
import RankingScreen from './screens/RankingScreen';
import CollectionScreen from './screens/CollectionScreen';
import KnowledgeScreen from './screens/KnowledgeScreen';
import AdminScreen from './screens/AdminScreen';

function initialLevelStatus(levels, firstIdx) {
  return levels.map((_, i) => ({ completed: false, locked: i !== firstIdx, stars: 0, points: 0, pickedCropId: null }));
}

// game content (levels/care methods/fertilizers) now comes from the shared
// database via useGameConfig() instead of per-browser localStorage — every
// player and the admin panel read/write the same rows now.
export default function App() {
  const [config, reloadConfig, setConfigLocal] = useGameConfig();
  const {
    player, serverProgress, loading: sessionLoading, isLoggedIn, saveProgress,
    loginError, retryLogin, setHomeProvince,
  } = usePlayerSession();
  const isAdmin = player?.role === 'admin';

  const levels = config?.levels;
  const careMethods = config?.careMethods;
  const fertilizers = config?.fertilizers;

  // the player's chosen home province plays first, then the rest follow in
  // the default order — falls back to plain index order when unset
  const playOrder = levels ? personalizedOrder(levels.length, player?.homeLevelIndex ?? null) : null;

  // levelStatus starts undetermined (null) until `levels` has loaded, and is
  // derived during render rather than seeded via an effect — an effect would
  // just trigger a second, avoidable render once `levels` arrives
  const [levelStatusOverride, setLevelStatusOverride] = useState(null);
  const levelStatus = levelStatusOverride ?? (levels ? initialLevelStatus(levels, playOrder[0]) : null);
  const setLevelStatus = useCallback((updater) => {
    setLevelStatusOverride((prev) => {
      const base = prev ?? (levels ? initialLevelStatus(levels, playOrder[0]) : []);
      return typeof updater === 'function' ? updater(base) : updater;
    });
  }, [levels, playOrder]);

  const [screen, setScreen] = useState('level-select');
  // 'welcome' -> 'province' (only if logged in with no home province yet) ->
  // 'confirmed' (only after actually saving one) -> null (onboarding done).
  // Starts null (undecided) rather than 'welcome' — whether this is a first
  // visit depends on session data (isLoggedIn/homeLevelIndex) that isn't
  // resolved yet on the very first render; the effect below decides once.
  const [onboardingStep, setOnboardingStep] = useState(null);
  const [showMascotTip, setShowMascotTip] = useState(false);
  const [savingHomeProvince, setSavingHomeProvince] = useState(false);
  const [points, setPoints] = useState(0);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(null);
  const [quizStep, setQuizStep] = useState(0);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [lastPoints, setLastPoints] = useState(0);
  const [justUnlockedIdx, setJustUnlockedIdx] = useState(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const pickedCropIdRef = useRef(null);
  // snapshot of the level's recorded result from just before the current
  // attempt started — startLevel() below immediately nulls out
  // levelStatus[idx].pickedCropId for the quiz's own live "growing" preview,
  // so this is the only place the previous best is still recoverable from,
  // both for "was this replay actually better?" and for restoring it if the
  // player backs out of the quiz without finishing
  const prevBestRef = useRef(null);

  // one delegated listener covers every button/role=button in the app instead
  // of wiring a click handler into each one — choice buttons are excluded
  // since they already play their own richer correct/wrong sound
  useEffect(() => {
    function handleGlobalClick(e) {
      const el = e.target.closest('button, [role="button"]');
      if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
      if (el.matches('.choice-btn, .crop-choice, .fert-choice-btn')) return;
      playClick();
    }
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // once logged in via LINE, upgrade local state to whatever progress the
  // server already has for this player (guest mode never runs this) — this
  // one is a legitimate effect: it's reacting to an async login result, an
  // external event, not deriving a value that was already computable at render
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !isLoggedIn || !levels || !serverProgress) return;
    hydratedRef.current = true;
    setPoints(player.points);
    setLevelStatus(levels.map((lvl, i) => {
      const p = serverProgress.find((sp) => sp.levelIndex === i);
      return p
        ? { completed: p.completed, locked: p.locked, stars: p.stars, points: p.points, pickedCropId: p.pickedCropId }
        : { completed: false, locked: i !== playOrder[0], stars: 0, points: 0, pickedCropId: null };
    }));
  }, [isLoggedIn, levels, serverProgress, player, setLevelStatus, playOrder]);

  // the welcome intro and the map's mascot tip should only ever appear for a
  // first-time visit — "first-time" here means no home province registered
  // yet (guests never have one, so they see it every session, same as before)
  const onboardingDecidedRef = useRef(false);
  useEffect(() => {
    if (onboardingDecidedRef.current || sessionLoading) return;
    onboardingDecidedRef.current = true;
    const isFirstTime = !isLoggedIn || player?.homeLevelIndex == null;
    setOnboardingStep(isFirstTime ? 'welcome' : null);
    setShowMascotTip(isFirstTime);
  }, [sessionLoading, isLoggedIn, player]);

  if (!config || !levelStatus || sessionLoading) {
    return (
      <div className="phone">
        <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          กำลังโหลด...
        </div>
      </div>
    );
  }

  // LINE login is required once configured — no playable guest fallback on
  // failure, so a broken login shows this instead of silently entering the game
  if (loginError) {
    return (
      <div className="phone">
        <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center', padding: 24 }}>
          <p>เข้าสู่ระบบด้วย LINE ไม่สำเร็จ<br /><span style={{ opacity: 0.7, fontSize: 12.5 }}>{loginError}</span></p>
          <button className="btn" type="button" onClick={retryLogin}>ลองเข้าสู่ระบบอีกครั้ง</button>
        </div>
      </div>
    );
  }

  const completedCount = levelStatus.filter((s) => s.completed).length;
  // the admin tab stays hidden from regular players — it only appears for a
  // logged-in account with role === 'admin' (server enforces this too on every
  // write, so this is UI convenience, not the real gate)
  const navTabs = NAV_TABS.filter((t) => t.id !== 'admin' || isAdmin);
  const showNav = NAV_TABS.some((t) => t.id === screen);

  function startLevel(idx) {
    prevBestRef.current = levelStatus[idx];
    setIsNewRecord(false);
    setCurrentLevelIdx(idx);
    setQuizStep(0);
    setQuizCorrectCount(0);
    pickedCropIdRef.current = null;
    setLevelStatus((s) => {
      const copy = s.slice();
      copy[idx] = { ...copy[idx], pickedCropId: null };
      return copy;
    });
    setScreen('quiz');
  }

  // leaving the quiz without finishing it — restore whatever was recorded
  // before this attempt started, since startLevel above already cleared
  // pickedCropId for the quiz's own live preview
  function handleQuizBack() {
    const prevBest = prevBestRef.current;
    if (prevBest) {
      setLevelStatus((s) => {
        const copy = s.slice();
        copy[currentLevelIdx] = prevBest;
        return copy;
      });
    }
    setScreen('level-select');
  }

  function finishLevel(score) {
    const lvl = levels[currentLevelIdx];
    const crop = cropById(lvl.cropCorrectId);
    const multiplier = [0, 0.3, 0.6, 1.0][score];
    const pts = Math.round(crop.base * multiplier);
    setLastPoints(pts);

    // a replay only overwrites the level's recorded result (stars, points,
    // which crop shows growing on its map bubble) if it actually beats the
    // previous best — comparing against the pre-attempt snapshot, since
    // levelStatus[currentLevelIdx] has already been live-mutated during this
    // quiz (pickedCropId in particular). a worse or tying replay still shows
    // its own score on the harvest screen, it just isn't saved over the best
    const prevBest = prevBestRef.current ?? levelStatus[currentLevelIdx];
    const prevPts = prevBest.points || 0;
    const hadPreviousRecord = Boolean(prevBest.completed);
    const isNewBest = !hadPreviousRecord || pts > prevPts;
    setIsNewRecord(hadPreviousRecord && isNewBest);

    const nextIdx = playOrder[playOrder.indexOf(currentLevelIdx) + 1];
    // only the map screen (LevelSelectScreen) actually plays the unlock
    // effect, and only for a level that was truly locked a moment ago —
    // replaying an already-unlocked level shouldn't replay the animation
    const willUnlockNext = nextIdx !== undefined && score >= 1 && Boolean(levelStatus[nextIdx]?.locked);
    setLevelStatus((s) => {
      const copy = s.slice();
      copy[currentLevelIdx] = isNewBest
        ? { ...copy[currentLevelIdx], completed: true, locked: false, stars: score, points: pts, pickedCropId: pickedCropIdRef.current }
        : { ...prevBest, completed: true, locked: false };
      if (nextIdx !== undefined && score >= 1) copy[nextIdx] = { ...copy[nextIdx], locked: false };
      return copy;
    });
    if (isNewBest) {
      // total points is the sum of every level's own best points — a new
      // best replaces its old contribution instead of adding on top of it
      setPoints((p) => p + (pts - prevPts));
    }
    if (willUnlockNext) setJustUnlockedIdx(nextIdx);
    if (isNewBest) {
      saveProgress({
        levelIndex: currentLevelIdx,
        completed: true,
        locked: false,
        stars: score,
        pickedCropId: pickedCropIdRef.current,
        points: pts,
      });
    }
    setScreen('harvest');
  }

  function handleStepComplete(kind, correct, extra) {
    const newCount = correct ? quizCorrectCount + 1 : quizCorrectCount;
    setQuizCorrectCount(newCount);
    if (kind === 'crop' && extra) {
      pickedCropIdRef.current = extra;
      setLevelStatus((s) => {
        const copy = s.slice();
        copy[currentLevelIdx] = { ...copy[currentLevelIdx], pickedCropId: extra };
        return copy;
      });
    }
    if (quizStep < 2) setQuizStep(quizStep + 1);
    else finishLevel(newCount);
  }

  function handleHarvestNext() {
    const nextIdx = playOrder[playOrder.indexOf(currentLevelIdx) + 1];
    if (nextIdx !== undefined) startLevel(nextIdx);
  }

  function handlePlayAgain() {
    startLevel(currentLevelIdx);
  }

  function handleWelcomeNext() {
    // only stop for the province step if logged in and it's still unset —
    // guests and already-registered players go straight into the game
    setOnboardingStep(isLoggedIn && player.homeLevelIndex == null ? 'province' : null);
  }

  function handleSaveHomeProvince(province) {
    setSavingHomeProvince(true);
    setHomeProvince(province)
      .then((updated) => {
        // onboarding always saves this before any real play happens, so it's
        // safe to fully re-derive levelStatus around the new starting point —
        // patching just one entry would leave the old default (level 0,
        // unlocked before a province was chosen) stuck open alongside it
        if (updated && typeof updated.homeLevelIndex === 'number') {
          setLevelStatus(initialLevelStatus(levels, updated.homeLevelIndex));
        }
        setOnboardingStep('confirmed');
      })
      .finally(() => setSavingHomeProvince(false));
  }

  /* ---------------- admin content handlers ----------------
     text/select edits apply optimistically to local state for snappy input,
     then fire the write to the shared DB in the background. Structural
     changes (add/delete/reset) just reload from the server afterwards. */
  function withAdminErrorHandling(promise) {
    promise.catch((e) => {
      // an optimistic edit may already be showing locally — a failed write
      // (not actually an admin, network error) must not leave the UI claiming it saved
      reloadConfig();
      console.error('admin request failed', e);
    });
  }

  function setLevelLocal(idx, patch) {
    setConfigLocal((c) => ({ ...c, levels: c.levels.map((l, i) => (i === idx ? { ...l, ...patch } : l)) }));
  }

  function updateLevel(idx, field, value) {
    const patch = { [field]: value };
    setLevelLocal(idx, patch);
    withAdminErrorHandling(adminApi.updateLevel(levels[idx].id, patch));
  }

  function updateLevelCropChoice(idx, choiceIdx, newVal) {
    const lvl = levels[idx];
    const cropChoices = lvl.cropChoices.slice();
    const oldVal = cropChoices[choiceIdx];
    cropChoices[choiceIdx] = newVal;
    let cropCorrectId = lvl.cropCorrectId;
    if (cropCorrectId === oldVal) cropCorrectId = newVal;
    if (!cropChoices.includes(cropCorrectId)) cropCorrectId = cropChoices[0];
    setLevelLocal(idx, { cropChoices, cropCorrectId });
    withAdminErrorHandling(adminApi.updateLevel(lvl.id, { cropChoices, cropCorrectId }));
  }

  // levelStatus is only resized once reloadConfig resolves, kept in lockstep
  // with `levels` so the two arrays are never briefly mismatched mid-render
  function deleteLevel(idx) {
    if (idx !== levels.length - 1) return;
    withAdminErrorHandling(
      adminApi.deleteLevel(levels[idx].id)
        .then(reloadConfig)
        .then(() => setLevelStatus((s) => s.slice(0, -1)))
    );
  }

  function addLevel(name) {
    withAdminErrorHandling(
      adminApi.addLevel(name)
        .then(reloadConfig)
        .then(() => setLevelStatus((s) => [...s, { completed: false, locked: true, stars: 0, pickedCropId: null }]))
    );
  }

  function updateCareMethod(idx, value) {
    setConfigLocal((c) => ({ ...c, careMethods: c.careMethods.map((m, i) => (i === idx ? value : m)) }));
    withAdminErrorHandling(adminApi.updateCareMethod(idx, value));
  }

  function deleteCareMethod(idx) {
    if (idx !== careMethods.length - 1 || careMethods.length <= 1) return;
    withAdminErrorHandling(adminApi.deleteCareMethod(idx).then(reloadConfig));
  }

  function addCareMethod() {
    withAdminErrorHandling(adminApi.addCareMethod().then(reloadConfig));
  }

  function updateFertLabel(idx, value) {
    setConfigLocal((c) => ({ ...c, fertilizers: c.fertilizers.map((f, i) => (i === idx ? { ...f, label: value } : f)) }));
    withAdminErrorHandling(adminApi.updateFertilizer(idx, { label: value, sub: fertilizers[idx].sub }));
  }

  function updateFertSub(idx, value) {
    setConfigLocal((c) => ({ ...c, fertilizers: c.fertilizers.map((f, i) => (i === idx ? { ...f, sub: value } : f)) }));
    withAdminErrorHandling(adminApi.updateFertilizer(idx, { label: fertilizers[idx].label, sub: value }));
  }

  function deleteFertilizer(idx) {
    if (idx !== fertilizers.length - 1 || fertilizers.length <= 1) return;
    withAdminErrorHandling(adminApi.deleteFertilizer(idx).then(reloadConfig));
  }

  function addFertilizer() {
    withAdminErrorHandling(adminApi.addFertilizer().then(reloadConfig));
  }

  function handleReset() {
    // reset always restores the 77-province default set server-side, regardless
    // of how many levels existed before — use that fixed count, not the stale
    // pre-reset `levels` closure, so levelStatus never ends up a different length
    withAdminErrorHandling(adminApi.reset().then(reloadConfig).then(() => {
      setLevelStatus(initialLevelStatus(Array.from({ length: PROVINCES.length }), playOrder[0]));
    }));
  }

  /* ---------------- screen content ---------------- */
  let content = null;
  if (screen === 'level-select') {
    content = (
      <LevelSelectScreen
        levels={levels}
        levelStatus={levelStatus}
        playOrder={playOrder}
        hasHome={player?.homeLevelIndex != null}
        onSelectLevel={startLevel}
        justUnlockedIdx={justUnlockedIdx}
        onUnlockShown={() => setJustUnlockedIdx(null)}
      />
    );
  } else if (screen === 'quiz') {
    const lvl = levels[currentLevelIdx];
    // the number shown to the player must match LevelSelectScreen's node
    // numbering, which is the level's position in their personalized walk
    // order (home province first) — not lvl.id/index, which is the raw
    // position in the un-personalized province list and only matches by
    // coincidence when the player's home province happens to be first
    const levelNumber = playOrder.indexOf(currentLevelIdx) + 1;
    content = (
      <QuizScreen
        key={currentLevelIdx}
        level={lvl}
        levelNumber={levelNumber}
        soil={soilById(lvl.soilId)}
        step={quizStep}
        pickedCropId={levelStatus[currentLevelIdx].pickedCropId}
        careMethods={careMethods}
        fertilizers={fertilizers}
        onStepComplete={handleStepComplete}
        onBack={handleQuizBack}
      />
    );
  } else if (screen === 'harvest') {
    const lvl = levels[currentLevelIdx];
    const status = levelStatus[currentLevelIdx];
    const posInOrder = playOrder.indexOf(currentLevelIdx);
    const levelNumber = posInOrder + 1;
    const nextIdxForHarvest = playOrder[posInOrder + 1];
    const nextLevel = nextIdxForHarvest !== undefined ? levelStatus[nextIdxForHarvest] : undefined;
    content = (
      <HarvestScreen
        level={lvl}
        levelNumber={levelNumber}
        status={status}
        score={quizCorrectCount}
        totalPoints={points}
        totalLevels={levels.length}
        completedCount={completedCount}
        lastPoints={lastPoints}
        isNewRecord={isNewRecord}
        nextLocked={!nextLevel || nextLevel.locked}
        onNext={handleHarvestNext}
        onPlayAgain={handlePlayAgain}
        onBackToMap={() => setScreen('level-select')}
      />
    );
  } else if (screen === 'ranking') {
    content = <RankingScreen player={player} isLoggedIn={isLoggedIn} points={points} completedCount={completedCount} totalLevels={levels.length} />;
  } else if (screen === 'collection') {
    content = <CollectionScreen levels={levels} levelStatus={levelStatus} />;
  } else if (screen === 'knowledge') {
    content = <KnowledgeScreen careMethods={careMethods} fertilizers={fertilizers} />;
  } else if (screen === 'admin') {
    content = (
      <AdminScreen
        levels={levels}
        careMethods={careMethods}
        fertilizers={fertilizers}
        onUpdateLevel={updateLevel}
        onUpdateLevelCropChoice={updateLevelCropChoice}
        onDeleteLevel={deleteLevel}
        onAddLevel={addLevel}
        onUpdateCareMethod={updateCareMethod}
        onDeleteCareMethod={deleteCareMethod}
        onAddCareMethod={addCareMethod}
        onUpdateFertLabel={updateFertLabel}
        onUpdateFertSub={updateFertSub}
        onDeleteFertilizer={deleteFertilizer}
        onAddFertilizer={addFertilizer}
        onReset={handleReset}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <div className="phone">
      <SvgDefs />
      <Hud
        screen={screen}
        completedCount={completedCount}
        totalLevels={levels.length}
        currentProvince={currentLevelIdx !== null ? levels[currentLevelIdx].province : ''}
        points={points}
        quizStep={quizStep}
        player={player}
      />
      <div className={`screen ${screen === 'level-select' ? 'map-screen' : ''}`}>
        <div className="screen-content" key={screen}>{content}</div>
      </div>
      {showNav && <NavBar screen={screen} onNavigate={setScreen} tabs={navTabs} />}
      {!onboardingStep && showMascotTip && screen === 'level-select' && (
        <MascotTip onClose={() => setShowMascotTip(false)} />
      )}
      {onboardingStep === 'province' && (
        <HomeProvinceModal saving={savingHomeProvince} onSave={handleSaveHomeProvince} />
      )}
      {onboardingStep === 'confirmed' && (
        <ProvinceRegisteredModal onStart={() => setOnboardingStep(null)} />
      )}
      {onboardingStep === 'welcome' && (
        <IntroModal onNext={handleWelcomeNext} hasNextStep={isLoggedIn && player.homeLevelIndex == null} />
      )}
    </div>
  );
}
