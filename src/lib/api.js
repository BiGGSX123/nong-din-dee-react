// '' (relative) routes through Vite's dev proxy to the API — keeps requests
// same-origin under https://localhost so the browser doesn't block them as
// mixed content; ?? (not ||) so an intentionally empty VITE_API_URL sticks
const API_URL = import.meta.env.VITE_API_URL ?? '';

// every call gives up after REQUEST_TIMEOUT_MS so a dropped connection ends
// in an error the UI can show (with a retry) instead of hanging forever
const REQUEST_TIMEOUT_MS = 15000;

async function request(path, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      signal: ctrl.signal,
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch (e) {
    const err = new Error(e.name === 'AbortError' ? `request timed out: ${path.split('?')[0]}` : `network error: ${e.message}`);
    err.timeout = e.name === 'AbortError';
    throw err;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

// fire-and-forget diagnostics: tells the server which startup/login stage a
// player got stuck on (no tokens, no query string) so it shows up in the API
// logs as [client-issue] — real phones/networks we can't reproduce here
export function reportClientIssue(stage, error) {
  try {
    fetch(`${API_URL}/api/client-log`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage,
        message: String(error?.message || error || '').slice(0, 300),
        timeout: Boolean(error?.timeout),
        returningFromLine: /[?&](code|liff\.state)=/.test(window.location.search),
        inLineApp: /\bLine\//i.test(navigator.userAgent),
        ua: navigator.userAgent.slice(0, 200),
      }),
    }).catch(() => {});
  } catch { /* never let diagnostics break the app */ }
}

export const api = {
  getConfig: () => request('/api/admin/config'),
  getLeaderboard: (limit = 100) => request(`/api/leaderboard?limit=${limit}`),
  getQuizLeaderboard: (mode, limit = 100) => request(`/api/leaderboard/quiz?mode=${mode}&limit=${limit}`),
  getStarLeaderboard: (limit = 100) => request(`/api/leaderboard/stars?limit=${limit}`),

  loginWithLine: (idToken) => request('/api/auth/line', { method: 'POST', body: JSON.stringify({ idToken }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),

  saveProgress: (payload) => request('/api/progress', { method: 'POST', body: JSON.stringify(payload) }),
  saveQuickQuiz: (results, boost, difficulty) => request('/api/quick-quiz', { method: 'POST', body: JSON.stringify({ results, boost, difficulty }) }),
  buyItem: (itemId) => request('/api/shop/buy', { method: 'POST', body: JSON.stringify({ itemId }) }),
  useItem: (itemId, context) => request('/api/shop/use', { method: 'POST', body: JSON.stringify({ itemId, context }) }),
  buyCharacter: (charId) => request('/api/characters/buy', { method: 'POST', body: JSON.stringify({ charId }) }),
  claimDailyBonus: () => request('/api/characters/claim', { method: 'POST' }),

  getPointHistory: (limit = 60) => request(`/api/player/history?limit=${limit}`),
  setHomeProvince: (province) => request('/api/player/home-province', { method: 'PUT', body: JSON.stringify({ province }) }),
};

// admin routes are gated server-side by the logged-in player's own role
// (Player.role === 'admin') via the session cookie `request()` already sends
// — no separate token to attach here anymore
export const adminApi = {
  updateLevel: (index, data) => request(`/api/admin/levels/${index}`, { method: 'PUT', body: JSON.stringify(data) }),
  addLevel: (province) => request('/api/admin/levels', { method: 'POST', body: JSON.stringify({ province }) }),
  deleteLevel: (index) => request(`/api/admin/levels/${index}`, { method: 'DELETE' }),

  updateCareMethod: (index, text) => request(`/api/admin/care-methods/${index}`, { method: 'PUT', body: JSON.stringify({ text }) }),
  addCareMethod: () => request('/api/admin/care-methods', { method: 'POST' }),
  deleteCareMethod: (index) => request(`/api/admin/care-methods/${index}`, { method: 'DELETE' }),

  updateFertilizer: (index, data) => request(`/api/admin/fertilizers/${index}`, { method: 'PUT', body: JSON.stringify(data) }),
  addFertilizer: () => request('/api/admin/fertilizers', { method: 'POST' }),
  deleteFertilizer: (index) => request(`/api/admin/fertilizers/${index}`, { method: 'DELETE' }),

  reset: () => request('/api/admin/reset', { method: 'POST' }),
};
