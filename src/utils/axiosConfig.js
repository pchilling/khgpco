import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:1337/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept-Version': 'v4'
  }
});

// 請求攔截器
instance.interceptors.request.use(
  (config) => {
    console.log('=== API Request ===');
    console.log('URL:', config.url);
    console.log('Method:', config.method);
    console.log('Data:', config.data);
    // 從 localStorage 獲取 token
    const token = localStorage.getItem('jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['Accept-Version'] = 'v4';
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// 響應攔截器
instance.interceptors.response.use(
  (response) => {
    console.log('=== API Response ===');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    return response;
  },
  (error) => {
    console.error('=== API Error ===');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
      console.log('Headers:', error.response.headers);
    } else if (error.request) {
      console.log('Request made but no response received');
      console.log(error.request);
    } else {
      console.log('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

export default instance;

export const loginUser = async (credentials) => {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/auth/login', // 暂时使用完整路径测试
      credentials
    );
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};