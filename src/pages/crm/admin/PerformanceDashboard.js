import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Select, DatePicker, Button, Spin, Empty, Tabs, Radio } from 'antd';
import { TeamOutlined, DollarOutlined, FieldTimeOutlined, UserOutlined, RiseOutlined, LineChartOutlined, PieChartOutlined, BarChartOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../../utils/api';
import styles from './PerformanceDashboard.module.css';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Option } = Select;

const PerformanceDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [salesStaff, setSalesStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [dateRange, setDateRange] = useState([moment().subtract(30, 'days'), moment()]);
  const [stats, setStats] = useState({
    totalDeals: 0,
    totalAmount: 0,
    contactCount: 0,
    avgResponseTime: 0,
    avgDealCycle: 0,
    customerSatisfaction: 0
  });
  const [salesPerformance, setSalesPerformance] = useState([]);
  const [dealsByStatus, setDealsByStatus] = useState([]);
  
  // 統計數據格式範例
  const mockStats = {
    totalDeals: 25,
    totalAmount: 15680000,
    contactCount: 187,
    avgResponseTime: 1.3,
    avgDealCycle: 42,
    customerSatisfaction: 4.2
  };

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
    fetchSalesStaff();
    
    // 載入模擬數據
    setStats(mockStats);
    setSalesPerformance(mockSalesPerformance);
    setDealsByStatus(mockDealsByStatus);
  }, []);

  useEffect(() => {
    if (salesStaff.length > 0) {
      fetchPerformanceData();
    }
  }, [selectedStaff, dateRange, salesStaff]);

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

  const fetchPerformanceData = async () => {
    // 實際專案中，這裡會根據選擇的業務和日期範圍獲取績效數據
    // 目前使用模擬數據進行展示
    setLoading(true);
    
    // 模擬API請求延遲
    setTimeout(() => {
      setLoading(false);
    }, 800);
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

  return (
    <div className={styles.performanceDashboard}>
      <Card
        title="業務績效儀表板"
        className={styles.dashboardCard}
        extra={
          <div className={styles.filterBar}>
            <Select
              placeholder="選擇業務"
              style={{ width: 180, marginRight: 16 }}
              onChange={handleStaffChange}
              value={selectedStaff}
            >
              <Option value="all">所有業務</Option>
              {salesStaff.map(staff => (
                <Option key={staff.id} value={staff.id}>
                  {staff.attributes.username}
                </Option>
              ))}
            </Select>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              style={{ marginRight: 16 }}
            />
            <Button type="primary" onClick={fetchPerformanceData}>
              更新數據
            </Button>
          </div>
        }
      >
        <Spin spinning={loading}>
          <Tabs defaultActiveKey="summary">
            <TabPane
              tab={
                <span>
                  <LineChartOutlined />
                  績效總覽
                </span>
              }
              key="summary"
            >
              <Row gutter={[16, 16]} className={styles.statsCards}>
                <Col xs={12} sm={12} md={8} lg={8} xl={4}>
                  <Card className={styles.statCard}>
                    <Statistic
                      title="成交件數"
                      value={stats.totalDeals}
                      prefix={<TeamOutlined />}
                      suffix="件"
                    />
                    <div className={styles.trendIndicator}>
                      <RiseOutlined style={{ color: '#52c41a' }} /> 
                      {calculatePercentageChange(stats.totalDeals, 20)}%
                    </div>
                  </Card>
                </Col>
                <Col xs={12} sm={12} md={8} lg={8} xl={4}>
                  <Card className={styles.statCard}>
                    <Statistic
                      title="成交總額"
                      value={stats.totalAmount / 10000}
                      precision={2}
                      prefix={<DollarOutlined />}
                      suffix="萬"
                    />
                    <div className={styles.trendIndicator}>
                      <RiseOutlined style={{ color: '#52c41a' }} /> 
                      {calculatePercentageChange(stats.totalAmount, 12500000)}%
                    </div>
                  </Card>
                </Col>
                <Col xs={12} sm={12} md={8} lg={8} xl={4}>
                  <Card className={styles.statCard}>
                    <Statistic
                      title="客戶聯絡次數"
                      value={stats.contactCount}
                      prefix={<UserOutlined />}
                      suffix="次"
                    />
                    <div className={styles.trendIndicator}>
                      <RiseOutlined style={{ color: '#52c41a' }} /> 
                      {calculatePercentageChange(stats.contactCount, 150)}%
                    </div>
                  </Card>
                </Col>
                <Col xs={12} sm={12} md={8} lg={8} xl={4}>
                  <Card className={styles.statCard}>
                    <Statistic
                      title="平均回覆時間"
                      value={stats.avgResponseTime}
                      precision={1}
                      prefix={<FieldTimeOutlined />}
                      suffix="天"
                    />
                    <div className={styles.trendIndicator}>
                      <RiseOutlined style={{ color: '#f5222d' }} /> 
                      {calculatePercentageChange(stats.avgResponseTime, 1.2)}%
                    </div>
                  </Card>
                </Col>
                <Col xs={12} sm={12} md={8} lg={8} xl={4}>
                  <Card className={styles.statCard}>
                    <Statistic
                      title="平均成交週期"
                      value={stats.avgDealCycle}
                      prefix={<FieldTimeOutlined />}
                      suffix="天"
                    />
                    <div className={styles.trendIndicator}>
                      <RiseOutlined style={{ color: '#f5222d' }} /> 
                      {calculatePercentageChange(stats.avgDealCycle, 38)}%
                    </div>
                  </Card>
                </Col>
                <Col xs={12} sm={12} md={8} lg={8} xl={4}>
                  <Card className={styles.statCard}>
                    <Statistic
                      title="客戶滿意度"
                      value={stats.customerSatisfaction}
                      precision={1}
                      prefix={<UserOutlined />}
                      suffix="/5"
                    />
                    <div className={styles.trendIndicator}>
                      <RiseOutlined style={{ color: '#52c41a' }} /> 
                      {calculatePercentageChange(stats.customerSatisfaction, 4.0)}%
                    </div>
                  </Card>
                </Col>
              </Row>

              <Card title="業務績效比較" className={styles.tableCard}>
                <Table
                  columns={salesPerformanceColumns}
                  dataSource={salesPerformance}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 'max-content' }}
                />
              </Card>

              <Card title="依狀態分類客戶統計" className={styles.tableCard}>
                <Table
                  columns={dealsByStatusColumns}
                  dataSource={dealsByStatus}
                  rowKey="status"
                  pagination={false}
                  size="small"
                />
              </Card>
            </TabPane>
            <TabPane
              tab={
                <span>
                  <BarChartOutlined />
                  業務對比
                </span>
              }
              key="comparison"
            >
              <div className={styles.chartPlaceholder}>
                <Empty
                  description={
                    <span>
                      業務績效對比圖表將在下一階段實現
                    </span>
                  }
                />
              </div>
            </TabPane>
            <TabPane
              tab={
                <span>
                  <PieChartOutlined />
                  客戶分析
                </span>
              }
              key="customer"
            >
              <div className={styles.chartPlaceholder}>
                <Empty
                  description={
                    <span>
                      客戶來源與轉換分析將在下一階段實現
                    </span>
                  }
                />
              </div>
            </TabPane>
          </Tabs>
        </Spin>
      </Card>
    </div>
  );
};

export default PerformanceDashboard; 
 
 
 