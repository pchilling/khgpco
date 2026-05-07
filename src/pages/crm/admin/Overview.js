import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Select, DatePicker, Button, Spin, Alert, Divider, List, Tabs, Empty, Tag, Progress } from 'antd';
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
  ShopOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PhoneOutlined,
  MailOutlined
} from '@ant-design/icons';
import { PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { API_BASE_URL } from '../../../utils/api';
import { fetchAllStrapi } from '../../../utils/strapiPaginate';
import styles from './Overview.module.css';
import dayjs from 'dayjs';
import axios from 'axios';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Option } = Select;

const Overview = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [salesStaff, setSalesStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  
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
  const [interactions, setInteractions] = useState([]);
  const [stats, setStats] = useState({
    totalDeals: 0,
    totalAmount: 0,
    conversionRate: 0,
    activeDeals: 0
  });
  const [customerStages, setCustomerStages] = useState([]);
  
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
      // Run independent list fetches in parallel; each list is paginated internally.
      const [registrationsAll, customersAll, staffResponse] = await Promise.all([
        fetchAllStrapi(API_BASE_URL, '/api/registrations?sort=createdAt:desc'),
        fetchAllStrapi(API_BASE_URL, '/api/customers?sort=createdAt:desc'),
        fetch(`${API_BASE_URL}/api/sales-staffs`),
      ]);
      const registrationsData = { data: registrationsAll };
      const customersData = { data: customersAll };
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

  // 獲取統計數據
  const fetchStats = async () => {
    try {
      if (!dateRange || !dateRange[0] || !dateRange[1]) return;
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      const path = `/api/interactions?filters[date][$gte]=${startDate}&filters[date][$lte]=${endDate}&populate[0]=customer&populate[1]=sales_staff`;
      const interactions = await fetchAllStrapi(API_BASE_URL, path);
      
      // 計算成交數和金額
      const deals = interactions.filter(i => i.attributes.is_deal);
      const totalAmount = deals.reduce((sum, i) => sum + (parseFloat(i.attributes.deal_amount) || 0), 0);
      
      // 計算轉換率
      const uniqueCustomers = new Set(interactions.map(i => i.attributes.customer?.data?.id));
      const uniqueDeals = new Set(deals.map(i => i.attributes.customer?.data?.id));
      const conversionRate = (uniqueDeals.size / uniqueCustomers.size * 100) || 0;

      // 計算進行中的交易
      const activeDeals = interactions.filter(i => 
        i.attributes.is_deal && 
        ['negotiating', 'contract_signed'].includes(i.attributes.status)
      ).length;

      setStats({
        totalDeals: deals.length,
        totalAmount,
        conversionRate,
        activeDeals
      });

      // 處理銷售人員績效
      const salesStats = {};
      interactions.forEach(i => {
        const staffId = i.attributes.sales_staff?.data?.id;
        const staffName = i.attributes.sales_staff?.data?.attributes?.name;
        if (staffId && i.attributes.is_deal) {
          if (!salesStats[staffId]) {
            salesStats[staffId] = {
              name: staffName,
              deals: 0,
              amount: 0,
              interactions: 0
            };
          }
          salesStats[staffId].deals += 1;
          salesStats[staffId].amount += parseFloat(i.attributes.deal_amount) || 0;
        }
      });
      setSalesPerformance(Object.values(salesStats).sort((a, b) => b.amount - a.amount));

      // 處理客戶階段分布
      const stages = {
        'initial_contact': 0,
        'following_up': 0,
        'negotiating': 0,
        'contract_signed': 0,
        'payment_received': 0,
        'completed': 0,
        'cancelled': 0
      };
      interactions.forEach(i => {
        stages[i.attributes.status] = (stages[i.attributes.status] || 0) + 1;
      });
      setCustomerStages(Object.entries(stages).map(([stage, count]) => ({
        stage,
        count
      })));

      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  // 獲取最近互動
  const fetchRecentInteractions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/interactions`, {
        params: {
          sort: 'date:desc',
          'pagination[page]': 1,
          'pagination[pageSize]': 5,
          populate: ['customer', 'sales_staff']
        }
      });
      setInteractions(response.data.data);
    } catch (error) {
      console.error('Error fetching interactions:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRecentInteractions();
  }, [dateRange]);

  // 渲染銷售業績圖表
  const renderSalesChart = () => {
    const data = salesPerformance.map(staff => ({
      name: staff.name,
      value: staff.amount
    }));

    const config = {
      data,
      angleField: 'value',
      colorField: 'name',
      radius: 0.8,
      label: {
        type: 'outer'
      }
    };

    return <Pie {...config} />;
  };

  // 渲染客戶階段分布圖表
  const renderStagesChart = () => {
    const config = {
      data: customerStages,
      xField: 'stage',
      yField: 'count',
      point: {
        size: 5,
        shape: 'diamond'
      }
    };

    return <Line {...config} />;
  };

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
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <RangePicker 
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            style={{ marginBottom: '16px' }}
          />
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="總成交數"
              value={stats.totalDeals}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="總成交金額"
              value={stats.totalAmount}
              precision={2}
              prefix="$"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="轉換率"
              value={stats.conversionRate}
              precision={2}
              prefix={<ArrowUpOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="進行中交易"
              value={stats.activeDeals}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>
      
            <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="銷售業績分布">
            {renderSalesChart()}
                </Card>
              </Col>
        <Col span={12}>
          <Card title="客戶階段分布">
            {renderStagesChart()}
                </Card>
              </Col>
            </Row>
            
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={12}>
          <Card title="銷售排行榜">
            <Table
              dataSource={salesPerformance}
              columns={[
                {
                  title: '銷售人員',
                  dataIndex: 'name',
                },
                {
                  title: '成交數',
                  dataIndex: 'deals',
                },
                {
                  title: '成交金額',
                  dataIndex: 'amount',
                  render: (amount) => `$${amount.toLocaleString()}`
                }
              ]}
              pagination={false}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="最近互動">
            <List
              dataSource={interactions}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={`${item.attributes.customer?.data?.attributes?.name || '未知客戶'} - ${item.attributes.type}`}
                    description={
                      <>
                        <Tag color={getStatusColor(item.attributes.status)}>
                          {item.attributes.status}
                        </Tag>
                        {dayjs(item.attributes.date).format('YYYY-MM-DD HH:mm')}
                      </>
                    }
                  />
                  {item.attributes.is_deal && (
                    <Tag color="green">${item.attributes.deal_amount}</Tag>
                  )}
                </List.Item>
              )}
            />
      </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Overview; 