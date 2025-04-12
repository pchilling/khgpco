import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, Alert, Divider, List, Tabs, Empty } from 'antd';
import { UserOutlined, TeamOutlined, ShoppingOutlined, RiseOutlined, CalendarOutlined, FormOutlined } from '@ant-design/icons';
import { PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { API_BASE_URL } from '../../../utils/api';
import styles from './Overview.module.css';

const { TabPane } = Tabs;

const Overview = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCustomers: 0,
    totalStaff: 0,
    totalRegistrations: 0,
    conversionRate: 0
  });
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [monthlyRegistrations, setMonthlyRegistrations] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 獲取註冊數據
      const registrationsResponse = await fetch(`${API_BASE_URL}/api/registrations?sort=createdAt:desc`);
      if (!registrationsResponse.ok) throw new Error('獲取報名數據失敗');
      const registrationsData = await registrationsResponse.json();
      
      // 獲取客戶數據
      const customersResponse = await fetch(`${API_BASE_URL}/api/customers?sort=createdAt:desc`);
      if (!customersResponse.ok) throw new Error('獲取客戶數據失敗');
      const customersData = await customersResponse.json();
      
      // 獲取銷售人員數據
      const staffResponse = await fetch(`${API_BASE_URL}/api/sales-staffs`);
      if (!staffResponse.ok) throw new Error('獲取銷售人員數據失敗');
      const staffData = await staffResponse.json();
      
      // 計算統計數據
      const totalRegistrations = registrationsData.data?.length || 0;
      const totalCustomers = customersData.data?.length || 0;
      const totalStaff = staffData.data?.length || 0;
      
      // 計算轉換率 (從報名到客戶的轉換率)
      const convertedRegistrations = registrationsData.data?.filter(reg => 
        reg.attributes.status === 'converted'
      ).length || 0;
      
      const conversionRate = totalRegistrations > 0 
        ? ((convertedRegistrations / totalRegistrations) * 100).toFixed(2)
        : 0;
      
      // 計算總銷售額 (假設每個客戶都有一個銷售額欄位，如果沒有可以調整)
      let totalSales = 0;
      customersData.data?.forEach(customer => {
        const salesAmount = customer.attributes.salesAmount || 0;
        totalSales += parseFloat(salesAmount);
      });
      
      // 設置統計數據
      setStats({
        totalSales,
        totalCustomers,
        totalStaff,
        totalRegistrations,
        conversionRate
      });
      
      // 設置最近的報名數據 (最多5筆)
      setRecentRegistrations(
        registrationsData.data?.slice(0, 5).map(reg => ({
          id: reg.id,
          name: reg.attributes.name,
          phone: reg.attributes.phone,
          email: reg.attributes.email,
          date: new Date(reg.attributes.createdAt).toLocaleDateString('zh-TW'),
          status: reg.attributes.status
        })) || []
      );
      
      // 設置最近的客戶數據 (最多5筆)
      setRecentCustomers(
        customersData.data?.slice(0, 5).map(customer => ({
          id: customer.id,
          name: customer.attributes.name,
          phone: customer.attributes.phone,
          email: customer.attributes.email,
          date: new Date(customer.attributes.createdAt).toLocaleDateString('zh-TW')
        })) || []
      );
      
      // 生成報名狀態分布數據
      const statusCounts = {
        pending: 0,
        contacted: 0,
        converted: 0,
        rejected: 0
      };
      
      registrationsData.data?.forEach(reg => {
        const status = reg.attributes.status || 'pending';
        if (statusCounts[status] !== undefined) {
          statusCounts[status]++;
        }
      });
      
      setStatusData([
        { name: '待處理', value: statusCounts.pending },
        { name: '已聯繫', value: statusCounts.contacted },
        { name: '已轉換', value: statusCounts.converted },
        { name: '已拒絕', value: statusCounts.rejected }
      ]);
      
      // 生成月度報名趨勢數據
      // 將報名按月份分組
      const monthlyData = {};
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // 初始化過去6個月的數據
      for (let i = 5; i >= 0; i--) {
        const month = new Date(currentYear, now.getMonth() - i, 1);
        const monthKey = `${month.getFullYear()}-${month.getMonth() + 1}`;
        const monthLabel = `${month.getMonth() + 1}月`;
        monthlyData[monthKey] = { month: monthLabel, 報名數: 0 };
      }
      
      // 統計報名數據
      registrationsData.data?.forEach(reg => {
        const createdAt = new Date(reg.attributes.createdAt);
        const monthKey = `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}`;
        
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].報名數++;
        }
      });
      
      // 轉換為數組形式
      setMonthlyRegistrations(Object.values(monthlyData));
      
    } catch (err) {
      console.error('Error fetching overview data:', err);
      setError('獲取數據失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  // 轉換狀態顯示
  const getStatusDisplay = (status) => {
    switch(status) {
      case 'pending': return '待處理';
      case 'contacted': return '已聯繫';
      case 'converted': return '已轉換';
      case 'rejected': return '已拒絕';
      default: return '未知';
    }
  };

  // 客戶來源分佈的顏色
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (isLoading) {
    return (
      <div className={styles.overview}>
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <p>正在載入數據...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.overview}>
        <Alert 
          message="錯誤" 
          description={error} 
          type="error" 
          showIcon 
          className={styles.errorAlert}
        />
      </div>
    );
  }

  return (
    <div className={styles.overviewContainer}>
      <h2 className={styles.pageTitle}>系統總覽</h2>
      
      {/* 統計數據卡片 */}
      <Row gutter={[24, 24]} className={styles.statsRow}>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="總銷售額"
              value={stats.totalSales}
              valueStyle={{ color: '#3f8600' }}
              prefix={<RiseOutlined />}
              suffix="元"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="客戶總數"
              value={stats.totalCustomers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="報名總數"
              value={stats.totalRegistrations}
              prefix={<FormOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="轉換率"
              value={stats.conversionRate}
              suffix="%"
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
      </Row>
      
      {/* 數據可視化區域 */}
      <Row gutter={[24, 24]} className={styles.chartsRow}>
        <Col xs={24} lg={12}>
          <Card title="報名狀態分布" className={styles.chartCard}>
            {statusData.some(item => item.value > 0) ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, '數量']} />
                  <Legend formatter={(value) => value} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.emptyChartContainer}>
                <Empty description="沒有足夠的報名數據" />
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="月度報名趨勢" className={styles.chartCard}>
            {monthlyRegistrations.some(item => item.報名數 > 0) ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={monthlyRegistrations}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 20,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [value, '報名數']} labelFormatter={(label) => `${label}`} />
                  <Legend formatter={(value) => '報名數'} />
                  <Line 
                    type="monotone" 
                    name="報名數"
                    dataKey="報名數" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.emptyChartContainer}>
                <Empty description="沒有足夠的月度報名數據" />
              </div>
            )}
          </Card>
        </Col>
      </Row>
      
      {/* 最近的活動和客戶 */}
      <Card className={styles.recentActivitiesCard}>
        <Tabs defaultActiveKey="1">
          <TabPane 
            tab={<span><CalendarOutlined /> 最近的報名</span>} 
            key="1"
          >
            <List
              itemLayout="horizontal"
              dataSource={recentRegistrations}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<span>{item.name} <span className={styles.smallText}>({item.date})</span></span>}
                    description={`電話: ${item.phone} | 電子郵件: ${item.email} | 狀態: ${getStatusDisplay(item.status)}`}
                  />
                </List.Item>
              )}
              locale={{ emptyText: '沒有最近的報名數據' }}
            />
          </TabPane>
          <TabPane 
            tab={<span><UserOutlined /> 最近的客戶</span>} 
            key="2"
          >
            <List
              itemLayout="horizontal"
              dataSource={recentCustomers}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<span>{item.name} <span className={styles.smallText}>({item.date})</span></span>}
                    description={`電話: ${item.phone} | 電子郵件: ${item.email}`}
                  />
                </List.Item>
              )}
              locale={{ emptyText: '沒有最近的客戶數據' }}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Overview; 