import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Spin, Alert, Select, DatePicker, Space, Statistic } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../../utils/api';
import { fetchAllStrapi } from '../../../utils/strapiPaginate';
import styles from './SalesAnalytics.module.css';
import ReactECharts from 'echarts-for-react';

const { Option } = Select;

const SalesAnalytics = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [salesData, setSalesData] = useState({
    customers: [],
    registrations: [],
    interactions: []
  });
  const [timeFrame, setTimeFrame] = useState('all');
  const [salesPerson, setSalesPerson] = useState('all');
  const [salesStaff, setSalesStaff] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchSalesStaff();
    fetchAnalyticsData();
  }, []);

  // 根據選擇的時間範圍更新開始日期
  useEffect(() => {
    let startDate = '';
    let endDate = '';

    if (timeFrame === 'all') {
      // 不套日期篩選
      setDateRange({ startDate: '', endDate: '' });
      return;
    }

    endDate = new Date().toISOString().split('T')[0];

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
        startDate = '';
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
      const response = await fetch(`${API_BASE_URL}/api/sales-staffs?populate=*&pagination[pageSize]=1000`);
      if (!response.ok) throw new Error('Failed to fetch sales staff');
      
      const data = await response.json();
      const list = data.data || [];
      // 僅顯示業務：排除系統管理員/管理帳號
      const filtered = list.filter(s => {
        const name = (s?.attributes?.name || '').toLowerCase();
        const username = (s?.attributes?.username || '').toLowerCase();
        // 常見管理帳號關鍵字
        const isAdminUser = username === 'admin' || username === 'administrator';
        const isManagerName = name.includes('管理');
        return !(isAdminUser || isManagerName);
      });
      setSalesStaff(filtered);
    } catch (err) {
      console.error('Error fetching sales staff:', err);
      setError('獲取銷售人員數據失敗');
    }
  };

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [customers, registrations, interactions] = await Promise.all([
        fetchAllStrapi(API_BASE_URL, '/api/customers?populate=sales_staff,customer_source&sort=createdAt:desc'),
        fetchAllStrapi(API_BASE_URL, '/api/registrations?populate=sales_staff&sort=createdAt:desc'),
        fetchAllStrapi(API_BASE_URL, '/api/deals?populate=sales_staff,customer&sort=createdAt:desc')
          .catch((err) => {
            console.warn('Deals endpoint fetchAll failed or missing:', err);
            return [];
          }),
      ]);

      setSalesData({ customers, registrations, interactions });
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

  // 處理客戶來源的數據 → ECharts pie series 資料
  const prepareCustomerSourceData = () => {
    const sourceCount = {};
    
    salesData.customers.forEach(customer => {
      if (!isInDateRange(customer.attributes.createdAt)) return;
      if (salesPerson !== 'all' && 
          customer.attributes.sales_staff?.data?.id !== parseInt(salesPerson)) return;
      
      const enumMap = { event: '活動', website: '官網', referral: '渠道', other: '其他' };
      const source = customer.attributes.customer_source?.data?.attributes?.name
        || enumMap[customer.attributes.source] || '其他';
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    });

    return Object.keys(sourceCount).map(source => ({ name: source, value: sourceCount[source] }));
  };

  // 處理轉換率的數據 → ECharts line series 資料
  const prepareConversionRateData = () => {
    const monthlyData = {};

    // 動態決定月份範圍：若沒選日期，取資料中最早到最晚月份
    if (!dateRange.startDate || !dateRange.endDate) {
      const allDates = [];
      salesData.registrations.forEach(r => { if (r?.attributes?.createdAt) allDates.push(new Date(r.attributes.createdAt)); });
      if (allDates.length === 0) return [];
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
      let cursor = new Date(start);
      while (cursor <= end) {
        const monthYear = `${cursor.getFullYear()}-${(cursor.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlyData[monthYear] = { registrations: 0, conversions: 0 };
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const monthYear = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlyData[monthYear] = { registrations: 0, conversions: 0 };
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    salesData.registrations.forEach(registration => {
      if (!isInDateRange(registration.attributes.createdAt)) return;
      if (salesPerson !== 'all' && 
          registration.attributes.sales_staff?.data?.id !== parseInt(salesPerson)) return;
      const date = new Date(registration.attributes.createdAt);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (monthlyData[monthYear]) monthlyData[monthYear].registrations += 1;
    });

    salesData.registrations.forEach(registration => {
      if (!isInDateRange(registration.attributes.createdAt)) return;
      if (registration.attributes.status !== 'confirmed') return;
      if (salesPerson !== 'all' && 
          registration.attributes.sales_staff?.data?.id !== parseInt(salesPerson)) return;
      const date = new Date(registration.attributes.createdAt);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (monthlyData[monthYear]) monthlyData[monthYear].conversions += 1;
    });

    return Object.keys(monthlyData).map(monthYear => {
      const { registrations, conversions } = monthlyData[monthYear];
      const rate = registrations ? (conversions / registrations * 100).toFixed(1) : 0;
      return { name: monthYear, registrations, conversions, rate: parseFloat(rate) };
    });
  };

  // 處理銷售人員業績的數據 → ECharts bar series 資料（只統計成交的互動紀錄）
  const prepareSalesPerformanceData = () => {
    const staffPerformance = {};

    // 改讀 deals 表:每筆皆為成交,依成交日期判斷是否落在區間
    salesData.interactions.forEach(interaction => {
      const dealDate = interaction.attributes.deal_date || interaction.attributes.createdAt;
      if (!isInDateRange(dealDate)) return;

      const staffId = interaction.attributes.sales_staff?.data?.id;
      if (!staffId) return;
      if (salesPerson !== 'all' && staffId !== parseInt(salesPerson)) return;

      const staffName = interaction.attributes.sales_staff?.data?.attributes?.name || interaction.attributes.sales_staff?.data?.attributes?.username || `員工${staffId}`;
      if (!staffPerformance[staffId]) {
        staffPerformance[staffId] = { name: staffName, deals: 0, amount: 0 };
      }
      const dealAmount = parseFloat(interaction.attributes.deal_amount || 0) || 0;
      staffPerformance[staffId].deals += 1;
      staffPerformance[staffId].amount += dealAmount;
    });

    // 依成交數排序，利於閱讀
    return Object.values(staffPerformance).sort((a, b) => b.deals - a.deals);
  };

  // 轉為 YYYYMMDD key（不受時區影響，支援 YYYY-MM-DD / YYYY/MM/DD / ISO）
  const toDateKey = (val) => {
    if (!val) return null;
    const s = String(val).split('T')[0].replace(/\D/g, ''); // 只留數字
    if (s.length >= 8) return s.slice(0, 8); // YYYYMMDD
    return null;
  };

  const isInDateRange = (dateString) => {
    if (!dateString) return false;
    // 任一日期未填 → 視為全期間（不限制）
    if (!dateRange.startDate || !dateRange.endDate) return true;
    const k = toDateKey(dateString);
    const ks = toDateKey(dateRange.startDate);
    const ke = toDateKey(dateRange.endDate);
    if (!k) return false;
    if (!ks || !ke) return true;
    return k >= ks && k <= ke;
  };

  const stats = getTotalStats();
  const customerSourceData = prepareCustomerSourceData();
  const conversionRateData = prepareConversionRateData();
  const salesPerformanceData = prepareSalesPerformanceData();

  function getTotalStats() {
    let totalRegistrations = 0;
    let totalCustomers = 0;
    let totalConversions = 0;
    
    // 總報名數與已轉換數：不套日期篩選，但尊重銷售人員
    salesData.registrations.forEach(registration => {
      if (salesPerson !== 'all' && registration.attributes.sales_staff?.data?.id !== parseInt(salesPerson)) return;
      totalRegistrations += 1;
      if (registration.attributes.status === 'confirmed') totalConversions += 1;
    });
    
    // 總客戶數：不套日期篩選，但尊重銷售人員
    salesData.customers.forEach(customer => {
      if (salesPerson !== 'all' && customer.attributes.sales_staff?.data?.id !== parseInt(salesPerson)) return;
      totalCustomers += 1;
    });
    
    const conversionRate = totalRegistrations ? (totalConversions / totalRegistrations * 100).toFixed(1) : 0;
    return { totalRegistrations, totalCustomers, totalConversions, conversionRate };
  }

  const handleDateStartChange = (e) => setDateRange({ ...dateRange, startDate: e.target.value });
  const handleDateEndChange = (e) => setDateRange({ ...dateRange, endDate: e.target.value });

  // -------- ECharts Options --------
  const totalCustomersForSource = customerSourceData.reduce((acc, cur) => acc + (cur.value || 0), 0);

  const sourceDonutOption = {
    tooltip: {
      trigger: 'item',
      formatter: (p) => `${(p.name === 'event' ? '活動' : p.name === 'website' ? '網站' : p.name === 'referral' ? '推薦' : '其他')}<br/>${p.value ?? 0} 人（${((p.percent || 0)).toFixed ? (p.percent).toFixed(0) : p.percent}%）`
    },
    legend: { orient: 'vertical', right: 0, top: 'middle' },
    series: [
      {
        name: '來源',
        type: 'pie',
        radius: ['50%', '76%'],
        center: ['38%', '50%'],
        label: { show: true, position: 'inner', formatter: (p) => `${(p.name === 'event' ? '活動' : p.name === 'website' ? '網站' : p.name === 'referral' ? '推薦' : '其他')}` },
        labelLine: { show: false },
        data: customerSourceData.map(d => ({ name: d.name, value: d.value }))
      }
    ],
    graphic: [{
      type: 'text', left: '38%', top: 'middle',
      style: { text: `總客戶數\n${totalCustomersForSource}`, textAlign: 'center', fill: '#595959', fontSize: 14 }
    }]
  };

  const performanceBarOption = {
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const [deals, amount] = params;
        const dealText = `成交數：${deals?.data ?? 0}`;
        const amountText = `成交金額：${(amount?.data ?? 0).toLocaleString()}`;
        return `${deals?.axisValueLabel}<br/>${dealText}<br/>${amountText}`;
      }
    },
    grid: { left: 48, right: 48, top: 52, bottom: 42, containLabel: true },
    xAxis: { type: 'category', data: salesPerformanceData.map(d => d.name) },
    yAxis: [
      { type: 'value', name: '成交數' },
      { type: 'value', name: '成交金額', position: 'right', axisLabel: { formatter: (v) => `${Number(v).toLocaleString()}` } }
    ],
    legend: { bottom: 0 },
    series: [
      { name: '成交數', type: 'bar', data: salesPerformanceData.map(d => d.deals), itemStyle: { color: '#82ca9d' }, yAxisIndex: 0 },
      { name: '成交金額', type: 'bar', data: salesPerformanceData.map(d => d.amount), itemStyle: { color: '#8884d8' }, yAxisIndex: 1 }
    ]
  };

  const trendLineOption = {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 12 },
    grid: { left: 40, right: 50, top: 30, bottom: 90, containLabel: true },
    xAxis: { type: 'category', data: conversionRateData.map(d => d.name), axisLabel: { margin: 16 } },
    yAxis: [{ type: 'value', name: '數量', nameGap: 28 }],
    series: [
      { name: '報名數', type: 'line', data: conversionRateData.map(d => d.registrations), smooth: true, yAxisIndex: 0, lineStyle: { color: '#8884d8' } },
      { name: '轉換數', type: 'line', data: conversionRateData.map(d => d.conversions), smooth: true, yAxisIndex: 0, lineStyle: { color: '#82ca9d' } }
    ]
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
                    <Option value="all">全部期間</Option>
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
                    <input type="date" className={styles.dateInput} value={dateRange.startDate} onChange={handleDateStartChange} />
                  </div>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={10} xl={10}>
                <Form.Item label="結束日期" className={styles.dateFormItem}>
                  <div className={styles.dateInputWrapper}>
                    <input type="date" className={styles.dateInput} value={dateRange.endDate} onChange={handleDateEndChange} />
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
              <Statistic title="總報名數" value={stats.totalRegistrations} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className={styles.statCard}>
              <Statistic title="總客戶數" value={stats.totalCustomers} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className={styles.statCard}>
              <Statistic title="已轉換數" value={stats.totalConversions} valueStyle={{ color: '#722ed1' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className={styles.statCard}>
              <Statistic title="轉換率" value={stats.conversionRate} suffix="%" precision={1} valueStyle={{ color: '#fa8c16' }} />
            </Card>
          </Col>
        </Row>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="客戶來源分布" className={styles.chartCard} loading={isLoading}>
              {customerSourceData.length === 0 ? (
                <div className={styles.noDataMessage}>選定時間範圍內沒有客戶數據</div>
              ) : (
                <ReactECharts option={sourceDonutOption} style={{ height: 300 }} notMerge lazyUpdate />
              )}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="銷售人員業績比較" className={`${styles.chartCard} ${styles.smallChart}`} loading={isLoading}>
              {salesPerformanceData.length === 0 ? (
                <div className={styles.noDataMessage}>沒有銷售人員數據可顯示</div>
              ) : (
                <ReactECharts option={performanceBarOption} notMerge lazyUpdate />
              )}
            </Card>
          </Col>
        </Row>
        
        <Row gutter={[16, 16]} className={styles.chartRow}>
          <Col span={24}>
            <Card title="報名和轉換趨勢" className={styles.chartCard} loading={isLoading}>
              {conversionRateData.length === 0 ? (
                <div className={styles.noDataMessage}>選定時間範圍內沒有報名數據</div>
              ) : (
                <ReactECharts option={trendLineOption} style={{ height: 360 }} notMerge lazyUpdate />
              )}
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default SalesAnalytics; 