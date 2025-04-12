import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { loginSalesStaff } from '../../../services/auth';
import styles from './Login.module.css';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await loginSalesStaff(formData);
      
      if (response.jwt) {
        // 儲存 token 和用戶資訊
        localStorage.setItem('token', response.jwt);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // 根據用戶角色導向不同頁面
        if (response.user.role === 'manager') {
          navigate('/crm/admin/dashboard');
        } else {
          navigate('/crm/dashboard');
        }
        
        message.success('登入成功');
      }
    } catch (error) {
      message.error('登入失敗，請檢查帳號密碼');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <h2>CRM 系統登入</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="username">帳號</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password">密碼</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login; 