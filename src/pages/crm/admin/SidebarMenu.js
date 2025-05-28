import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'antd';
import {
  TeamOutlined,
  HomeOutlined,
  ShopOutlined,
  SettingOutlined,
  CalendarOutlined,
  LineChartOutlined,
  BellOutlined,
  MessageOutlined
} from '@ant-design/icons';

const SidebarMenu = () => {
  const location = useLocation();
  const selectedKey = location.pathname;

  return (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      style={{ height: '100%', borderRight: 0 }}
    >
      <Menu.Item key="/crm/admin/dashboard" icon={<HomeOutlined />}>
        <Link to="/crm/admin/dashboard">總覽</Link>
      </Menu.Item>
      
      <Menu.Item key="/crm/admin/customers" icon={<TeamOutlined />}>
        <Link to="/crm/admin/customers">客戶管理</Link>
      </Menu.Item>
      
      <Menu.Item key="/crm/admin/projects" icon={<ShopOutlined />}>
        <Link to="/crm/admin/projects">建案管理</Link>
      </Menu.Item>
      
      <Menu.Item key="/crm/admin/calendar" icon={<CalendarOutlined />}>
        <Link to="/crm/admin/calendar">日程管理</Link>
      </Menu.Item>
      
      <Menu.Item key="/crm/admin/performance" icon={<LineChartOutlined />}>
        <Link to="/crm/admin/dashboard">業績追蹤</Link>
      </Menu.Item>
      
      <Menu.Item key="/crm/admin/messages" icon={<MessageOutlined />}>
        <Link to="/crm/admin/messages">聯絡訊息</Link>
      </Menu.Item>
      
      <Menu.Item key="/crm/admin/notifications" icon={<BellOutlined />}>
        <Link to="/crm/admin/notifications">通知中心</Link>
      </Menu.Item>
      
      <Menu.Item key="/crm/admin/settings" icon={<SettingOutlined />}>
        <Link to="/crm/admin/settings">系統設定</Link>
      </Menu.Item>
    </Menu>
  );
};

export default SidebarMenu; 