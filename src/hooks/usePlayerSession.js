import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { isLiffEnabled, initLiffAndGetIdToken, forceLiffLogin } from '../lib/liff';

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

  useEffect(() => {
    if (!isLiffEnabled()) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await initLiffAndGetIdToken();
        if (!idToken || cancelled) return; // liff.login() is redirecting away
        const { player: loggedInPlayer } = await api.loginWithLine(idToken);
        if (cancelled) return;
        try { sessionStorage.removeItem(RETRY_FLAG_KEY); } catch { /* storage unavailable */ }
        setPlayer(loggedInPlayer);
        setServerProgress(loggedInPlayer.progress || []);
      } catch (e) {
        console.error('LINE login failed', e);
        if (cancelled) return;
        // once configured, this build requires LINE login — no silent guest
        // fallback. Bounce back to LINE once; if it fails again right after
        // a fresh redirect, stop looping and show an explicit error instead
        let alreadyRetried = false;
        try { alreadyRetried = sessionStorage.getItem(RETRY_FLAG_KEY) === '1'; } catch { /* storage unavailable */ }
        if (!alreadyRetried) {
          try { sessionStorage.setItem(RETRY_FLAG_KEY, '1'); } catch { /* storage unavailable */ }
          forceLiffLogin(); // redirects away; execution stops here
          return;
        }
        setLoginError(e.message || 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  const setHomeProvince = useCallback((province) => {
    if (!player) return Promise.resolve(null); // guest mode — nothing to persist
    return api.setHomeProvince(province).then(({ player: updated }) => {
      setPlayer(updated);
      return updated;
    });
  }, [player]);

  return { player, serverProgress, loading, isLoggedIn: Boolean(player), saveProgress, loginError, retryLogin, setHomeProvince };
}
