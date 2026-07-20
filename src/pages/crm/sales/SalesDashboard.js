import React from 'react';
import { Layout, Menu, Button } from 'antd';
import { UserOutlined, TeamOutlined, InteractionOutlined, LogoutOutlined, DashboardOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { logout } from '../../../services/auth';
import styles from './Dashboard.module.css';
import gryphonLogo from '../../../assets/gryphon-logo-white.png';

const { Header, Sider, Content } = Layout;

const SalesDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // 獲取當前登入用戶資訊
  const getCurrentUser = () => {
    const userStr = localStorage.getItem('salesStaff');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('解析用戶資訊失敗:', error);
        return null;
      }
    }
    return null;
  };

  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
  };

  // 獲取當前選中的菜單項
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/overview')) return '1';
    if (path.includes('/profile')) return '2';
    if (path.includes('/my-customers')) return '3';
    if (path.includes('/interactions')) return '4';
    if (path.includes('/registration-management')) return '5';
    return '1';
  };

  return (
    <Layout className={styles.dashboardLayout}>
      <Sider width={250} className={styles.sider}>
        <div className={styles.logo}>
          <img
            src={gryphonLogo}
            alt="閣睿國際置業 銷售管理系統"
            style={{ display: 'block', maxHeight: 36, maxWidth: '88%', margin: '0 auto' }}
          />
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={[
            {
              key: '1',
              icon: <DashboardOutlined />,
              label: '總覽',
              onClick: () => navigate('/crm/sales/overview')
            },
            {
              key: '2',
              icon: <UserOutlined />,
              label: '個人資料',
              onClick: () => navigate('/crm/sales/profile')
            },
            {
              key: '3',
              icon: <TeamOutlined />,
              label: '我的客戶',
              onClick: () => navigate('/crm/sales/my-customers')
            },
            {
              key: '4',
              icon: <InteractionOutlined />,
              label: '互動記錄',
              onClick: () => navigate('/crm/sales/interactions')
            },
            {
              key: '5',
              icon: <FileTextOutlined />,
              label: '報名管理',
              onClick: () => navigate('/crm/sales/registration-management')
            }
          ]}
        />
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <div className={styles.userInfo}>
            <span>歡迎，{user?.name || user?.username}</span>
            <Button 
              type="link" 
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              登出
            </Button>
          </div>
        </Header>
        <Content className={styles.content}>
          <div className={styles.contentWrapper}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default SalesDashboard; 