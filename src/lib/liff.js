// LINE Login via LIFF. Disabled (guest mode) until VITE_LIFF_ID is set with a
// real LIFF ID from the LINE Developers Console — see .env.example.
export function isLiffEnabled() {
  return Boolean(import.meta.env.VITE_LIFF_ID);
}

// reads the `exp` claim out of a JWT without verifying its signature — good
// enough for a client-side "is this worth sending" check, the backend still
// verifies the token for real against LINE's endpoint
function isJwtExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true; // unparsable token is as good as expired
  }
}

// liff.init must only run once per page — every caller shares this promise
// (it's reset on failure so a retry can try again)
let liffReady = null;
function getLiff() {
  if (!liffReady) {
    liffReady = import('@line/liff').then(async ({ default: liff }) => {
      await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
      return liff;
    });
    liffReady.catch(() => { liffReady = null; });
  }
  return liffReady;
}

// rejects with { timeout: true, stage } if `promise` takes longer than `ms`
// — so a hung network call (e.g. a network that blocks api.line.me) ends in
// an error screen instead of an endless loading spinner
export function withTimeout(promise, ms, stage) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error(`${stage} timed out after ${ms / 1000}s`), { timeout: true, stage })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// resolves to a LIFF ID token to hand to POST /api/auth/line, or null in guest
// mode / when the player still has to log in — the loading screen then shows
// a "เข้าสู่ระบบด้วย LINE" button that calls startLiffLogin(). (Inside the LINE
// app LIFF is already logged in, so players there never see the button.)
export async function initLiffAndGetIdToken() {
  if (!isLiffEnabled()) return null;
  const liff = await getLiff();
  if (!liff.isLoggedIn()) return null;
  const idToken = liff.getIDToken();
  if (!idToken || isJwtExpired(idToken)) {
    // isLoggedIn() true but the ID token is missing or expired — this happens
    // because liff.getIDToken() returns a cached token from localStorage, and
    // that token has its own (shorter) expiry independent of the LIFF login
    // session, so isLoggedIn() can stay true long after the cached ID token
    // has gone stale. liff.login() alone is a no-op once isLoggedIn() is
    // true, so it must be paired with logout() first to force LINE to mint a
    // genuinely fresh token — calling login() by itself just re-served the
    // same expired token forever. After logout the login button shows.
    liff.logout();
    return null;
  }
  return idToken;
}

// the login button: redirect to LINE's login page (comes back to this page)
export async function startLiffLogin() {
  const liff = await withTimeout(getLiff(), 15000, 'liff-init');
  liff.login(); // redirects; execution stops here for this page load
}

// forces a redirect to LINE's login page regardless of current state — used
// as a fallback when the normal init/getIDToken/backend-verify flow throws,
// so a broken step bounces back to LINE instead of silently falling through
// to an unauthenticated app
export async function forceLiffLogin() {
  const liff = await withTimeout(getLiff(), 15000, 'liff-init');
  // logout first — see the comment in initLiffAndGetIdToken(): if LIFF still
  // considers the session logged in, login() alone does nothing and the
  // caller would keep getting the same stale/expired ID token back.
  if (liff.isLoggedIn()) liff.logout();
  liff.login(); // redirects; execution stops here for this page load
}
