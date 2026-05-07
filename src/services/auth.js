import { API_BASE_URL } from '../utils/api';

export const loginSalesStaff = async (credentials) => {
  try {
    // 只抓對應帳號的紀錄（不再下載全部員工資料）
    const params = new URLSearchParams();
    params.set('filters[username][$eq]', credentials.username);
    params.set('fields[0]', 'username');
    params.set('fields[1]', 'password');
    params.set('fields[2]', 'name');
    params.set('fields[3]', 'role');
    const response = await fetch(`${API_BASE_URL}/api/sales-staffs?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`獲取數據失敗: ${response.status}`);
    }

    const data = await response.json();

    // 後端只回傳 username 符合的紀錄；前端再驗密碼（仍非理想，但範圍縮到單一筆）
    const user = (data.data || []).find(staff =>
      staff.attributes.username === credentials.username &&
      staff.attributes.password === credentials.password
    );

    if (!user) {
      throw new Error('用戶名或密碼錯誤');
    }
    
    // 生成 token
    const token = `token_${Date.now()}`;
    
    // 使用自定義 token（移除有問題的 Strapi JWT 獲取邏輯）
    let jwtToken = token;
    
    console.log('登入成功，用戶資訊:', {
      id: user.id,
      username: user.attributes.username,
      role: user.attributes.role
    });
    
    // 創建包含完整資訊的用戶對象
    const userWithJwt = {
      id: user.id,
      username: user.attributes.username,
      name: user.attributes.name,
      role: user.attributes.role,
      jwt: jwtToken
    };
    
    console.log('登入成功，用戶資訊:', userWithJwt);
    
    // 儲存到 localStorage
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(userWithJwt));
    localStorage.setItem('salesStaff', JSON.stringify(userWithJwt)); // 為了兼容性，同時保存兩個
    
    // 儲存用戶資訊和權限
    return {
      jwt: jwtToken,
      user: userWithJwt
    };
  } catch (error) {
    console.error('登入錯誤:', error);
    throw error;
  }
};

export const checkAuth = () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  return {
    isAuthenticated: !!token && !!user,
    user,
    token
  };
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('salesStaff');
  window.location.href = '/#/crm/login';
}; 