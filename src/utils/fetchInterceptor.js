/**
 * Wraps window.fetch so every call into our Strapi backend automatically
 * carries the sales-staff JWT (if one exists in localStorage), and so any
 * 401 from our API kicks the user back to the login page instead of
 * surfacing a cryptic "失敗" toast deep inside the CRM.
 *
 * - Attaches the stored sales-staff JWT to every request (read or write) that
 *   targets a PROTECTED collection, so the backend can gate reads by token.
 *   Public collections (events/news/projects) get no token, so they keep
 *   serving anonymously and never trip Strapi's 401-on-unknown-Bearer.
 * - Only touches URLs that start with REACT_APP_API_URL — public site and
 *   3rd-party requests are untouched.
 * - On a 401 from our API, clears stored credentials and redirects to
 *   /crm/login. Login POSTs are excluded so wrong-password attempts don't
 *   redirect mid-typing.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || '';
const LOGIN_PATH_FRAGMENT = '/api/auth/sales-staff/login';
const LOGIN_HASH = '#/crm/login';

// Collections the backend gates behind the sales-staff JWT. Must mirror
// PROTECTED_PREFIXES in the CMS's sales-staff-jwt middleware. Requests to any
// other path (events/news/projects and 3rd-party) never carry the token.
const PROTECTED_API_PREFIXES = [
  '/api/customers',
  '/api/interactions',
  '/api/registrations',
  '/api/sales-staffs',
  '/api/contact-messages',
  '/api/channel-companies',
  '/api/channel-people',
  '/api/deals',
  // 來源清單:GET 公開(auth:false 會忽略 token),寫入需要 token → 一併保護。
  // 注意:events/projects 不列入——它們 GET 走 users-permissions 公開,
  // 帶 token 反而會被 Strapi 以「未知 Bearer」401;活動頁寫入時自行帶 token。
  '/api/customer-sources',
];

const isProtectedApi = (input) => {
  const url = typeof input === 'string' ? input : (input && input.url) || '';
  return PROTECTED_API_PREFIXES.some((p) => url.includes(p));
};

const isOurApi = (input) => {
  if (!API_BASE_URL) return false;
  if (typeof input === 'string') return input.startsWith(API_BASE_URL);
  if (input && typeof input.url === 'string') return input.url.startsWith(API_BASE_URL);
  return false;
};

const urlOf = (input) =>
  typeof input === 'string' ? input : (input && input.url) || '';

const isLoginRequest = (input) => urlOf(input).includes(LOGIN_PATH_FRAGMENT);

const redirectingToLogin = () =>
  typeof window !== 'undefined' && window.location.hash.startsWith('#/crm/login');

const clearCredentialsAndRedirect = () => {
  try {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');
    window.localStorage.removeItem('salesStaff');
    window.localStorage.removeItem('jwt');
  } catch {}
  // Use hash form so HashRouter picks it up. replace() so the broken page
  // doesn't end up in the back-button history.
  if (!redirectingToLogin()) {
    window.location.replace(`${window.location.pathname}${LOGIN_HASH}`);
  }
};

let installed = false;

export function installAuthFetchInterceptor() {
  if (installed || typeof window === 'undefined' || !window.fetch) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    if (!isOurApi(input)) {
      return originalFetch(input, init);
    }

    const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    let finalInit = init;

    // Attach the token only for protected collections (reads and writes).
    // Public collections stay token-free so Strapi keeps serving them to
    // anonymous visitors and doesn't 401 our custom Bearer.
    if (isProtectedApi(input)) {
      const token = window.localStorage?.getItem?.('token');
      if (token) {
        const headers = new Headers(init.headers || (input && input.headers) || {});
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        finalInit = { ...init, headers };
      }
    }

    const response = await originalFetch(input, finalInit);

    // Auto-recover from expired sessions, but only on WRITE requests.
    //
    // Previously ANY 401 (including background GET list-refreshes) forced a
    // logout. A CRM list reload fires 15+ parallel requests; if the backend
    // flaked 401 on even one under load, the whole session was nuked and the
    // user got kicked out mid-action (e.g. right after adding a customer that
    // in fact saved). Reads no longer trigger logout — a genuinely expired
    // session still surfaces on the next user-initiated write (POST/PUT/PATCH/
    // DELETE), which is a deliberate action where bouncing to login is correct.
    if (
      response.status === 401 &&
      !isLoginRequest(input) &&
      method !== 'GET'
    ) {
      clearCredentialsAndRedirect();
    }

    return response;
  };
}
