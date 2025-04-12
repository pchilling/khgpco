import React from 'react';
import { Layout, Menu, Button } from 'antd';
import { UserOutlined, TeamOutlined, InteractionOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { logout } from '../../../services/auth';
import styles from './Dashboard.module.css';

const { Header, Sider, Content } = Layout;

const SalesDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    logout();
  };

  // 獲取當前選中的菜單項
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/profile')) return '1';
    if (path.includes('/my-customers')) return '2';
    if (path.includes('/interactions')) return '3';
    return '1';
  };

  return (
    <Layout className={styles.dashboardLayout}>
      <Sider width={250} className={styles.sider}>
        <div className={styles.logo}>
          <h2>銷售管理系統</h2>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={[
            {
              key: '1',
              icon: <UserOutlined />,
              label: '個人資料',
              onClick: () => navigate('/crm/dashboard/profile')
            },
            {
              key: '2',
              icon: <TeamOutlined />,
              label: '我的客戶',
              onClick: () => navigate('/crm/dashboard/my-customers')
            },
            {
              key: '3',
              icon: <InteractionOutlined />,
              label: '互動記錄',
              onClick: () => navigate('/crm/dashboard/interactions')
            }
          ]}
        />
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <div className={styles.userInfo}>
            <span>歡迎，{user?.username}</span>
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