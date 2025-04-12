import React from 'react';
import { Layout, Menu, Button } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  FormOutlined
} from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { logout } from '../../../services/auth';
import styles from './AdminDashboard.module.css';

const { Header, Sider, Content } = Layout;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    logout();
  };

  // 獲取當前選中的菜單項
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/admin/overview')) return '1';
    if (path.includes('/admin/registrations')) return '2';
    if (path.includes('/admin/staff-management')) return '3';
    if (path.includes('/admin/customers')) return '4';
    if (path.includes('/admin/sales-data')) return '5';
    return '1';
  };

  return (
    <Layout className={styles.dashboardLayout}>
      <Sider width={220} className={styles.sider} collapsible>
        <div className={styles.logo}>
          <h2>管理員系統</h2>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={[
            {
              key: '1',
              icon: <DashboardOutlined />,
              label: '總覽',
              onClick: () => navigate('/crm/admin/overview')
            },
            {
              key: '2',
              icon: <FormOutlined />,
              label: '活動報名管理',
              onClick: () => navigate('/crm/admin/registrations')
            },
            {
              key: '3',
              icon: <TeamOutlined />,
              label: '銷售人員管理',
              onClick: () => navigate('/crm/admin/staff-management')
            },
            {
              key: '4',
              icon: <UserOutlined />,
              label: '客戶資料庫',
              onClick: () => navigate('/crm/admin/customers')
            },
            {
              key: '5',
              icon: <BarChartOutlined />,
              label: '銷售數據',
              onClick: () => navigate('/crm/admin/sales-data')
            }
          ]}
        />
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <div className={styles.userInfo}>
            <span>管理員：{user?.username}</span>
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

export default AdminDashboard; 