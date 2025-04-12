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
    
    // 如果是生產環境，嘗試獲取真正的 JWT token
    let jwtToken = token;
    if (process.env.NODE_ENV === 'production') {
      try {
        // 嘗試使用 Strapi 的認證 API 獲取 JWT token
        const strapiAuthResponse = await fetch(`${API_BASE_URL}/api/auth/local`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            identifier: 'strapi_api_user',  // 使用預設的 API 用戶
            password: 'strapi_api_password' // 使用預設的 API 密碼
          })
        });
        
        if (strapiAuthResponse.ok) {
          const authData = await strapiAuthResponse.json();
          if (authData.jwt) {
            jwtToken = authData.jwt;
          }
        }
      } catch (err) {
        console.error('無法獲取 Strapi JWT token:', err);
        // 繼續使用自定義 token
      }
    }
    
    console.log('登入成功，用戶資訊:', {
      id: user.id,
      username: user.attributes.username,
      role: user.attributes.role
    });
    
    // 創建包含 JWT 的用戶對象
    const userWithJwt = {
      id: user.id,
      username: user.attributes.username,
      role: user.attributes.role,
      jwt: jwtToken
    };
    
    // 儲存到 localStorage
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(userWithJwt));
    
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
  window.location.href = '/crm/login';
}; 