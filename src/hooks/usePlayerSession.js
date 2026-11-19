import { useCallback, useEffect, useState } from 'react';
import { api, reportClientIssue } from '../lib/api';
import { isLiffEnabled, initLiffAndGetIdToken, forceLiffLogin, startLiffLogin, withTimeout } from '../lib/liff';

// how long LINE's own startup (liff.init + token) may take before we give up
// and show an error with a retry button instead of spinning forever
const LIFF_TIMEOUT_MS = 15000;

// guest mode (no VITE_LIFF_ID configured): player stays null, nothing is
// persisted server-side, and the app behaves exactly like the old
// localStorage-only demo — this is the current default until LINE Login
// credentials are supplied.
const RETRY_FLAG_KEY = 'ndd_liff_login_retried';

export function usePlayerSession() {
  const [player, setPlayer] = useState(null);
  const [serverProgress, setServerProgress] = useState(null);
  const [loading, setLoading] = useState(isLiffEnabled());
  const [loginError, setLoginError] = useState(null);
  // LIFF is on but the player isn't logged in yet → loading screen shows the
  // LINE login button (loginWithLine) instead of redirecting on its own
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    if (!isLiffEnabled()) return;
    let cancelled = false;
    let redirecting = false; // bouncing to LINE: keep the loading screen up
    let stage = 'liff-init';
    (async () => {
      try {
        const idToken = await withTimeout(initLiffAndGetIdToken(), LIFF_TIMEOUT_MS, 'liff-init');
        if (cancelled) return;
        if (!idToken) { setNeedsLogin(true); return; }
        stage = 'server-login';
        const { player: loggedInPlayer } = await api.loginWithLine(idToken);
        if (cancelled) return;
        try { sessionStorage.removeItem(RETRY_FLAG_KEY); } catch { /* storage unavailable */ }
        setPlayer(loggedInPlayer);
        setServerProgress(loggedInPlayer.progress || []);
      } catch (e) {
        console.error('LINE login failed', e);
        reportClientIssue(e?.stage || stage, e);
        if (cancelled) return;
        // a timeout means the network can't reach LINE / our server — bouncing
        // back to LINE won't fix that, so go straight to the error + retry
        if (e?.timeout) {
          setLoginError(stage === 'server-login'
            ? 'เชื่อมต่อเซิร์ฟเวอร์เกมช้าเกินไป ลองใหม่อีกครั้ง หรือเปลี่ยนเครือข่าย (Wi-Fi / เน็ตมือถือ)'
            : 'เชื่อมต่อ LINE ช้าเกินไป ลองใหม่อีกครั้ง หรือเปลี่ยนเครือข่าย (Wi-Fi / เน็ตมือถือ)');
          return;
        }
        // once configured, this build requires LINE login — no silent guest
        // fallback. Bounce back to LINE once; if it fails again right after
        // a fresh redirect, stop looping and show an explicit error instead
        let alreadyRetried = false;
        try { alreadyRetried = sessionStorage.getItem(RETRY_FLAG_KEY) === '1'; } catch { /* storage unavailable */ }
        if (!alreadyRetried) {
          try { sessionStorage.setItem(RETRY_FLAG_KEY, '1'); } catch { /* storage unavailable */ }
          redirecting = true;
          forceLiffLogin().catch((err) => {
            // couldn't even start the redirect — show the error instead
            reportClientIssue('force-login', err);
            redirecting = false;
            setLoginError(err?.message || 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ');
            setLoading(false);
          });
          return;
        }
        setLoginError(e.message || 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ');
      } finally {
        if (!cancelled && !redirecting) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loginWithLine = useCallback(() => startLiffLogin().catch((e) => {
    reportClientIssue('login-button', e);
    setLoginError(e?.timeout
      ? 'เชื่อมต่อ LINE ช้าเกินไป ลองใหม่อีกครั้ง หรือเปลี่ยนเครือข่าย (Wi-Fi / เน็ตมือถือ)'
      : (e?.message || 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ'));
    throw e;
  }), []);

  const retryLogin = useCallback(() => {
    try { sessionStorage.removeItem(RETRY_FLAG_KEY); } catch { /* storage unavailable */ }
    window.location.reload();
  }, []);

  const saveProgress = useCallback((payload) => {
    if (!player) return; // guest mode — nothing to persist
    api.saveProgress(payload)
      .then(({ points }) => setPlayer((p) => (p ? { ...p, points } : p)))
      .catch((e) => console.error('saveProgress failed', e));
  }, [player]);

  // quick-quiz round → server adds the points and returns { points (new
  // total), awarded } (or null in guest mode, where nothing is saved)
  const saveQuickQuiz = useCallback((results, boost, difficulty) => {
    if (!player) return Promise.resolve(null);
    return api.saveQuickQuiz(results, boost, difficulty).then((res) => {
      setPlayer((p) => (p ? { ...p, points: res.points } : p));
      return res;
    });
  }, [player]);

  // shop: buy spends points, use consumes one owned item — both server-checked
  const buyItem = useCallback((itemId) => api.buyItem(itemId).then((res) => {
    setPlayer((p) => (p ? { ...p, points: res.points, items: res.items } : p));
    return res;
  }), []);
  const spendItem = useCallback((itemId, context) => api.useItem(itemId, context).then((res) => {
    setPlayer((p) => (p ? { ...p, items: res.items } : p));
    return res;
  }), []);

  // special characters: buy (permanent) + claim the once-a-day bonus
  const buyCharacter = useCallback((charId) => api.buyCharacter(charId).then((res) => {
    setPlayer((p) => (p ? { ...p, points: res.points, characters: res.characters } : p));
    return res;
  }), []);
  const claimDailyBonus = useCallback(() => api.claimDailyBonus().then((res) => {
    setPlayer((p) => (p ? { ...p, points: res.points, charClaimDate: res.claimDate } : p));
    return res;
  }), []);

  const setHomeProvince = useCallback((province) => {
    if (!player) return Promise.resolve(null); // guest mode — nothing to persist
    return api.setHomeProvince(province).then(({ player: updated }) => {
      setPlayer(updated);
      return updated;
    });
  }, [player]);

  return { player, serverProgress, loading, isLoggedIn: Boolean(player), saveProgress, saveQuickQuiz, buyItem, spendItem, buyCharacter, claimDailyBonus, loginError, retryLogin, setHomeProvince, needsLogin, loginWithLine };
}
