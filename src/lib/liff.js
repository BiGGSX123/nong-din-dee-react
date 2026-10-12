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

// resolves to a LIFF ID token to hand to POST /api/auth/line, or null in guest
// mode / while LINE is redirecting to its own login page
export async function initLiffAndGetIdToken() {
  if (!isLiffEnabled()) return null;
  const { default: liff } = await import('@line/liff');
  await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
  if (!liff.isLoggedIn()) {
    liff.login(); // redirects; execution stops here for this page load
    return null;
  }
  const idToken = liff.getIDToken();
  if (!idToken || isJwtExpired(idToken)) {
    // isLoggedIn() true but the ID token is missing or expired — this happens
    // because liff.getIDToken() returns a cached token from localStorage, and
    // that token has its own (shorter) expiry independent of the LIFF login
    // session, so isLoggedIn() can stay true long after the cached ID token
    // has gone stale. liff.login() alone is a no-op once isLoggedIn() is
    // true, so it must be paired with logout() first to force LINE to mint a
    // genuinely fresh token — calling login() by itself just re-served the
    // same expired token forever.
    liff.logout();
    liff.login();
    return null;
  }
  return idToken;
}

// forces a redirect to LINE's login page regardless of current state — used
// as a fallback when the normal init/getIDToken/backend-verify flow throws,
// so a broken step bounces back to LINE instead of silently falling through
// to an unauthenticated app
export async function forceLiffLogin() {
  const { default: liff } = await import('@line/liff');
  try { await liff.init({ liffId: import.meta.env.VITE_LIFF_ID }); } catch { /* may already be initialized */ }
  // logout first — see the comment in initLiffAndGetIdToken(): if LIFF still
  // considers the session logged in, login() alone does nothing and the
  // caller would keep getting the same stale/expired ID token back.
  if (liff.isLoggedIn()) liff.logout();
  liff.login(); // redirects; execution stops here for this page load
}
