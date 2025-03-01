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
    // 當路由改變時滾動到頂部
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {!isManagementRoute && <Navbar />}
      <Content>
        {children}
      </Content>
    </AntLayout>
  );
}; 