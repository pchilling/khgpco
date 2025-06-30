import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, List, Tag, DatePicker, Progress } from 'antd';
import { 
  UserOutlined, 
  PhoneOutlined, 
  ClockCircleOutlined, 
  DollarOutlined,
  ArrowUpOutlined
} from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import moment from 'moment';
import axios from 'axios';
import { API_BASE_URL } from '../../../utils/api';

const { RangePicker } = DatePicker;

const SalesOverview = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState([moment().startOf('month'), moment()]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeDeals: 0,
    totalAmount: 0,
    conversionRate: 0
  });
  const [interactions, setInteractions] = useState([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState([]);
  const [performanceTrend, setPerformanceTrend] = useState([]);
  const [customerStages, setCustomerStages] = useState([]);

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

  const fetchSalesData = async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        console.error('未找到用戶資訊');
        setLoading(false);
        return;
      }

      console.log('當前用戶:', currentUser);
      console.log('日期範圍:', dateRange[0].format('YYYY-MM-DD'), '到', dateRange[1].format('YYYY-MM-DD'));

      // 獲取該銷售的所有互動記錄
      const url = `${API_BASE_URL}/api/interactions?filters[sales_staff][id]=${currentUser.id}&filters[date][$gte]=${dateRange[0].format('YYYY-MM-DD')}&filters[date][$lte]=${dateRange[1].format('YYYY-MM-DD')}&populate[]=customer&populate[]=project`;
      
      console.log('請求 URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API 回應:', data);
      
      const interactions = data.data || [];
      
      // 計算統計數據
      const uniqueCustomers = new Set(interactions.map(i => i.attributes.customer?.data?.id));
      const deals = interactions.filter(i => i.attributes.is_deal);
      const uniqueDeals = new Set(deals.map(i => i.attributes.customer?.data?.id));
      const totalAmount = deals.reduce((sum, i) => sum + (parseFloat(i.attributes.deal_amount) || 0), 0);
      
      // 計算進行中的交易
      const activeDeals = interactions.filter(i => 
        i.attributes.is_deal && 
        ['negotiating', 'contract_signed'].includes(i.attributes.status)
      ).length;

      setStats({
        totalCustomers: uniqueCustomers.size,
        activeDeals,
        totalAmount,
        conversionRate: (uniqueDeals.size / uniqueCustomers.size * 100) || 0
      });

      // 設置最近互動記錄
      setInteractions(interactions);

      // 獲取待跟進客戶
      const followUps = interactions.filter(i => 
        i.attributes.next_follow_up && 
        moment(i.attributes.next_follow_up).isAfter(moment())
      ).sort((a, b) => moment(a.attributes.next_follow_up) - moment(b.attributes.next_follow_up));
      
      setUpcomingFollowUps(followUps);

      // 生成業績趨勢數據
      const trendData = {};
      const days = dateRange[1].diff(dateRange[0], 'days') + 1;
      
      for (let i = 0; i < days; i++) {
        const date = moment(dateRange[0]).add(i, 'days').format('YYYY-MM-DD');
        trendData[date] = {
          date,
          amount: 0,
          interactions: 0
        };
      }

      interactions.forEach(i => {
        const date = moment(i.attributes.date).format('YYYY-MM-DD');
        if (trendData[date]) {
          trendData[date].interactions += 1;
          if (i.attributes.is_deal) {
            trendData[date].amount += parseFloat(i.attributes.deal_amount) || 0;
          }
        }
      });

      setPerformanceTrend(Object.values(trendData));

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
      console.error('Error fetching sales data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [dateRange]);

  // 渲染業績趨勢圖表
  const renderTrendChart = () => {
    const config = {
      data: performanceTrend,
      xField: 'date',
      yField: 'amount',
      seriesField: 'type',
      point: {
        size: 5,
        shape: 'diamond'
      }
    };

    return <Line {...config} />;
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

  const getStatusColor = (status) => {
    const colors = {
      'initial_contact': 'blue',
      'following_up': 'cyan',
      'negotiating': 'orange',
      'contract_signed': 'gold',
      'payment_received': 'green',
      'completed': 'green',
      'cancelled': 'red'
    };
    return colors[status] || 'default';
  };

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
              title="我的客戶數"
              value={stats.totalCustomers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="進行中交易"
              value={stats.activeDeals}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="成交金額"
              value={stats.totalAmount}
              precision={2}
              prefix={<DollarOutlined />}
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
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="業績趨勢">
            {renderTrendChart()}
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
          <Card title="待跟進客戶">
            <List
              dataSource={upcomingFollowUps}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={`${item.attributes.customer?.data?.attributes?.name || '未知客戶'}`}
                    description={
                      <>
                        <Tag color={getStatusColor(item.attributes.status)}>
                          {item.attributes.status}
                        </Tag>
                        下次跟進: {moment(item.attributes.next_follow_up).format('YYYY-MM-DD')}
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
        <Col span={12}>
          <Card title="最近互動">
            <List
              dataSource={interactions.slice(0, 5)}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={`${item.attributes.customer?.data?.attributes?.name || '未知客戶'} - ${item.attributes.type}`}
                    description={
                      <>
                        <Tag color={getStatusColor(item.attributes.status)}>
                          {item.attributes.status}
                        </Tag>
                        {moment(item.attributes.date).format('YYYY-MM-DD HH:mm')}
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

export default SalesOverview; 