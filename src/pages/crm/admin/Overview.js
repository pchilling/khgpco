import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Space, DatePicker, Select, Spin, Empty } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, UserOutlined, DollarOutlined, PieChartOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../../utils/api';
import { fetchAllStrapi } from '../../../utils/strapiPaginate';
import styles from './Overview.module.css';
import ReactECharts from 'echarts-for-react';

const { RangePicker } = DatePicker;

// 所有可能的客戶階段及對應顏色
// 僅使用 Customer.status 的真實枚舉值
const ALL_STAGES = {
  potential: { name: '潛在客戶', color: '#1890ff' },
  contacted: { name: '已聯繫', color: '#722ed1' },
  negotiating: { name: '洽談中', color: '#fa8c16' },
  closed: { name: '已成交', color: '#13c2c2' },
  lost: { name: '已流失', color: '#f5222d' }
};

const Overview = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    newCustomers: 0,
    totalDealAmount: 0,
    monthlyDealAmount: 0,
    conversionRate: 0,
    lastMonthConversionRate: 0
  });
  const [stageDistribution, setStageDistribution] = useState([]);
  const [dealTrend, setDealTrend] = useState([]);
  const [sourceDistribution, setSourceDistribution] = useState([]);
  // 新增：最近成交
  const [recentDeals, setRecentDeals] = useState([]);

  // 新增：篩選狀態（日期區間、業務）與業務清單
  const [dateRange, setDateRange] = useState(null); // [dayjs, dayjs]
  const [selectedStaffId, setSelectedStaffId] = useState(undefined);
  const [salesStaffList, setSalesStaffList] = useState([]);

  // 一個 useEffect 就夠 — 變更 dateRange 或 staff 篩選會自動重抓，mount 也算第一次
  useEffect(() => {
    fetchOverviewData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedStaffId]);

  // 載入員工選單
  useEffect(() => {
    const fetchSalesStaff = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/sales-staffs?pagination[pageSize]=1000`);
        const data = await resp.json();
        setSalesStaffList(data?.data || []);
      } catch (e) {
        console.error('fetch sales-staffs failed', e);
      }
    };
    fetchSalesStaff();
  }, []);

  // 修正首次進入總覽不顯示問題：在數據設置完成後觸發一次 resize 讓圖表重新計算
  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('resize'));
        }
      }, 0);
    }
  }, [loading]);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      // 只抓 Overview 實際需要的欄位，避免 populate=* 把媒體和巢狀關聯都拉回來
      const customersQuery = '/api/customers?'
        + 'fields[0]=createdAt&fields[1]=status&fields[2]=source'
        + '&populate[sales_staff][fields][0]=id'
        + '&populate[customer_source][fields][0]=name';
      // 成交改讀獨立的 deals 表(不再從 is_deal 聯絡紀錄)
      const dealsQuery = '/api/deals?'
        + 'fields[0]=deal_amount&fields[1]=payment_date&fields[2]=createdAt'
        + '&populate[customer][fields][0]=name'
        + '&populate[sales_staff][fields][0]=name&populate[sales_staff][fields][1]=username';
      const registrationsQuery = '/api/registrations?'
        + 'fields[0]=status&fields[1]=createdAt'
        + '&populate[sales_staff][fields][0]=id';

      const [customers, deals, registrations] = await Promise.all([
        fetchAllStrapi(API_BASE_URL, customersQuery),
        fetchAllStrapi(API_BASE_URL, dealsQuery),
        fetchAllStrapi(API_BASE_URL, registrationsQuery),
      ]);

      // 篩選條件處理（日期）— dateRange 可能是 dayjs object 或字串
      const toDate = (v) => {
        if (!v) return null;
        if (typeof v.toDate === 'function') return v.toDate();
        return new Date(v);
      };
      const hasRange = Array.isArray(dateRange) && dateRange[0] && dateRange[1];
      const rangeStart = hasRange ? toDate(dateRange[0]) : null;
      const rangeEnd = hasRange ? toDate(dateRange[1]) : null;
      if (rangeStart) { rangeStart.setHours(0,0,0,0); }
      if (rangeEnd) { rangeEnd.setHours(23,59,59,999); }

      const inRange = (dateStr, fallbackStr = null) => {
        if (!hasRange) return true;
        const dPrimary = dateStr ? new Date(dateStr) : null;
        const d = dPrimary && !isNaN(dPrimary) ? dPrimary : (fallbackStr ? new Date(fallbackStr) : null);
        if (!d || isNaN(d)) return false;
        return d >= rangeStart && d <= rangeEnd;
      };

      const byStaff = (entity) => {
        if (!selectedStaffId) return true;
        const id = entity?.attributes?.sales_staff?.data?.id;
        return id === selectedStaffId;
      };
      
      // 統一口徑與客戶資料庫一致：總客戶數只看 customers（全量，不受日期限制）
      const filteredCustomers = customers.filter(c => byStaff(c) && (!hasRange || inRange(c?.attributes?.createdAt)));

      // 交易資料：改讀 deals 表(每筆皆為成交,僅過濾金額 > 0)
      const dealItems = deals.filter(i => (
        (parseFloat(i?.attributes?.deal_amount) || 0) > 0
      ));

      // 總成交金額：全部 is_deal 合計（不受日期限制）
      const totalDealAmount = dealItems.reduce((sum, deal) => sum + (parseFloat(deal?.attributes?.deal_amount) || 0), 0);
      
      // 期間成交金額：payment_date 在範圍內；若無 payment_date 則回退 createdAt
      let periodDealAmount = 0;
      if (hasRange) {
        periodDealAmount = dealItems
          .filter(d => inRange(d?.attributes?.payment_date, d?.attributes?.createdAt))
          .reduce((s, d) => s + (parseFloat(d?.attributes?.deal_amount) || 0), 0);
      } else {
        // 本月
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodDealAmount = dealItems
          .filter(d => {
            const dPrimary = d?.attributes?.payment_date || d?.attributes?.createdAt;
            return new Date(dPrimary) >= monthStart;
          })
          .reduce((s, d) => s + (parseFloat(d?.attributes?.deal_amount) || 0), 0);
      }

      // 新增客戶數（期間或本月）
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const newCustomers = (hasRange ? filteredCustomers : customers).filter(c =>
        hasRange ? inRange(c?.attributes?.createdAt) : (new Date(c?.attributes?.createdAt) >= monthStart)
      ).length;

      // 轉換率：與銷售數據對齊 → 使用 registrations 的 confirmed/total（不套日期範圍，但尊重業務篩選）
      const regsByStaff = registrations.filter(r => byStaff(r));
      const totalRegistrations = regsByStaff.length;
      const totalConversions = regsByStaff.filter(r => r?.attributes?.status === 'confirmed').length;
      const conversionRate = totalRegistrations > 0 ? (totalConversions / totalRegistrations) * 100 : 0;

      // 階段分布（針對客戶）
      const stages = {};
      Object.keys(ALL_STAGES).forEach(stage => { stages[stage] = 0; });
      const baseCustomers = hasRange ? filteredCustomers : customers;
      baseCustomers.forEach(customer => {
        const status = customer?.attributes?.status;
        if (status && stages.hasOwnProperty(status)) stages[status]++;
      });
      const stageData = Object.entries(ALL_STAGES).map(([key, value]) => {
        const count = stages[key] || 0;
        const percentage = baseCustomers.length > 0 ? ((count / baseCustomers.length) * 100).toFixed(1) : '0.0';
        return { stage: value.name, count, percentage };
      });
      
      // 來源分布（針對客戶）
      const sourceCount = {};
      baseCustomers.forEach(customer => {
        const srcRaw = customer?.attributes?.source;
        const sourceMap = { 'event': '活動', 'website': '官網', 'referral': '渠道', 'other': '其他' };
        // 優先用動態來源名(customer_source),回退舊 enum
        const srcText = customer?.attributes?.customer_source?.data?.attributes?.name
          || (srcRaw ? (sourceMap[srcRaw] || '其他') : '其他');
        sourceCount[srcText] = (sourceCount[srcText] || 0) + 1;
      });
      const sourceData = Object.entries(sourceCount)
        .map(([source, count]) => ({ source, count, percentage: baseCustomers.length > 0 ? ((count / baseCustomers.length) * 100).toFixed(1) : '0.0' }))
        .sort((a, b) => b.count - a.count);

      // 成交趨勢（按月，依 payment_date，若無則 createdAt）
      const trendMap = {};
      dealItems
        .filter(d => !hasRange || inRange(d?.attributes?.payment_date, d?.attributes?.createdAt))
        .forEach(deal => {
          const dateRaw = deal?.attributes?.payment_date || deal?.attributes?.createdAt;
          const date = new Date(dateRaw);
          if (isNaN(date)) return;
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          trendMap[key] = (trendMap[key] || 0) + (parseFloat(deal?.attributes?.deal_amount) || 0);
        });
      const trendData = Object.entries(trendMap)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month));

      setStats({
        totalCustomers: customers.length, // 總客戶數：只看 customers，全量
        newCustomers,
        totalDealAmount,
        monthlyDealAmount: periodDealAmount,
        conversionRate,
        lastMonthConversionRate: 0
      });
      setStageDistribution(stageData);
      setSourceDistribution(sourceData);
      setDealTrend(trendData);

      // 最近成交 TOP 5
      const recent = [...dealItems]
        .sort((a, b) => new Date((b.attributes.payment_date || b.attributes.createdAt)) - new Date((a.attributes.payment_date || a.attributes.createdAt)))
        .slice(0, 5)
        .map(d => ({
          id: d.id,
          customer: d?.attributes?.customer?.data?.attributes?.name || '—',
          sales: d?.attributes?.sales_staff?.data?.attributes?.name || d?.attributes?.sales_staff?.data?.attributes?.username || '—',
          amount: Number(d?.attributes?.deal_amount || 0),
          date: d?.attributes?.payment_date || d?.attributes?.createdAt || ''
        }));
      setRecentDeals(recent);

    } catch (error) {
      console.error('Error fetching overview data:', error);
      console.error('Error details:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getSourceText = (source) => {
    const sourceMap = { 'event': '活動', 'website': '網站', 'referral': '推薦', 'other': '其他' };
    return sourceMap[source] || '其他';
  };

  const toWan = (amount) => Number(((Number(amount) || 0) / 10000).toFixed(1));
  const periodLabel = dateRange ? '期間' : '本月';

  // 顏色固定，提升辨識
  const stageColorMap = {
    潛在客戶: '#1890ff',
    已聯繫: '#722ed1',
    洽談中: '#fa8c16',
    已成交: '#13c2c2',
    已流失: '#f5222d',
  };

  const stageBarData = (stageDistribution || []).map((d) => ({
    stageLabel: d.stage || '—',
    count: Number(d.count || 0),
    percentage: d.percentage || '0.0',
  }));

  const stageBarOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = params && params[0];
        const name = p?.name || '—';
        const count = p?.value ?? 0;
        const rec = stageBarData.find((d) => d.stageLabel === name) || {};
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

  const totalCustomersForSource = (sourceDistribution || []).reduce(
    (acc, d) => acc + Number(d?.count || 0),
    0
  );
  const sourceData = (sourceDistribution || [])
    .filter((d) => d && d.source)
    .map((d) => ({
      source: d.source || '未知',
      count: Number(d.count || 0),
      percentage: d.percentage || '0.0',
    }));

  const sourceDonutOption = {
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        const name = p?.name || '未知';
        const count = p?.value ?? 0;
        const rec = sourceData.find((d) => d.source === name) || {};
        const percentage = rec.percentage || '0.0';
        return `${name}<br/>${count} 人（${percentage}%）`;
    }
    },
    legend: {
      orient: 'vertical', right: 0, top: 'middle', type: 'scroll',
      // 圖例直接標出每個來源的人數,即使圓餅上細到看不見也能看到(例如 test 1人)
      formatter: (name) => {
        const rec = sourceData.find((d) => d.source === name) || {};
        return `${name}  ${rec.count ?? 0}人`;
      },
    },
    series: [
      {
        name: '來源',
        type: 'pie',
        radius: ['50%', '76%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: false,
        // 只在佔比夠大的塊上顯示標籤,避免一堆小塊標籤疊在一起看不清
        label: {
          show: true,
          position: 'inner',
          formatter: (p) => (p?.percent >= 5 ? `${p?.name}\n${p?.value} 人` : ''),
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

  const columnConfig = {
    data: (dealTrend || []).map(d => ({ month: d?.month || '', amount: Number(d?.amount || 0) })),
    xField: 'month',
    yField: 'amount',
    label: { position: 'top', style: { fill: '#666', fontSize: 12 }, formatter: (v) => `${((Number(v.amount || 0)) / 10000).toFixed(1)}萬` },
    meta: { month: { alias: '月份' }, amount: { alias: '成交金額' } },
    xAxis: { label: { autoRotate: true, autoHide: false, autoEllipsis: true } },
    color: '#1890ff'
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>總覽</h2>
        <Space size="middle" wrap>
          <div className={styles.dateInputWrapper}>
            {(() => {
              const startEmpty = !Array.isArray(dateRange) || !dateRange[0];
              return (
                <div className={`${styles.dateAffix} ${startEmpty ? styles.dateEmpty : ''} ant-input-affix-wrapper`} style={{ width: 200, position: 'relative' }}>
                  <input
                    type="date"
                    className={`ant-input ${styles.dateInput}`}
                    value={Array.isArray(dateRange) && dateRange[0] ? (dateRange[0]?.format ? dateRange[0].format('YYYY-MM-DD') : dateRange[0]) : ''}
                    onChange={(e) => setDateRange([e.target.value || null, Array.isArray(dateRange) ? dateRange[1] : null])}
                  />
                  {startEmpty && (
                    <span className={styles.datePlaceholder}>開始日期</span>
                  )}
                </div>
              );
            })()}
          </div>
          <div className={styles.dateInputWrapper}>
            {(() => {
              const endEmpty = !Array.isArray(dateRange) || !dateRange[1];
              return (
                <div className={`${styles.dateAffix} ${endEmpty ? styles.dateEmpty : ''} ant-input-affix-wrapper`} style={{ width: 200, position: 'relative' }}>
                  <input
                    type="date"
                    className={`ant-input ${styles.dateInput}`}
                    value={Array.isArray(dateRange) && dateRange[1] ? (dateRange[1]?.format ? dateRange[1].format('YYYY-MM-DD') : dateRange[1]) : ''}
                    onChange={(e) => setDateRange([Array.isArray(dateRange) ? dateRange[0] : null, e.target.value || null])}
                  />
                  {endEmpty && (
                    <span className={styles.datePlaceholder}>結束日期</span>
                  )}
                </div>
              );
            })()}
          </div>
          <Select placeholder="選擇業務員" style={{ width: 200 }} allowClear value={selectedStaffId} onChange={(v) => setSelectedStaffId(v)}>
            {salesStaffList.map(staff => (
              <Select.Option key={staff.id} value={staff.id}>
                {staff?.attributes?.name || staff?.attributes?.username || `業務 ${staff.id}`}
              </Select.Option>
            ))}
          </Select>
        </Space>
      </div>

      <Spin spinning={loading} tip="載入中...">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card className={styles.statCard}>
            <Statistic title="總客戶數" value={stats.totalCustomers} prefix={<UserOutlined style={{ color: '#1890ff' }} />} />
            <div className={styles.smallText}>本{dateRange ? '期' : '月'}新增: {stats.newCustomers}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className={styles.statCard}>
            <Statistic title="總成交金額" value={toWan(stats.totalDealAmount)} precision={1} suffix="萬" prefix={<DollarOutlined style={{ color: '#52c41a' }} />} />
            <div className={styles.smallText}>{dateRange ? '期間' : '本月'}成交: {toWan(stats.monthlyDealAmount).toFixed(1)} 萬</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className={styles.statCard}>
            <Statistic title="轉換率" value={stats.conversionRate} precision={2} suffix="%" prefix={<PieChartOutlined style={{ color: '#722ed1' }} />} />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} lg={12}>
          <Card title="客戶階段分布" className={styles.chartCard}>
            {stageBarData.length > 0 ? (
              <ReactECharts option={stageBarOption} style={{ height: 320 }} notMerge lazyUpdate />
            ) : (
              <Empty />
            )}
                </Card>
              </Col>
          <Col xs={24} lg={12}>
            <Card title="客戶來源分布" className={styles.chartCard}>
              {sourceData.length > 0 ? (
                <ReactECharts option={sourceDonutOption} style={{ height: 320 }} notMerge lazyUpdate />
              ) : (
                <Empty />
              )}
                </Card>
              </Col>
            </Row>
            
        <Row gutter={[16,16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="最近成交">
              {recentDeals.length === 0 ? (
                <Empty />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.simpleTable}>
                    <thead>
                      <tr>
                        <th>日期</th>
                        <th>客戶</th>
                        <th>業務</th>
                        <th>金額（萬）</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentDeals.map(d => (
                        <tr key={d.id}>
                          <td>{d.date}</td>
                          <td>{d.customer}</td>
                          <td>{d.sales}</td>
                          <td>{(d.amount/10000).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
      </Card>
        </Col>
      </Row>
      </Spin>
    </div>
  );
};

export default Overview; 