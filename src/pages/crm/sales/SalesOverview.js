import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Space, Spin, Empty, message, DatePicker } from 'antd';
import { UserOutlined, InteractionOutlined, DollarOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { API_BASE_URL } from '../../../utils/api';
import { fetchAllStrapi } from '../../../utils/strapiPaginate';
import styles from './SalesOverview.module.css';

// 所有可能的客戶階段及對應顏色
// 僅使用 Customer.status 的真實枚舉值
const ALL_STAGES = {
  potential: { name: '潛在客戶', color: '#1890ff' },
  contacted: { name: '已聯繫', color: '#722ed1' },
  negotiating: { name: '洽談中', color: '#fa8c16' },
  closed: { name: '已成交', color: '#13c2c2' },
  lost: { name: '已流失', color: '#f5222d' }
};

const SalesOverview = () => {
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState({
    totalCustomers: 0,
    totalInteractions: 0,
    totalDeals: 0,
    totalRevenue: 0,
    customerStages: [],
    customerSources: []
  });
  const [dateRange, setDateRange] = useState(null); // [dayjs, dayjs]
  const { RangePicker } = DatePicker;

  // 獲取當前登入用戶資訊
  const getCurrentUser = () => {
    const userStr = localStorage.getItem('salesStaff');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('解析用戶資訊失敗:', error);
        return null;
      }
    }
    return null;
  };

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        message.error('未找到用戶資訊，請重新登入');
        return;
      }

      // 獲取該銷售人員的所有客戶與互動（兩個 list 並行抓，每個內部分頁也並行）
      const [customers, interactions] = await Promise.all([
        fetchAllStrapi(API_BASE_URL, `/api/customers?filters[sales_staff][id]=${currentUser.id}&populate=sales_staff`),
        fetchAllStrapi(API_BASE_URL, `/api/interactions?filters[sales_staff][id]=${currentUser.id}&populate=customer,sales_staff`),
      ]);

      const hasRange = Array.isArray(dateRange) && dateRange[0] && dateRange[1];
      const rangeStart = hasRange ? new Date(dateRange[0].startOf('day').toDate()) : null;
      const rangeEnd = hasRange ? new Date(dateRange[1].endOf('day').toDate()) : null;
      const inRange = (dateStr) => {
        if (!hasRange) return true;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d >= rangeStart && d <= rangeEnd;
      };
      
      // 階段分布
      const stages = {}; Object.keys(ALL_STAGES).forEach(s => stages[s] = 0);
      customers.forEach(c => { const s = c?.attributes?.status; if (s && stages.hasOwnProperty(s)) stages[s]++; });
      const customerStages = Object.entries(ALL_STAGES).map(([k, v]) => {
        const count = stages[k] || 0; const percentage = customers.length > 0 ? ((count / customers.length) * 100).toFixed(1) : '0.0';
        return { stage: v.name, count, percentage };
      });

      // 來源分布
      const sourceCount = {};
      customers.forEach(c => { const src = c?.attributes?.source; const txt = src ? getSourceText(src) : '其他'; sourceCount[txt] = (sourceCount[txt] || 0) + 1; });
      const customerSources = Object.entries(sourceCount).map(([source, count]) => ({ source, count, percentage: customers.length > 0 ? ((count / customers.length) * 100).toFixed(1) : '0.0' })).sort((a,b)=>b.count-a.count);

      // 成交相關（依日期範圍）
      const deals = interactions.filter(i => i?.attributes?.is_deal && i?.attributes?.deal_amount && (!hasRange || inRange(i?.attributes?.payment_date)));
      const totalRevenue = deals.reduce((s, d) => s + (parseFloat(d?.attributes?.deal_amount) || 0), 0);
      const totalDeals = deals.length;

      setOverviewData({
        totalCustomers: customers.length,
        totalInteractions: interactions.filter(i => !hasRange || inRange(i?.attributes?.date)).length,
        totalDeals,
        totalRevenue,
        customerStages,
        customerSources
      });
    } catch (error) {
      console.error('獲取總覽資料失敗:', error);
      message.error('獲取資料失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 一個 useEffect 就夠 — dateRange 變更會自動重抓，mount 也算第一次
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchOverviewData(); }, [dateRange]);

  // 修正首次進入總覽不顯示：數據載入完成後強制觸發一次 resize 讓圖表重算尺寸
  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('resize'));
        }
      }, 0);
    }
  }, [loading]);

  const getSourceText = (source) => {
    const sourceMap = { 'website': '官網', 'referral': '轉介紹', 'social_media': '社群媒體', 'event': '活動', 'advertisement': '廣告', 'other': '其他', 'unknown': '未知' };
    return sourceMap[source] || source;
  };

  const toWan = (amount) => Number(((Number(amount) || 0) / 10000).toFixed(1));

  // 色盤與資料轉換
  const stageColorMap = {
    潛在客戶: '#1890ff',
    已聯繫: '#722ed1',
    洽談中: '#fa8c16',
    已成交: '#13c2c2',
    已流失: '#f5222d'
  };

  const stageBarData = (overviewData.customerStages || []).map(d => ({
    stageLabel: d.stage || '—',
    count: Number(d.count || 0),
    percentage: d.percentage || '0.0'
  }));

  const stageBarOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = params && params[0];
        const name = p?.name || '—';
        const count = p?.value ?? 0;
        const rec = stageBarData.find(d => d.stageLabel === name) || {};
        const percentage = rec.percentage || '0.0';
        return `${name}<br/>${count} 人（${percentage}%）`;
      }
    },
    grid: { left: 120, right: 40, top: 10, bottom: 10, containLabel: true },
    xAxis: { type: 'value', boundaryGap: [0, 0.01] },
    yAxis: { type: 'category', data: stageBarData.map(d => d.stageLabel) },
    series: [
      {
        type: 'bar',
        data: stageBarData.map(d => d.count),
        itemStyle: {
          color: (p) => {
            const label = stageBarData[p.dataIndex]?.stageLabel;
            return stageColorMap[label] || '#91caff';
          },
          borderRadius: [4, 4, 4, 4]
        },
        label: {
          show: true,
          position: 'right',
          formatter: (p) => {
            const rec = stageBarData[p.dataIndex] || {};
            return `${rec.count || 0} 人（${rec.percentage || '0.0'}%）`;
          }
        }
      }
    ]
  };

  const sourceData = (overviewData.customerSources || []).map(d => ({
    source: d.source || '未知',
    count: Number(d.count || 0),
    percentage: d.percentage || '0.0'
  }));

  const totalCustomersForSource = sourceData.reduce((a, b) => a + (b.count || 0), 0);

  const sourceDonutOption = {
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        const name = p?.name || '未知';
        const count = p?.value ?? 0;
        const rec = sourceData.find(d => d.source === name) || {};
        const percentage = rec.percentage || '0.0';
        return `${name}<br/>${count} 人（${percentage}%）`;
      }
    },
    legend: { orient: 'vertical', right: 0, top: 'middle' },
    series: [
      {
        name: '來源',
        type: 'pie',
        radius: ['50%', '76%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'inner',
          formatter: (p) => `${p?.name || '未知'}\n${p?.value ?? 0} 人`,
          fontSize: 12
        },
        labelLine: { show: false },
        data: sourceData.map(d => ({ name: d.source, value: d.count }))
      }
    ],
    graphic: [{
      type: 'text',
      left: '38%',
      top: 'middle',
      style: {
        text: `總客戶數\n${totalCustomersForSource}`,
        textAlign: 'center',
        fill: '#595959',
        fontSize: 14
      }
    }]
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div className={styles.overview}>
      <div className={styles.overviewContainer}>
        <div className={styles.pageTitle}>
          <h2>銷售總覽</h2>
        </div>
        <Space style={{ marginBottom: 16 }}>
          <RangePicker onChange={(range) => setDateRange(range)} />
        </Space>
        
        <Row gutter={[16, 16]} className={styles.statsCards}>
          <Col xs={24} sm={12} md={8}>
            <Card className={styles.statCard}>
            <Statistic
                title="總客戶數"
                value={overviewData.totalCustomers}
              prefix={<UserOutlined />}
                valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
          <Col xs={24} sm={12} md={8}>
            <Card className={styles.statCard}>
            <Statistic
                title="總互動次數"
                value={overviewData.totalInteractions}
                prefix={<InteractionOutlined />}
                valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
          <Col xs={24} sm={12} md={8}>
            <Card className={styles.statCard}>
            <Statistic
              title="成交金額"
                value={toWan(overviewData.totalRevenue)}
                precision={1}
                suffix="萬"
              prefix={<DollarOutlined />}
                valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className={styles.chartsRow}>
        <Col xs={24} md={12}>
          <Card title="客戶階段分布" className={styles.chartCard}>
            {overviewData.customerStages.length > 0 ? (
              <ReactECharts option={stageBarOption} style={{ height: 320 }} notMerge lazyUpdate />
            ) : (
              <div className={styles.emptyChartContainer}>
                <Empty description="暫無數據" />
              </div>
              )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="客戶來源分布" className={styles.chartCard}>
            {overviewData.customerSources.length > 0 ? (
              <ReactECharts option={sourceDonutOption} style={{ height: 320 }} notMerge lazyUpdate />
            ) : (
              <div className={styles.emptyChartContainer}>
                <Empty description="暫無數據" />
              </div>
              )}
          </Card>
        </Col>
      </Row>
      </div>
    </div>
  );
};

export default SalesOverview; 