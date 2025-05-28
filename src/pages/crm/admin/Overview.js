import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Select, DatePicker, Button, Spin, Alert, Divider, List, Tabs, Empty } from 'antd';
import { 
  TeamOutlined, 
  DollarOutlined, 
  FieldTimeOutlined,
  UserOutlined, 
  RiseOutlined, 
  LineChartOutlined, 
  PieChartOutlined, 
  BarChartOutlined,
  CalendarOutlined,
  MessageOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { API_BASE_URL } from '../../../utils/api';
import styles from './Overview.module.css';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Option } = Select;

const Overview = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [salesStaff, setSalesStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [dateRange, setDateRange] = useState([moment().subtract(30, 'days'), moment()]);
  
  // 整合所有統計數據
  const [dashboardStats, setDashboardStats] = useState({
    // 系統總覽數據
    totalCustomers: 120,
    newCustomersThisMonth: 25,
    totalEvents: 8,
    upcomingEvents: 3,
    totalProjects: 12,
    totalSalesStaff: 5,
    
    // 業績統計數據
    totalSales: 2500000,
    totalRegistrations: 85,
    conversionRate: 28,
    
    // 業績追蹤數據
    totalDeals: 25,
    totalAmount: 15680000,
    contactCount: 187,
    avgResponseTime: 1.3,
    avgDealCycle: 42,
    customerSatisfaction: 4.2
  });
  
  // 新增缺少的狀態聲明
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [monthlyRegistrations, setMonthlyRegistrations] = useState([]);
  
  const [salesPerformance, setSalesPerformance] = useState([]);
  const [dealsByStatus, setDealsByStatus] = useState([]);
  
  // 業務績效數據範例
  const mockSalesPerformance = [
    { id: 1, name: '張小明', deals: 10, amount: 6800000, contacts: 45, avgResponse: 1.1, avgCycle: 38, satisfaction: 4.5 },
    { id: 2, name: '李大華', deals: 8, amount: 5200000, contacts: 62, avgResponse: 1.5, avgCycle: 45, satisfaction: 4.2 },
    { id: 3, name: '王美麗', deals: 7, amount: 3680000, contacts: 80, avgResponse: 1.2, avgCycle: 40, satisfaction: 4.0 },
  ];

  // 依狀態分類的交易數據範例
  const mockDealsByStatus = [
    { status: '潛在客戶', count: 35, amount: 0 },
    { status: '已聯繫', count: 28, amount: 0 },
    { status: '洽談中', count: 15, amount: 0 },
    { status: '已成交', count: 25, amount: 15680000 },
    { status: '已流失', count: 12, amount: 0 },
  ];

  useEffect(() => {
    fetchOverviewData();
    fetchSalesStaff();
    fetchDashboardData();
    
    // 載入模擬數據
    setSalesPerformance(mockSalesPerformance);
    setDealsByStatus(mockDealsByStatus);
  }, []);

  useEffect(() => {
    if (salesStaff.length > 0) {
      fetchPerformanceData();
    }
  }, [selectedStaff, dateRange, salesStaff]);

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
      setDashboardStats({
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

  const fetchSalesStaff = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/sales-staffs`);
      const data = await response.json();
      setSalesStaff(data.data || []);
    } catch (error) {
      console.error('Error fetching sales staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    // 實際專案中，這裡會獲取儀表板數據
    // 目前使用模擬數據
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  const fetchPerformanceData = async () => {
    // 實際專案中，這裡會根據選擇的業務和日期範圍獲取績效數據
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  const handleStaffChange = (value) => {
    setSelectedStaff(value);
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const calculatePercentageChange = (current, previous) => {
    if (!previous) return 100;
    return ((current - previous) / previous * 100).toFixed(2);
  };

  const salesPerformanceColumns = [
    {
      title: '業務',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '成交件數',
      dataIndex: 'deals',
      key: 'deals',
      width: 100,
      sorter: (a, b) => a.deals - b.deals,
    },
    {
      title: '成交金額',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount) => `$${(amount / 10000).toFixed(2)}萬`,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: '聯絡次數',
      dataIndex: 'contacts',
      key: 'contacts',
      width: 100,
      sorter: (a, b) => a.contacts - b.contacts,
    },
    {
      title: '平均回覆時間(天)',
      dataIndex: 'avgResponse',
      key: 'avgResponse',
      width: 150,
      sorter: (a, b) => a.avgResponse - b.avgResponse,
    },
    {
      title: '平均成交週期(天)',
      dataIndex: 'avgCycle',
      key: 'avgCycle',
      width: 150,
      sorter: (a, b) => a.avgCycle - b.avgCycle,
    },
    {
      title: '客戶滿意度',
      dataIndex: 'satisfaction',
      key: 'satisfaction',
      width: 100,
      render: (rating) => `${rating}/5`,
      sorter: (a, b) => a.satisfaction - b.satisfaction,
    },
  ];

  const dealsByStatusColumns = [
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: '客戶數量',
      dataIndex: 'count',
      key: 'count',
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: '預計/實際成交金額',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => amount ? `$${(amount / 10000).toFixed(2)}萬` : '-',
      sorter: (a, b) => a.amount - b.amount,
    },
  ];

  // 獲取客戶狀態對應的顏色
  const getStatusColor = (status) => {
    const colorMap = {
      '潛在客戶': '#1890ff',  // 藍色
      '已聯繫': '#722ed1',    // 紫色
      '洽談中': '#fa8c16',    // 橙色
      '已成交': '#52c41a',    // 綠色
      '已流失': '#f5222d',    // 紅色
      'potential': '#1890ff', // 藍色
      'contacted': '#722ed1',  // 紫色
      'negotiating': '#fa8c16', // 橙色
      'closed': '#52c41a',    // 綠色
      'lost': '#f5222d',      // 紅色
    };
    return colorMap[status] || '#d9d9d9'; // 默認灰色
  };

  const getStatusDisplay = (status) => {
    const statusMap = {
      'pending': '待處理',
      'contacted': '已聯繫',
      'confirmed': '已確認',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
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
    <div className={styles.dashboardContainer}>
      {/* 顯示錯誤信息（如果有） */}
      {error && 
        <Alert 
          message="載入失敗" 
          description={error} 
          type="error" 
          showIcon 
          closable 
          className={styles.errorAlert}
        />
      }
      
      {/* 頂部統計信息 */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="總客戶數"
              value={dashboardStats.totalCustomers}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="本月交易金額"
              value={dashboardStats.totalSales}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#cf1322' }}
              suffix="元"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="平均成交週期"
              value={dashboardStats.avgDealCycle || 0}
              prefix={<FieldTimeOutlined />}
              valueStyle={{ color: '#1890ff' }}
              suffix="天"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="轉換率"
              value={dashboardStats.conversionRate || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#722ed1' }}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>
      
      {/* 業績追蹤區域 */}
      <Card 
        title={
          <div className={styles.cardTitle}>
            <LineChartOutlined /> 業績追蹤
          </div>
        }
        className={styles.dashboardCard}
        extra={
          <div className={styles.cardFilters}>
            <Select 
              defaultValue="all" 
              style={{ width: 120, marginRight: 16 }}
              onChange={handleStaffChange}
            >
              <Option value="all">所有業務</Option>
              {salesStaff.map(staff => (
                <Option key={staff.id} value={staff.id}>
                  {staff.attributes?.username || `業務 ${staff.id}`}
                </Option>
              ))}
            </Select>
            <RangePicker 
              defaultValue={dateRange}
              onChange={handleDateRangeChange}
              allowClear={false}
            />
          </div>
        }
      >
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <Spin tip="載入中..." />
          </div>
        ) : (
          <div>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Card className={styles.miniCard} title="銷售業績">
                  <Statistic
                    title="總成交金額"
                    value={dashboardStats.totalAmount || 0}
                    suffix="元"
                    precision={0}
                  />
                  <Statistic
                    title="總成交數量"
                    value={dashboardStats.totalDeals || 0}
                    suffix="筆"
                    className={styles.marginTop}
                  />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className={styles.miniCard} title="客戶互動">
                  <Statistic
                    title="總聯絡次數"
                    value={dashboardStats.contactCount || 0}
                    suffix="次"
                  />
                  <Statistic
                    title="平均回覆時間"
                    value={dashboardStats.avgResponseTime || 0}
                    suffix="小時"
                    precision={1}
                    className={styles.marginTop}
                  />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className={styles.miniCard} title="客戶滿意度">
                  <Statistic
                    title="平均評分"
                    value={dashboardStats.customerSatisfaction || 0}
                    suffix="/5"
                    precision={1}
                  />
                  <Statistic
                    title="評分人數"
                    value={48}
                    suffix="人"
                    className={styles.marginTop}
                  />
                </Card>
              </Col>
            </Row>
            
            <Divider orientation="left">業務績效比較</Divider>
            
            <Table
              dataSource={salesPerformance}
              pagination={false}
              className={styles.performanceTable}
              size="small"
              rowKey="id"
              columns={[
                {
                  title: '業務姓名',
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: '成交數量',
                  dataIndex: 'deals',
                  key: 'deals',
                  sorter: (a, b) => a.deals - b.deals,
                },
                {
                  title: '成交金額',
                  dataIndex: 'amount',
                  key: 'amount',
                  render: amount => `${(amount / 10000).toFixed(2)}萬`,
                  sorter: (a, b) => a.amount - b.amount,
                },
                {
                  title: '聯絡次數',
                  dataIndex: 'contacts',
                  key: 'contacts',
                },
                {
                  title: '平均回覆時間',
                  dataIndex: 'avgResponse',
                  key: 'avgResponse',
                  render: time => `${time}小時`,
                  sorter: (a, b) => a.avgResponse - b.avgResponse,
                },
                {
                  title: '平均成交週期',
                  dataIndex: 'avgCycle',
                  key: 'avgCycle',
                  render: days => `${days}天`,
                },
                {
                  title: '客戶滿意度',
                  dataIndex: 'satisfaction',
                  key: 'satisfaction',
                  render: score => `${score}/5`,
                }
              ]}
            />
            
            <Divider orientation="left">客戶分布</Divider>
            
            <Row gutter={[16, 16]} className={styles.chartsRow}>
        <Col xs={24} lg={12}>
                <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                      data={dealsByStatus}
                    cx="50%"
                    cy="50%"
                      labelLine={false}
                      outerRadius={100}
                    fill="#8884d8"
                      dataKey="count"
                      nameKey="status"
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                      {dealsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                    ))}
                  </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [`${value}個客戶`, `${props.payload.status}`]}
                    />
                    <Legend />
                </PieChart>
              </ResponsiveContainer>
        </Col>
              
        <Col xs={24} lg={12}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={dealsByStatus}
                  margin={{
                      top: 5,
                    right: 30,
                    left: 20,
                      bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                  <YAxis />
                    <Tooltip formatter={(value) => [`${value}人`, '人數']} />
                    <Legend />
                    <Bar dataKey="count" name="人數" fill="#8884d8">
                      {dealsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                      ))}
                    </Bar>
                  </BarChart>
              </ResponsiveContainer>
              </Col>
            </Row>
              </div>
            )}
          </Card>

      {/* 最近活動 */}
      <Card 
        title={
          <div className={styles.cardTitle}>
            <CalendarOutlined /> 最近活動
          </div>
        }
        className={styles.dashboardCard}
      >
        <Tabs defaultActiveKey="1">
          <TabPane 
            tab={
              <span>
                <MessageOutlined />
                最近報名
              </span>
            }
            key="1"
          >
            <List
              itemLayout="horizontal"
              dataSource={recentRegistrations}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<span>{item.name} <span className={styles.smallText}>({item.date})</span></span>}
                    description={`電話: ${item.phone} | 電子郵件: ${item.email}`}
                  />
                  <div className={styles.statusTag}>
                    {getStatusDisplay(item.status)}
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: '沒有最近的報名數據' }}
            />
          </TabPane>
          <TabPane 
            tab={
              <span>
                <UserOutlined />
                最近客戶
              </span>
            }
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