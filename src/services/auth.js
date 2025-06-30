import { API_BASE_URL } from '../utils/api';

export const loginSalesStaff = async (credentials) => {
  try {
    // 獲取銷售人員列表
    const response = await fetch(`${API_BASE_URL}/api/sales-staffs?populate=*`);
    
    if (!response.ok) {
      throw new Error(`獲取數據失敗: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('獲取到的銷售人員數據:', data);
    
    // 找到匹配的用戶
    const user = data.data.find(staff => 
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