/**
 * Wraps window.fetch so every call into our Strapi backend automatically
 * carries the sales-staff JWT (if one exists in localStorage). Lets us
 * gate writes behind real auth without modifying every page's fetch call.
 *
 * Only attaches the header for requests whose URL starts with
 * REACT_APP_API_URL — public-site URLs and 3rd-party requests are untouched.
 *
 * Public site write endpoints (POST /api/registrations, POST /api/contact-messages)
 * are allowlisted in the CMS middleware, so the interceptor adding a
 * (non-existent) header to them is fine — when a logged-out visitor submits
 * those forms there's no token to attach in the first place.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const isOurApi = (input) => {
  if (!API_BASE_URL) return false;
  if (typeof input === 'string') return input.startsWith(API_BASE_URL);
  if (input && typeof input.url === 'string') return input.url.startsWith(API_BASE_URL);
  return false;
};

let installed = false;

export function installAuthFetchInterceptor() {
  if (installed || typeof window === 'undefined' || !window.fetch) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    if (!isOurApi(input)) {
      return originalFetch(input, init);
    }

    const token = window.localStorage?.getItem?.('token');
    if (!token) {
      return originalFetch(input, init);
    }

    const headers = new Headers(init.headers || (input && input.headers) || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return originalFetch(input, { ...init, headers });
  };
}
