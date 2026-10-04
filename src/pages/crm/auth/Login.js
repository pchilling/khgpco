import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { loginSalesStaff } from '../../../services/auth';
import styles from './Login.module.css';
import gryphonLogoNavy from '../../../assets/gryphon-logo-navy.png';
import gryphonLogoWhite from '../../../assets/gryphon-logo-white.png';
import storefrontImg from '../../../assets/gryphon-storefront.webp';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
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
          navigate('/crm/admin/overview');
        } else {
          navigate('/crm/sales');
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
      {/* 左側品牌形象圖(官網街景;手機版隱藏)。Ken Burns 緩慢推進,系統設定「減少動態」時自動停住 */}
      <div className={styles.imageSide}>
        <img className={styles.imageBg} src={storefrontImg} alt="" aria-hidden="true" />
        <div className={styles.imageOverlay} />
        <div className={styles.imageBrand}>
          <img src={gryphonLogoWhite} alt="GRYPHON 閣睿國際置業" className={styles.brandLogo} />
        </div>
      </div>

      {/* 右側登入表單:僅帳號 + 密碼 */}
      <div className={styles.formSide}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <img src={gryphonLogoNavy} alt="閣睿國際置業" className={styles.formLogo} />
          <h2 className={styles.title}>歡迎回來</h2>
          <p className={styles.subtitle}>請登入閣睿 CRM 系統</p>

          <div className={styles.inputWrap}>
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M0 .55.571 0H15.43l.57.55v9.9l-.571.55H.57L0 10.45zm1.143 1.138V9.9h13.714V1.69l-6.503 4.8h-.697zM13.749 1.1H2.25L8 5.356z" fill="#8A90A3" />
            </svg>
            <input
              type="text"
              id="email"
              name="email"
              placeholder="帳號 / Email"
              aria-label="帳號 / Email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>

          <div className={styles.inputWrap}>
            <svg width="13" height="17" viewBox="0 0 13 17" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M13 8.5c0-.938-.729-1.7-1.625-1.7h-.812V4.25C10.563 1.907 8.74 0 6.5 0S2.438 1.907 2.438 4.25V6.8h-.813C.729 6.8 0 7.562 0 8.5v6.8c0 .938.729 1.7 1.625 1.7h9.75c.896 0 1.625-.762 1.625-1.7zM4.063 4.25c0-1.406 1.093-2.55 2.437-2.55s2.438 1.144 2.438 2.55V6.8H4.061z" fill="#8A90A3" />
            </svg>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="密碼"
              aria-label="密碼"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
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
