import React, { useEffect } from 'react';
import { Layout as AntLayout } from 'antd';
import Navbar from './Navbar';
import { useLocation } from 'react-router-dom';

const { Content } = AntLayout;

export const Layout = ({ children }) => {
  const location = useLocation();
  const isManagementRoute = location.pathname.includes('/content-management') || 
                           location.pathname.includes('/project/add');

  useEffect(() => {
    // 當路由改變時滾動到頂部，但排除跳轉到聯繫我們部分的情況
    if (!location.hash.includes('contact-section')) {
      // 使用 setTimeout 確保在頁面渲染後執行滾動
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, 0);
    }
  }, [location.pathname, location.hash]);

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {!isManagementRoute && <Navbar />}
      <Content>
        {children}
      </Content>
    </AntLayout>
  );
}; 