import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Spin, Alert, Select, DatePicker, Space, Statistic } from 'antd';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../../utils/api';
import styles from './SalesAnalytics.module.css';

const { Option } = Select;

const SalesAnalytics = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [salesData, setSalesData] = useState({
    customers: [],
    registrations: [],
    interactions: []
  });
  const [timeFrame, setTimeFrame] = useState('month');
  const [salesPerson, setSalesPerson] = useState('all');
  const [salesStaff, setSalesStaff] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: getDateNMonthsAgo(1),
    endDate: new Date().toISOString().split('T')[0]
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    fetchSalesStaff();
    fetchAnalyticsData();
  }, []);

  // 根據選擇的時間範圍更新開始日期
  useEffect(() => {
    let startDate;
    const endDate = new Date().toISOString().split('T')[0];

    switch (timeFrame) {
      case 'week':
        startDate = getDateNDaysAgo(7);
        break;
      case 'month':
        startDate = getDateNMonthsAgo(1);
        break;
      case 'quarter':
        startDate = getDateNMonthsAgo(3);
        break;
      case 'year':
        startDate = getDateNMonthsAgo(12);
        break;
      default:
        startDate = getDateNMonthsAgo(1);
    }

    setDateRange({ startDate, endDate });
  }, [timeFrame]);

  function getDateNDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  function getDateNMonthsAgo(months) {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date.toISOString().split('T')[0];
  }

  const fetchSalesStaff = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sales-staffs?populate=*`);
      if (!response.ok) throw new Error('Failed to fetch sales staff');
      
      const data = await response.json();
      setSalesStaff(data.data || []);
    } catch (err) {
      console.error('Error fetching sales staff:', err);
      setError('獲取銷售人員數據失敗');
    }
  };

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 獲取客戶數據
      const customersResponse = await fetch(`${API_BASE_URL}/api/customers?populate=sales_staff&sort=createdAt:desc`);
      if (!customersResponse.ok) throw new Error('Failed to fetch customers');
      
      const customersData = await customersResponse.json();
      
      // 獲取報名數據
      const registrationsResponse = await fetch(`${API_BASE_URL}/api/registrations?populate=sales_staff&sort=createdAt:desc`);
      if (!registrationsResponse.ok) throw new Error('Failed to fetch registrations');
      
      const registrationsData = await registrationsResponse.json();
      
      // 獲取互動數據 (如果有)
      let interactionsData = { data: [] };
      try {
        const interactionsResponse = await fetch(`${API_BASE_URL}/api/interactions?populate=sales_staff,customer&sort=createdAt:desc`);
        if (interactionsResponse.ok) {
          interactionsData = await interactionsResponse.json();
        }
      } catch (err) {
        console.warn('Interactions endpoint might not exist or have issues:', err);
      }
      
      setSalesData({
        customers: customersData.data || [],
        registrations: registrationsData.data || [],
        interactions: interactionsData.data || []
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('獲取數據失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = () => {
    fetchAnalyticsData();
  };

  // 處理客戶來源的數據
  const prepareCustomerSourceData = () => {
    const sourceCount = {};
    
    salesData.customers.forEach(customer => {
      if (!isInDateRange(customer.attributes.createdAt)) return;
      if (salesPerson !== 'all' && 
          customer.attributes.sales_staff?.data?.id !== parseInt(salesPerson)) return;
      
      const source = customer.attributes.source || '未知';
      
      if (sourceCount[source]) {
        sourceCount[source] += 1;
      } else {
        sourceCount[source] = 1;
      }
    });
    
    return Object.keys(sourceCount).map(source => ({
      name: source,
      value: sourceCount[source]
    }));
  };

  // 處理轉換率的數據
  const prepareConversionRateData = () => {
    const monthlyData = {};
    
    // 初始化每個月的數據
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const monthYear = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyData[monthYear] = { registrations: 0, conversions: 0 };
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // 計算報名數
    salesData.registrations.forEach(registration => {
      if (!isInDateRange(registration.attributes.createdAt)) return;
      if (salesPerson !== 'all' && 
          registration.attributes.sales_staff?.data?.id !== parseInt(salesPerson)) return;
      
      const date = new Date(registration.attributes.createdAt);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (monthlyData[monthYear]) {
        monthlyData[monthYear].registrations += 1;
      }
    });
    
    // 計算轉換數 (status 為 'converted' 的報名)
    salesData.registrations.forEach(registration => {
      if (!isInDateRange(registration.attributes.createdAt)) return;
      if (registration.attributes.status !== 'converted') return;
      if (salesPerson !== 'all' && 
          registration.attributes.sales_staff?.data?.id !== parseInt(salesPerson)) return;
      
      const date = new Date(registration.attributes.createdAt);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (monthlyData[monthYear]) {
        monthlyData[monthYear].conversions += 1;
      }
    });
    
    // 轉換為圖表所需的數據格式
    return Object.keys(monthlyData).map(monthYear => {
      const { registrations, conversions } = monthlyData[monthYear];
      const rate = registrations ? (conversions / registrations * 100).toFixed(1) : 0;
      
      return {
        name: monthYear,
        registrations,
        conversions,
        rate: parseFloat(rate)
      };
    });
  };

  // 處理銷售人員業績的數據
  const prepareSalesPerformanceData = () => {
    const staffPerformance = {};
    
    // 初始化每個銷售人員的數據
    salesStaff.forEach(staff => {
      staffPerformance[staff.id] = {
        name: staff.attributes.name || staff.attributes.username,
        registrations: 0,
        customers: 0
      };
    });
    
    // 計算每個銷售人員的報名數
    salesData.registrations.forEach(registration => {
      if (!isInDateRange(registration.attributes.createdAt)) return;
      
      const staffId = registration.attributes.sales_staff?.data?.id;
      if (staffId && staffPerformance[staffId]) {
        staffPerformance[staffId].registrations += 1;
      }
    });
    
    // 計算每個銷售人員的客戶數
    salesData.customers.forEach(customer => {
      if (!isInDateRange(customer.attributes.createdAt)) return;
      
      const staffId = customer.attributes.sales_staff?.data?.id;
      if (staffId && staffPerformance[staffId]) {
        staffPerformance[staffId].customers += 1;
      }
    });
    
    // 轉換為圖表所需的數據格式
    return Object.values(staffPerformance);
  };

  // 判斷日期是否在選定的範圍內
  const isInDateRange = (dateString) => {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    
    return date >= start && date <= end;
  };

  // 統計總數
  const getTotalStats = () => {
    let totalRegistrations = 0;
    let totalCustomers = 0;
    let totalConversions = 0;
    
    // 計算報名總數
    salesData.registrations.forEach(registration => {
      if (!isInDateRange(registration.attributes.createdAt)) return;
      if (salesPerson !== 'all' && 
          registration.attributes.sales_staff?.data?.id !== parseInt(salesPerson)) return;
      
      totalRegistrations += 1;
      if (registration.attributes.status === 'converted') {
        totalConversions += 1;
      }
    });
    
    // 計算客戶總數
    salesData.customers.forEach(customer => {
      if (!isInDateRange(customer.attributes.createdAt)) return;
      if (salesPerson !== 'all' && 
          customer.attributes.sales_staff?.data?.id !== parseInt(salesPerson)) return;
      
      totalCustomers += 1;
    });
    
    const conversionRate = totalRegistrations ? 
      (totalConversions / totalRegistrations * 100).toFixed(1) : 0;
    
    return {
      totalRegistrations,
      totalCustomers,
      totalConversions,
      conversionRate
    };
  };

  const stats = getTotalStats();
  const customerSourceData = prepareCustomerSourceData();
  const conversionRateData = prepareConversionRateData();
  const salesPerformanceData = prepareSalesPerformanceData();

  const handleDateStartChange = (e) => {
    setDateRange({
      ...dateRange,
      startDate: e.target.value
    });
  };

  const handleDateEndChange = (e) => {
    setDateRange({
      ...dateRange,
      endDate: e.target.value
    });
  };

  return (
    <div className={styles.salesAnalytics}>
      <Card 
        title="銷售數據分析"
        className={styles.mainCard}
      >
        {error && <Alert message={error} type="error" showIcon className={styles.alert} />}
        
        <Card className={styles.filterCard}>
          <Form layout="horizontal">
            <Row gutter={[16, 8]}>
              <Col xs={24} sm={12} md={12} xl={12}>
                <Form.Item label="時間範圍">
                  <Select 
                    value={timeFrame}
                    onChange={(value) => setTimeFrame(value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="week">最近一週</Option>
                    <Option value="month">最近一個月</Option>
                    <Option value="quarter">最近三個月</Option>
                    <Option value="year">最近一年</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={12} xl={12}>
                <Form.Item label="銷售人員">
                  <Select 
                    value={salesPerson}
                    onChange={(value) => setSalesPerson(value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="all">所有人員</Option>
                    {salesStaff.map(staff => (
                      <Option key={staff.id} value={staff.id}>
                        {staff.attributes.name || staff.attributes.username}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={[16, 8]}>
              <Col xs={24} sm={12} md={10} xl={10}>
                <Form.Item label="開始日期" className={styles.dateFormItem}>
                  <div className={styles.dateInputWrapper}>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={dateRange.startDate}
                      onChange={handleDateStartChange}
                    />
                  </div>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={10} xl={10}>
                <Form.Item label="結束日期" className={styles.dateFormItem}>
                  <div className={styles.dateInputWrapper}>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={dateRange.endDate}
                      onChange={handleDateEndChange}
                    />
                  </div>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={24} md={4} xl={4} className={styles.filterButtonCol}>
                <Form.Item label=" " colon={false} className={styles.filterButtonFormItem}>
                  <Button 
                    type="primary" 
                    icon={<FilterOutlined />}
                    onClick={handleFilterChange}
                    loading={isLoading}
                    className={styles.filterButton}
                  >
                    篩選
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
        
        <Row gutter={[16, 16]} className={styles.statsRow}>
          <Col xs={24} sm={12} md={6}>
            <Card className={styles.statCard}>
              <Statistic 
                title="總報名數" 
                value={stats.totalRegistrations} 
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card className={styles.statCard}>
              <Statistic 
                title="總客戶數" 
                value={stats.totalCustomers} 
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card className={styles.statCard}>
              <Statistic 
                title="已轉換數" 
                value={stats.totalConversions} 
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card className={styles.statCard}>
              <Statistic 
                title="轉換率" 
                value={stats.conversionRate} 
                suffix="%" 
                precision={1}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card 
              title="客戶來源分布" 
              className={styles.chartCard}
              loading={isLoading}
            >
              {customerSourceData.length === 0 ? (
                <div className={styles.noDataMessage}>選定時間範圍內沒有客戶數據</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={customerSourceData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {customerSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Col>
          
          <Col xs={24} md={12}>
            <Card 
              title="銷售人員業績比較" 
              className={styles.chartCard}
              loading={isLoading}
            >
              {salesPerformanceData.length === 0 ? (
                <div className={styles.noDataMessage}>沒有銷售人員數據可顯示</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={salesPerformanceData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="registrations" name="報名數" fill="#8884d8" />
                    <Bar dataKey="customers" name="客戶數" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Col>
        </Row>
        
        <Row gutter={[16, 16]} className={styles.chartRow}>
          <Col span={24}>
            <Card 
              title="報名和轉換趨勢" 
              className={styles.chartCard}
              loading={isLoading}
            >
              {conversionRateData.length === 0 ? (
                <div className={styles.noDataMessage}>選定時間範圍內沒有報名數據</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={conversionRateData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="registrations"
                      name="報名數"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="conversions"
                      name="轉換數"
                      stroke="#82ca9d"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="rate"
                      name="轉換率(%)"
                      stroke="#ff7300"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default SalesAnalytics; 