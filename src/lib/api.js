// '' (relative) routes through Vite's dev proxy to the API — keeps requests
// same-origin under https://localhost so the browser doesn't block them as
// mixed content; ?? (not ||) so an intentionally empty VITE_API_URL sticks
const API_URL = import.meta.env.VITE_API_URL ?? '';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  getConfig: () => request('/api/admin/config'),
  getLeaderboard: (limit = 100) => request(`/api/leaderboard?limit=${limit}`),

  loginWithLine: (idToken) => request('/api/auth/line', { method: 'POST', body: JSON.stringify({ idToken }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),

  saveProgress: (payload) => request('/api/progress', { method: 'POST', body: JSON.stringify(payload) }),

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
