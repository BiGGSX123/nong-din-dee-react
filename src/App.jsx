import { useCallback, useEffect, useRef, useState } from 'react';
import { soilById, PROVINCES } from './data/content';
import { useGameConfig } from './hooks/useGameConfig';
import { usePlayerSession } from './hooks/usePlayerSession';
import { adminApi } from './lib/api';
import { personalizedOrder } from './lib/levelOrder';
import { playClick } from './lib/sound';
import { NAV_TABS } from './data/nav';
import { roundPoints } from './lib/tfQuestions';

import SvgDefs from './components/SvgDefs';
import Hud from './components/Hud';
import NavBar from './components/NavBar';
import IntroModal from './components/IntroModal';
import LoadingScreen from './components/LoadingScreen';
import { preloadCritical, preloadRest } from './lib/preload';
import { collectedStickerIds, readSeen, writeSeen } from './lib/stickers';
import LevelIntroModal from './components/LevelIntroModal';
import { rankOf } from './lib/rank';
import SettingsModal from './components/SettingsModal';

import LevelSelectScreen from './screens/LevelSelectScreen';
import QuizScreen from './screens/QuizScreen';
import HarvestScreen from './screens/HarvestScreen';
import RankingScreen from './screens/RankingScreen';
import CollectionScreen from './screens/CollectionScreen';
import KnowledgeScreen from './screens/KnowledgeScreen';
import TrueFalseScreen from './screens/TrueFalseScreen';
import ShopScreen from './screens/ShopScreen';
import { itemById } from './data/shopItems';
import ProfileScreen from './screens/ProfileScreen';
import { characterById, dailyBonusOf, bangkokToday } from './data/characters';
import AdminScreen from './screens/AdminScreen';

function initialLevelStatus(levels, firstIdx) {
  return levels.map((_, i) => ({ completed: false, locked: i !== firstIdx, stars: 0, points: 0, pickedCropId: null }));
}

// game content (levels/care methods/fertilizers) now comes from the shared
// database via useGameConfig() instead of per-browser localStorage — every
// player and the admin panel read/write the same rows now.
// map-level scoring (see finishLevel)
const POINTS_PER_STAR = 20;
const SPEED_BONUS_MAX = 40;

export default function App() {
  const [config, reloadConfig, setConfigLocal, configError] = useGameConfig();
  const {
    player, serverProgress, loading: sessionLoading, isLoggedIn, saveProgress,
    loginError, retryLogin, setHomeProvince, needsLogin, loginWithLine, saveQuickQuiz, buyItem, spendItem, buyCharacter, claimDailyBonus,
  } = usePlayerSession();
  const isAdmin = player?.role === 'admin';

  const levels = config?.levels;
  const careMethods = config?.careMethods;
  const fertilizers = config?.fertilizers;

  // the player's chosen home province plays first, then the rest follow in
  // the default order — falls back to plain index order when unset. Guests
  // pick one too (welcome popup page 2); theirs lives only in memory.
  const [guestHomeIdx, setGuestHomeIdx] = useState(null);
  const homeLevelIdx = player?.homeLevelIndex ?? guestHomeIdx;
  const playOrder = levels ? personalizedOrder(levels.length, homeLevelIdx) : null;

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
  const [showSettings, setShowSettings] = useState(false);
  const [introLevelIdx, setIntroLevelIdx] = useState(null); // level-start popup (province + soil) before the quiz
  const [textSize, setTextSize] = useState(() => {
    try { return localStorage.getItem('ndd_text_size') === 'large' ? 'large' : 'normal'; }
    catch { return 'normal'; }
  });
  const [points, setPoints] = useState(0);
  // guests' points history (logged-in players' lives in the server PointLog)
  const [guestLog, setGuestLog] = useState([]);
  const guestLogSeq = useRef(0);
  function addGuestLog(amount, kind, ref = null) {
    if (!amount) return;
    guestLogSeq.current += 1;
    const entry = { id: `g${guestLogSeq.current}`, amount, kind, ref: ref == null ? null : String(ref), createdAt: new Date().toISOString() };
    setGuestLog((list) => [...list, entry]);
  }
  // shop items owned, e.g. { time: 2 } — server-backed when logged in
  const [inventory, setInventory] = useState({});
  // a "เหรียญ x2" item used during the current map level doubles its points
  const levelBoostRef = useRef(false);
  // special characters owned + the last Bangkok date their daily bonus was claimed
  const [characters, setCharacters] = useState([]);
  const [charClaimDate, setCharClaimDate] = useState(null);
  const [charClaimedBonus, setCharClaimedBonus] = useState(0); // daily bonus already claimed on charClaimDate
  const [currentLevelIdx, setCurrentLevelIdx] = useState(null);
  const [quizStep, setQuizStep] = useState(0);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [lastPoints, setLastPoints] = useState(0);
  const [lastBreakdown, setLastBreakdown] = useState(null); // { stars, speed, boosted } for the harvest screen
  const correctMsRef = useRef(0); // time spent on correctly answered questions this level
  // the crop picked in the attempt that just finished — the harvest screen
  // shows this, not the level's saved best (which a worse replay keeps)
  const [lastPickedCropId, setLastPickedCropId] = useState(null);
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

  // reflects the chosen text size onto <html> so index.css's
  // `:root[data-text-size="large"]` rule can scale every font-size at once
  useEffect(() => {
    document.documentElement.setAttribute('data-text-size', textSize);
  }, [textSize]);

  function handleChangeTextSize(size) {
    setTextSize(size);
    try { localStorage.setItem('ndd_text_size', size); } catch { /* storage unavailable */ }
  }

  // once logged in via LINE, upgrade local state to whatever progress the
  // server already has for this player (guest mode never runs this) — this
  // one is a legitimate effect: it's reacting to an async login result, an
  // external event, not deriving a value that was already computable at render
  const hydratedRef = useRef(false);
  // true once levelStatus reflects the player's real progress (server data for
  // LINE players, the fresh in-memory state for guests) — the sticker "seen"
  // baseline must not be taken from the pre-hydration defaults
  const [progressReady, setProgressReady] = useState(false);
  useEffect(() => {
    if (hydratedRef.current || !isLoggedIn || !levels || !serverProgress) return;
    hydratedRef.current = true;
    setProgressReady(true);
    setPoints(player.points);
    setInventory(player.items || {});
    setCharacters(Array.isArray(player.characters) ? player.characters : []);
    setCharClaimDate(player.charClaimDate || null);
    setCharClaimedBonus(player.charClaimedBonus || 0);
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
  }, [sessionLoading, isLoggedIn, player]);

  // collection stickers: owned vs. already seen in the album (lib/stickers.js)
  const stickerOwner = player?.id || null;
  const collectedIds = collectedStickerIds(levels, levelStatus, characters);
  const [seenStickers, setSeenStickers] = useState(null);
  useEffect(() => {
    if (isLoggedIn || !levels || sessionLoading) return;
    setProgressReady(true); // guests: in-memory progress is ready as soon as the levels are
  }, [isLoggedIn, levels, sessionLoading]);
  useEffect(() => {
    if (!progressReady) return;
    const seen = readSeen(stickerOwner);
    if (seen) { setSeenStickers(seen); return; }
    // first time on this device/account: everything already owned counts as
    // seen (no wall of NEW badges after an update) — only later finds are new
    const baseline = new Set(collectedStickerIds(levels, levelStatus, characters));
    writeSeen(stickerOwner, baseline);
    setSeenStickers(baseline);
    // baseline is taken once per owner, when progress first becomes real
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressReady, stickerOwner]);
  const newStickerIds = seenStickers ? collectedIds.filter((id) => !seenStickers.has(id)) : [];
  function markStickersSeen() {
    if (!newStickerIds.length) return;
    const next = new Set([...(seenStickers || []), ...collectedIds]);
    writeSeen(stickerOwner, next);
    setSeenStickers(next);
  }

  // asset preloading (lib/preload.js): first-screen art starts downloading
  // now, while the loading screen waits for LINE + game data anyway; the rest
  // trickles in quietly once the game is on screen
  useEffect(() => { preloadCritical(); }, []);
  const gameReady = Boolean(config && levelStatus && !sessionLoading && !needsLogin && !loginError);
  useEffect(() => {
    if (!gameReady) return undefined;
    const t = setTimeout(preloadRest, 1500);
    return () => clearTimeout(t);
  }, [gameReady]);

  // every startup path ends in the game, the login button, or an error with
  // a retry — never an endless spinner
  if (loginError) {
    return <LoadingScreen error={`เข้าสู่ระบบด้วย LINE ไม่สำเร็จ — ${loginError}`} onRetry={retryLogin} retryLabel="ลองเข้าสู่ระบบอีกครั้ง" />;
  }
  // LINE login is on but this player hasn't logged in yet: login button on
  // the loading screen (inside the LINE app they're logged in automatically)
  if (needsLogin) return <LoadingScreen onLogin={loginWithLine} />;
  if (configError && !config) {
    return <LoadingScreen error="โหลดข้อมูลเกมไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" onRetry={() => window.location.reload()} />;
  }
  if (!config || !levelStatus || sessionLoading) return <LoadingScreen />;

  // LINE login is required once configured — no playable guest fallback on
  // failure, so a broken login shows this instead of silently entering the game
  const completedCount = levelStatus.filter((s) => s.completed && s.stars > 0).length; // passed = at least 1 star
  // character daily bonus still claimable today (characters bought today were
  // paid at purchase, so they don't count again)
  const charClaimedToday = charClaimDate === bangkokToday();
  const dailyPending = Math.max(0, dailyBonusOf(characters) - (charClaimedToday ? (charClaimedBonus || dailyBonusOf(characters)) : 0));
  // the admin tab stays hidden from regular players — it only appears for a
  // logged-in account with role === 'admin' (server enforces this too on every
  // write, so this is UI convenience, not the real gate)
  // the admin page isn't a bottom-nav tab — admins open it from ตั้งค่า
  const navTabs = NAV_TABS
    .filter((t) => t.id !== 'admin')
    .map((t) => (t.id === 'collection' && newStickerIds.length ? { ...t, badge: true } : t));
  const showNav = NAV_TABS.some((t) => t.id === screen) || screen === 'shop' || screen === 'profile';

  function startLevel(idx) {
    prevBestRef.current = levelStatus[idx];
    levelBoostRef.current = false;
    setIsNewRecord(false);
    setCurrentLevelIdx(idx);
    setQuizStep(0);
    setQuizCorrectCount(0);
    correctMsRef.current = 0;
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

  // map level score: 20 per star (= correct answer) + a speed bonus of up to
  // 40 that drops 1 point per second spent on the questions answered
  // correctly (wrong/timed-out ones don't count). The x2 item doubles it all.
  function finishLevel(score) {
    const speed = score > 0 ? Math.max(0, SPEED_BONUS_MAX - Math.floor(correctMsRef.current / 1000)) : 0;
    const boosted = levelBoostRef.current;
    const pts = (score * POINTS_PER_STAR + speed) * (boosted ? 2 : 1);
    setLastPoints(pts);
    setLastBreakdown({ stars: score * POINTS_PER_STAR, speed, boosted });
    setLastPickedCropId(pickedCropIdRef.current);

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
    // what actually goes into the player's total: only the part above the
    // level's previous best (a replay that doesn't beat it adds 0)
    setLastBreakdown((b) => ({ ...b, gained: isNewBest ? pts - prevPts : 0, prevBest: hadPreviousRecord ? prevPts : null }));

    const nextIdx = playOrder[playOrder.indexOf(currentLevelIdx) + 1];
    // only the map screen (LevelSelectScreen) actually plays the unlock
    // effect, and only for a level that was truly locked a moment ago —
    // replaying an already-unlocked level shouldn't replay the animation
    const willUnlockNext = nextIdx !== undefined && score >= 1 && Boolean(levelStatus[nextIdx]?.locked);
    setLevelStatus((s) => {
      const copy = s.slice();
      copy[currentLevelIdx] = isNewBest
        ? { ...copy[currentLevelIdx], completed: score >= 1, locked: false, stars: score, points: pts, pickedCropId: pickedCropIdRef.current }
        : { ...prevBest, locked: false };
      if (nextIdx !== undefined && score >= 1) copy[nextIdx] = { ...copy[nextIdx], locked: false };
      return copy;
    });
    if (isNewBest) {
      // total points is the sum of every level's own best points — a new
      // best replaces its old contribution instead of adding on top of it
      setPoints((p) => p + (pts - prevPts));
      if (!isLoggedIn) addGuestLog(pts - prevPts, 'level', currentLevelIdx);
    }
    if (willUnlockNext) setJustUnlockedIdx(nextIdx);
    if (isNewBest) {
      saveProgress({
        levelIndex: currentLevelIdx,
        completed: score >= 1, // 0 correct isn't a pass — the level stays "to play"
        locked: false,
        stars: score,
        pickedCropId: pickedCropIdRef.current,
        points: pts,
      });
    }
    setScreen('harvest');
  }

  function handleStepComplete(kind, correct, extra, usedMs) {
    const newCount = correct ? quizCorrectCount + 1 : quizCorrectCount;
    if (correct && typeof usedMs === 'number') correctMsRef.current += usedMs;
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

  // a finished "ถูกหรือผิด?" round adds its points to the running total —
  // logged in: the server computes + saves them and we take its new total;
  // guest: just add locally, same as map progress in guest mode
  // `results` = per-question right/wrong in order (the combo bonus needs it)
  function handleQuickQuizRound(results, boost, difficulty) {
    if (!isLoggedIn) {
      const earned = roundPoints(results, difficulty).total * (boost ? 2 : 1);
      setPoints((p) => p + earned);
      addGuestLog(earned, 'quiz', boost ? `${difficulty}:x2` : difficulty);
      return Promise.resolve(earned);
    }
    return saveQuickQuiz(results, Boolean(boost), difficulty).then((res) => {
      setPoints(res.points);
      return res.awarded;
    });
  }

  // shop — logged in: the server checks price/balance and returns the new
  // points + items; guest: same rules applied locally
  function handleBuyItem(itemId) {
    const item = itemById(itemId);
    if (!item || points < item.price) return Promise.reject(new Error('not enough points'));
    if (!isLoggedIn) {
      setPoints((p) => p - item.price);
      addGuestLog(-item.price, 'shop', itemId);
      setInventory((inv) => ({ ...inv, [itemId]: (inv[itemId] || 0) + 1 }));
      return Promise.resolve();
    }
    return buyItem(itemId).then((res) => { setPoints(res.points); setInventory(res.items); });
  }

  // special characters (permanent; server-checked when logged in)
  function handleBuyCharacter(charId) {
    const ch = characterById(charId);
    if (!ch || characters.includes(charId) || points < ch.price) return Promise.reject(new Error('cannot buy'));
    // the new character's daily bonus is paid right away and counted as claimed
    // today (mirrors /api/characters/buy). Resolves to that bonus (shop popup).
    if (!isLoggedIn) {
      const today = bangkokToday();
      const claimedBefore = charClaimDate === today ? (charClaimedBonus || dailyBonusOf(characters)) : 0;
      setPoints((p) => p - ch.price + ch.bonus);
      addGuestLog(-ch.price, 'character', charId);
      addGuestLog(ch.bonus, 'char-bonus', charId);
      setCharacters((list) => [...list, charId]);
      setCharClaimDate(today);
      setCharClaimedBonus(claimedBefore + ch.bonus);
      return Promise.resolve(ch.bonus);
    }
    return buyCharacter(charId).then((res) => {
      setPoints(res.points);
      setCharacters(res.characters);
      if (res.claimDate) setCharClaimDate(res.claimDate);
      if (typeof res.claimedBonus === 'number') setCharClaimedBonus(res.claimedBonus);
      return res.bonus ?? 0;
    });
  }

  // daily bonus from every owned character, once per Bangkok day; characters
  // bought today were already paid at purchase, so only the unclaimed part is
  // given (mirrors /api/characters/claim). Resolves to the points added.
  function handleClaimDaily() {
    const today = bangkokToday();
    const total = dailyBonusOf(characters);
    const claimedToday = charClaimDate === today;
    const pending = total - (claimedToday ? (charClaimedBonus || total) : 0);
    if (pending <= 0) return Promise.reject(new Error('already claimed'));
    if (!isLoggedIn) {
      setPoints((p) => p + pending);
      addGuestLog(pending, 'daily');
      setCharClaimDate(today);
      setCharClaimedBonus(total);
      return Promise.resolve(pending);
    }
    return claimDailyBonus().then((res) => {
      setPoints(res.points);
      setCharClaimDate(res.claimDate);
      setCharClaimedBonus(res.claimedBonus ?? total);
      return res.awarded;
    }).catch((e) => {
      if (e.status === 409) { setCharClaimDate(today); setCharClaimedBonus(total); } // claimed on another device
      throw e;
    });
  }

  // consume one item; resolves true if it was actually used
  function handleUseItem(itemId, context) {
    if ((inventory[itemId] || 0) < 1) return Promise.resolve(false);
    const applied = () => { if (itemId === 'double' && context === 'map') levelBoostRef.current = true; return true; };
    if (!isLoggedIn) {
      setInventory((inv) => ({ ...inv, [itemId]: inv[itemId] - 1 }));
      return Promise.resolve(applied());
    }
    return spendItem(itemId, context)
      .then((res) => { setInventory(res.items); return applied(); })
      .catch(() => false);
  }

  function handleHarvestNext() {
    const nextIdx = playOrder[playOrder.indexOf(currentLevelIdx) + 1];
    if (nextIdx !== undefined) { setScreen('level-select'); setIntroLevelIdx(nextIdx); }
  }

  function handlePlayAgain() {
    startLevel(currentLevelIdx);
  }

  // welcome popup page 2: the player's home province becomes level 1.
  // Resolves when saved (the popup waits on it and shows an error on failure).
  // Onboarding always runs before any real play, so it's safe to fully
  // re-derive levelStatus around the new starting point — patching one entry
  // would leave the old default (level 0) stuck unlocked alongside it.
  function handleChooseHomeProvince(province) {
    if (!isLoggedIn) {
      const idx = levels.findIndex((l) => l.province === province);
      if (idx < 0) return Promise.reject(new Error('unknown province'));
      setGuestHomeIdx(idx);
      setLevelStatus(initialLevelStatus(levels, idx));
      return Promise.resolve();
    }
    return setHomeProvince(province).then((updated) => {
      if (updated && typeof updated.homeLevelIndex === 'number') {
        setLevelStatus(initialLevelStatus(levels, updated.homeLevelIndex));
      }
    });
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
        hasHome={homeLevelIdx != null}
        onSelectLevel={setIntroLevelIdx}
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
        inventory={inventory}
        onUseItem={handleUseItem}
      />
    );
  } else if (screen === 'harvest') {
    const lvl = levels[currentLevelIdx];
    const posInOrder = playOrder.indexOf(currentLevelIdx);
    const levelNumber = posInOrder + 1;
    const nextIdxForHarvest = playOrder[posInOrder + 1];
    const nextLevel = nextIdxForHarvest !== undefined ? levelStatus[nextIdxForHarvest] : undefined;
    content = (
      <HarvestScreen
        level={lvl}
        levelNumber={levelNumber}
        pickedCropId={lastPickedCropId}
        score={quizCorrectCount}
        lastPoints={lastPoints}
        breakdown={lastBreakdown}
        isNewRecord={isNewRecord}
        nextLocked={!nextLevel || nextLevel.locked}
        onNext={handleHarvestNext}
        onPlayAgain={handlePlayAgain}
        onBackToMap={() => setScreen('level-select')}
      />
    );
  } else if (screen === 'ranking') {
    content = <RankingScreen player={player} isLoggedIn={isLoggedIn} points={points} completedCount={completedCount} totalLevels={levels.length} totalStars={levelStatus.reduce((sum, st) => sum + (st.stars || 0), 0)} characterCount={characters.length} charDailyBonus={dailyBonusOf(characters)} claimedToday={dailyPending === 0} />;
  } else if (screen === 'collection') {
    content = <CollectionScreen levels={levels} levelStatus={levelStatus} characters={characters} dailyPending={dailyPending} newStickerIds={newStickerIds} onStickersSeen={markStickersSeen} onClaimDaily={handleClaimDaily} onOpenShop={() => setScreen('shop')} />;
  } else if (screen === 'knowledge') {
    content = <KnowledgeScreen careMethods={careMethods} fertilizers={fertilizers} />;
  } else if (screen === 'true-false') {
    content = <TrueFalseScreen careMethods={careMethods} fertilizers={fertilizers} onRoundFinished={handleQuickQuizRound} inventory={inventory} onUseItem={handleUseItem} />;
  } else if (screen === 'profile') {
    content = (
      <ProfileScreen
        player={player}
        isLoggedIn={isLoggedIn}
        points={points}
        levels={levels}
        levelStatus={levelStatus}
        homeLevelIdx={homeLevelIdx}
        characters={characters}
        guestLog={guestLog}
        onGoPlay={() => setScreen('level-select')}
      />
    );
  } else if (screen === 'shop') {
    content = <ShopScreen points={points} inventory={inventory} onBuy={handleBuyItem} isLoggedIn={isLoggedIn} characters={characters} onBuyCharacter={handleBuyCharacter} />;
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
        rankTitle={rankOf(completedCount).title}
        currentProvince={currentLevelIdx !== null ? levels[currentLevelIdx].province : ''}
        points={points}
        quizStep={quizStep}
        player={player}
        onOpenSettings={() => setShowSettings(true)}
        onOpenShop={() => setScreen('shop')}
        onOpenProfile={() => setScreen('profile')}
      />
      {screen === 'level-select' && <div className="map-backdrop" />}
      <div className={`screen ${screen === 'level-select' ? 'map-screen' : ''}`}>
        <div className="screen-content" key={screen}>{content}</div>
      </div>
      {showNav && <NavBar screen={screen} onNavigate={setScreen} tabs={navTabs} />}
      {onboardingStep === 'welcome' && (
        <IntroModal onNext={() => setOnboardingStep(null)} onChooseProvince={handleChooseHomeProvince} />
      )}
      {introLevelIdx != null && screen === 'level-select' && (
        <LevelIntroModal
          level={levels[introLevelIdx]}
          levelNumber={playOrder.indexOf(introLevelIdx) + 1}
          soil={soilById(levels[introLevelIdx].soilId)}
          bestPoints={levelStatus[introLevelIdx]?.completed ? levelStatus[introLevelIdx].points : 0}
          onStart={() => { const idx = introLevelIdx; setIntroLevelIdx(null); startLevel(idx); }}
          onCancel={() => setIntroLevelIdx(null)}
        />
      )}
      {showSettings && (
        <SettingsModal
          textSize={textSize}
          onChangeTextSize={handleChangeTextSize}
          isAdmin={isAdmin}
          onOpenAdmin={() => { setShowSettings(false); setScreen('admin'); }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
