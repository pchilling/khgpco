import axios from 'axios';

// 新建一個 api.js 文件來集中管理 API URL
// 使用 Strapi Cloud URL 作為生產環境 API 基礎 URL
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_BASE_URL || 'https://eloquent-splendor-a265f51ba3.strapiapp.com'  // 使用正確的 Strapi Cloud URL
  : 'http://localhost:1339';

// 如果是生產環境，檢查是否有設置環境變量
if (process.env.NODE_ENV === 'production') {
  console.log('使用 Strapi Cloud URL:', API_BASE_URL);
}

// 設置請求攔截器
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

const handleApiError = (error) => {
  if (error.response) {
    return {
      success: false,
      error: error.response.data.message || '請求失敗'
    };
  }
  return {
    success: false,
    error: error.message || '網絡錯誤'
  };
};

const api = {
  auth: {
    login: async (credentials) => {
      try {
        console.log('Sending login request to:', `${API_BASE_URL}/api/auth/local`);
        
        const response = await axios.post(
          `${API_BASE_URL}/api/auth/local`, 
          {
            identifier: credentials.username,
            password: credentials.password
          }
        );

        console.log('Login response:', {
          status: response.status,
          hasJwt: !!response.data.jwt,
          hasUser: !!response.data.user
        });

        if (response.data.jwt) {
          localStorage.setItem('token', response.data.jwt);
          localStorage.setItem('user', JSON.stringify({
            ...response.data.user,
            jwt: response.data.jwt
          }));
          return {
            success: true,
            user: response.data.user
          };
        } else {
          console.error('No JWT token in response');
          return {
            success: false,
            error: '登入失敗：未收到授權令牌'
          };
        }
      } catch (error) {
        console.error('Login error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        return {
          success: false,
          error: error.response?.data?.error?.message || '服務器錯誤'
        };
      }
    },
    
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    
    verifyToken: async () => {
      const token = localStorage.getItem('token');
      if (!token) return { success: false };
      
      try {
        const response = await axios.get(`${API_BASE_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        return { success: true, user: response.data };
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return { success: false };
      }
    }
  },

  projects: {
    list: async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Token:', token ? 'exists' : 'missing');
        
        const response = await axios.get(
          `${API_BASE_URL}/projects`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        return response.data;
      } catch (error) {
        console.error('Project list error:', error.response?.data || error.message);
        throw error;
      }
    },

    get: async (id) => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/projects/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    },
    
    create: async (projectData) => {
      try {
        const token = localStorage.getItem('token');
        
        // 檢查數據大小
        const dataSize = JSON.stringify(projectData).length;
        console.log('Request data size:', (dataSize / 1024 / 1024).toFixed(2), 'MB');
        
        if (dataSize > 45 * 1024 * 1024) { // 45MB 警告
          console.warn('Warning: Large request payload:', dataSize);
        }

        const response = await axios.post(
          `${API_BASE_URL}/projects`, 
          projectData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            maxContentLength: 50 * 1024 * 1024,  // 50MB
            maxBodyLength: 50 * 1024 * 1024      // 50MB
          }
        );
        return response.data;
      } catch (error) {
        console.error('Project creation error:', error.response?.data || error.message);
        if (error.response?.status === 413) {
          throw new Error('請求數據太大，請減少數據大小或分批發送');
        }
        throw error;
      }
    },
    
    update: async (id, projectData) => {
      try {
        const response = await axios.put(`${API_BASE_URL}/projects/${id}`, projectData);
        return response.data;
      } catch (error) {
        throw error;
      }
    },
    
    delete: async (id) => {
      try {
        const response = await axios.delete(`${API_BASE_URL}/projects/${id}`);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    getAll: async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/projects`);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    resetDatabase: async () => {
      try {
        const response = await axios.delete('/api/projects/reset-all');
        console.log('Database reset response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Reset database error:', error);
        throw error;
      }
    }
  }
};

export default api; 