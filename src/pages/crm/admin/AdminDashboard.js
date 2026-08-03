import React from 'react';
import { Layout, Menu, Button } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  FormOutlined,
  InteractionOutlined,
  MessageOutlined,
  MailOutlined,
  ApartmentOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { logout } from '../../../services/auth';
import styles from './AdminDashboard.module.css';
import gryphonLogo from '../../../assets/gryphon-logo-white.png';

const { Header, Sider, Content } = Layout;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user'));

  // 首次進入或舊書籤到 /dashboard 時，自動導向 overview
  React.useEffect(() => {
    const hash = location.pathname + (location.search || '');
    if (location.pathname.endsWith('/crm/admin') || location.pathname.endsWith('/crm/admin/')) {
      navigate('/crm/admin/overview', { replace: true });
    }
    if (location.pathname.includes('/crm/admin/dashboard')) {
      navigate('/crm/admin/overview', { replace: true });
    }
  }, [location.pathname, navigate]);

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
    if (path.includes('/admin/interactions')) return '5';
    if (path.includes('/admin/contact-messages')) return '6';
    if (path.includes('/admin/deals')) return '9';
    if (path.includes('/admin/channels')) return '8';
    if (path.includes('/admin/sales-data')) return '7';
    return '1';
  };

  return (
    <Layout className={styles.dashboardLayout}>
      <Sider width={220} className={styles.sider} collapsible>
        <div className={styles.logo}>
          <img
            src={gryphonLogo}
            alt="閣睿國際置業 管理員系統"
            style={{ display: 'block', maxHeight: 36, maxWidth: '88%' }}
          />
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={[
            {
              key: '1',
              icon: <DashboardOutlined />,
              label: '總覽 & 業績追蹤',
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
              key: '9',
              icon: <DollarOutlined />,
              label: '成交管理',
              onClick: () => navigate('/crm/admin/deals')
            },
            {
              key: '8',
              icon: <ApartmentOutlined />,
              label: '渠道管理',
              onClick: () => navigate('/crm/admin/channels')
            },
            {
              key: '5',
              icon: <MessageOutlined />,
              label: '聯絡記錄管理',
              onClick: () => navigate('/crm/admin/interactions')
            },
            {
              key: '6',
              icon: <MailOutlined />,
              label: '網站聯絡訊息',
              onClick: () => navigate('/crm/admin/contact-messages')
            },
            {
              key: '7',
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