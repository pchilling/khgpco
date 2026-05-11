/**
 * Proactively logs the user out and bounces them to /crm/login when their
 * JWT is no longer valid — instead of waiting for them to fill in a form
 * and hit save before the 401 surfaces.
 *
 * Runs three checks:
 *   1. On mount (handles the "I just opened the tab" case)
 *   2. Every 60s while the tab is alive (handles "tab left open all week")
 *   3. When the tab regains focus (handles "I came back after lunch")
 *
 * The fetch interceptor's 401 → redirect path is kept as a safety net for
 * the rare race where the JWT expires between our check and a request.
 */

import { useEffect } from 'react';

const isInvalidOrExpired = (token) => {
  if (!token) return true;
  // Legacy fake tokens from before the JWT migration — auto-clear them too.
  if (!token.startsWith('eyJ')) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (typeof payload.exp !== 'number') return true;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

const isOnCrmPage = () =>
  typeof window !== 'undefined' && window.location.hash.startsWith('#/crm/');

const isOnLoginPage = () =>
  typeof window !== 'undefined' && window.location.hash.startsWith('#/crm/login');

const clearAndRedirectIfNeeded = () => {
  try {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');
    window.localStorage.removeItem('salesStaff');
    window.localStorage.removeItem('jwt');
  } catch {}
  // Only redirect if the user is mid-CRM. Public-site visitors who happen
  // to have a stale token in localStorage don't need to be bounced out of
  // the homepage.
  if (isOnCrmPage() && !isOnLoginPage()) {
    window.location.replace(`${window.location.pathname}#/crm/login`);
  }
};

const check = () => {
  const token = typeof window === 'undefined' ? null : window.localStorage?.getItem?.('token');
  if (!token) return;
  if (isInvalidOrExpired(token)) {
    clearAndRedirectIfNeeded();
  }
};

const AuthGuard = () => {
  useEffect(() => {
    check();
    const id = setInterval(check, 60_000);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);
  return null;
};

export default AuthGuard;
