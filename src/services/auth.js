import { API_BASE_URL } from '../utils/api';

export const loginSalesStaff = async (credentials) => {
  // 打 CMS 自製的 /api/auth/sales-staff/login，後端比對密碼後回真的 JWT。
  // 之後所有寫請求帶 Authorization: Bearer <jwt> 就能通過 sales-staff-jwt
  // middleware；GET 仍由 Public role 處理。
  const response = await fetch(`${API_BASE_URL}/api/auth/sales-staff/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: credentials.username,
      password: credentials.password,
    }),
  });

  let body = null;
  try { body = await response.json(); } catch {}

  if (!response.ok) {
    const msg = body?.error?.message || body?.message || `登入失敗 (${response.status})`;
    throw new Error(msg);
  }

  if (!body?.jwt || !body?.user) {
    throw new Error('登入回應格式錯誤');
  }

  const userWithJwt = {
    id: body.user.id,
    username: body.user.username,
    name: body.user.name,
    role: body.user.role,
    jwt: body.jwt,
  };

  localStorage.setItem('token', body.jwt);
  localStorage.setItem('user', JSON.stringify(userWithJwt));
  localStorage.setItem('salesStaff', JSON.stringify(userWithJwt));

  return { jwt: body.jwt, user: userWithJwt };
};

export const checkAuth = () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return {
    isAuthenticated: !!token && !!user,
    user,
    token,
  };
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('salesStaff');
  window.location.href = '/#/crm/login';
};

// 簡單 helper：在 fetch 上加 Authorization header
export const authHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
