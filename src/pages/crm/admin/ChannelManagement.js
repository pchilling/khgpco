import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Form, Input, Select, Switch, Tabs, Tooltip, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, ApartmentOutlined, ContactsOutlined, BarChartOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { API_BASE_URL } from '../../../utils/api';
import { fetchAllStrapi } from '../../../utils/strapiPaginate';

const { Option } = Select;
const { TextArea } = Input;

// 顯示用對照表（存的是英文 key，畫面顯示中文）
const COMPANY_TYPE = { agency: '仲介', reseller: '代銷', partner: '異業合作', other: '其他' };
const COOP_STATUS = { active: { text: '合作中', color: 'green' }, paused: { text: '暫停', color: 'orange' }, negotiating: { text: '洽談中', color: 'blue' } };
const PERSON_IDENTITY = { agent: '仲介業務', reseller_rep: '代銷跑單', referral: '老客戶轉介', employee_friend: '員工親友', other: '其他' };

const ChannelManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [people, setPeople] = useState([]);
  const [salesStaff, setSalesStaff] = useState([]);
  const [loading, setLoading] = useState(false);

  const [companyModal, setCompanyModal] = useState(false);
  const [personModal, setPersonModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [companyForm] = Form.useForm();
  const [personForm] = Form.useForm();

  const [companySearch, setCompanySearch] = useState('');
  const [personSearch, setPersonSearch] = useState('');

  // 成效統計
  const [statsPerson, setStatsPerson] = useState([]);
  const [statsCompany, setStatsCompany] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);

  // 佣金結算
  const [commissions, setCommissions] = useState([]);
  const [commLoading, setCommLoading] = useState(false);
  const [commLoaded, setCommLoaded] = useState(false);
  const [commMonth, setCommMonth] = useState('all');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cRes, pRes, sRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/channel-companies?populate=*&pagination[pageSize]=1000&sort=createdAt:desc`),
        fetch(`${API_BASE_URL}/api/channel-people?populate=*&pagination[pageSize]=1000&sort=createdAt:desc`),
        fetch(`${API_BASE_URL}/api/sales-staffs?pagination[pageSize]=1000`),
      ]);
      if (!cRes.ok || !pRes.ok) throw new Error(`載入失敗 (${cRes.status}/${pRes.status})`);
      const [c, p, s] = await Promise.all([cRes.json(), pRes.json(), sRes.json()]);
      setCompanies(c.data || []);
      setPeople(p.data || []);
      setSalesStaff(s.data || []);
    } catch (e) {
      console.error(e);
      message.error(`載入渠道資料失敗：${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const staffName = (staff) => staff?.attributes?.name || staff?.attributes?.username || `業務 ${staff?.id}`;

  // 載入並計算渠道成效(切到統計分頁時才跑,避免每次開頁都撈大量資料)
  const loadStats = async () => {
    if (statsLoaded || statsLoading) return;
    setStatsLoading(true);
    try {
      // 客戶(帶 channel_person)＋ 成交聯絡紀錄(帶 customer)全量撈
      const [customers, deals] = await Promise.all([
        fetchAllStrapi(API_BASE_URL, '/api/customers?filters[channel_person][id][$notNull]=true&populate[channel_person][fields][0]=name'),
        fetchAllStrapi(API_BASE_URL, '/api/interactions?filters[is_deal][$eq]=true&populate[customer][fields][0]=name'),
      ]);

      // 客戶 → 渠道人員 對照
      const custToChannel = {};
      const broughtByPerson = {}; // personId -> 帶客數
      customers.forEach(c => {
        const cpId = c.attributes?.channel_person?.data?.id;
        if (cpId) {
          custToChannel[c.id] = cpId;
          broughtByPerson[cpId] = (broughtByPerson[cpId] || 0) + 1;
        }
      });

      // 成交:金額加總 + 成交客戶集合(轉化率用)
      const amountByPerson = {};
      const dealCustByPerson = {}; // personId -> Set(customerId)
      deals.forEach(d => {
        const custId = d.attributes?.customer?.data?.id;
        const cpId = custToChannel[custId];
        if (!cpId) return;
        amountByPerson[cpId] = (amountByPerson[cpId] || 0) + (parseFloat(d.attributes?.deal_amount || 0) || 0);
        if (!dealCustByPerson[cpId]) dealCustByPerson[cpId] = new Set();
        dealCustByPerson[cpId].add(custId);
      });

      // 人員層
      const personRows = people.map(p => {
        const brought = broughtByPerson[p.id] || 0;
        const dealCust = dealCustByPerson[p.id] ? dealCustByPerson[p.id].size : 0;
        const amount = amountByPerson[p.id] || 0;
        return {
          id: p.id,
          name: p.attributes?.name,
          company: p.attributes?.channel_company?.data?.attributes?.name || '（獨立）',
          companyId: p.attributes?.channel_company?.data?.id || null,
          brought,
          dealCust,
          amount,
          rate: brought > 0 ? (dealCust / brought) : 0,
        };
      }).filter(r => r.brought > 0 || r.amount > 0)
        .sort((a, b) => b.amount - a.amount || b.brought - a.brought);

      // 公司層(彙總旗下人員)
      const compMap = {};
      personRows.forEach(r => {
        const key = r.companyId || `__solo_${r.id}`;
        if (!compMap[key]) compMap[key] = { name: r.companyId ? r.company : '（獨立介紹人）', brought: 0, dealCust: 0, amount: 0 };
        compMap[key].brought += r.brought;
        compMap[key].dealCust += r.dealCust;
        compMap[key].amount += r.amount;
      });
      const companyRows = Object.entries(compMap).map(([key, v]) => ({
        key, ...v, rate: v.brought > 0 ? (v.dealCust / v.brought) : 0,
      })).sort((a, b) => b.amount - a.amount || b.brought - a.brought);

      setStatsPerson(personRows);
      setStatsCompany(companyRows);
      setStatsLoaded(true);
    } catch (e) {
      console.error(e);
      message.error(`載入成效統計失敗：${e.message}`);
    } finally {
      setStatsLoading(false);
    }
  };

  const fmtAmount = (n) => n ? `NT$${Number(n).toLocaleString()}` : '—';
  const fmtRate = (r) => `${(r * 100).toFixed(1)}%`;

  // 佣金月報:撈所有已登記佣金的成交紀錄
  const loadCommissions = async () => {
    if (commLoaded || commLoading) return;
    setCommLoading(true);
    try {
      const rows = await fetchAllStrapi(
        API_BASE_URL,
        '/api/interactions?filters[commission_channel_person_id][$notNull]=true&populate=customer&sort=date:desc'
      );
      setCommissions(rows);
      setCommLoaded(true);
    } catch (e) {
      console.error(e);
      message.error(`載入佣金資料失敗：${e.message}`);
    } finally {
      setCommLoading(false);
    }
  };

  const commMonthOf = (r) => (r.attributes?.deal_date || r.attributes?.date || '').slice(0, 7);

  const markSettled = async (row) => {
    try {
      const settleMonth = commMonthOf(row);
      const res = await fetch(`${API_BASE_URL}/api/interactions/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { commission_settle_status: 'settled', commission_settle_month: settleMonth } }),
      });
      if (!res.ok) throw new Error(`結算失敗 (${res.status})`);
      setCommissions(prev => prev.map(r => r.id === row.id
        ? { ...r, attributes: { ...r.attributes, commission_settle_status: 'settled', commission_settle_month: settleMonth } }
        : r));
      message.success('已標記結算');
    } catch (e) {
      message.error(`結算失敗：${e.message}`);
    }
  };

  // ---------- 渠道公司 ----------
  const openCompany = (record = null) => {
    setEditingId(record ? record.id : null);
    if (record) {
      const a = record.attributes;
      companyForm.setFieldsValue({
        name: a.name, type: a.type || 'agency', tax_id: a.tax_id, contact_person: a.contact_person,
        phone: a.phone, cooperation_status: a.cooperation_status || 'active',
        sales_staff: a.sales_staff?.data?.id || null, notes: a.notes,
      });
    } else {
      companyForm.resetFields();
      companyForm.setFieldsValue({ type: 'agency', cooperation_status: 'active' });
    }
    setCompanyModal(true);
  };

  const saveCompany = async () => {
    try {
      const v = await companyForm.validateFields();
      const payload = { data: {
        name: v.name, type: v.type, tax_id: v.tax_id || null, contact_person: v.contact_person || null,
        phone: v.phone ? String(v.phone) : null, cooperation_status: v.cooperation_status,
        sales_staff: v.sales_staff || null, notes: v.notes || null,
      } };
      const url = editingId ? `${API_BASE_URL}/api/channel-companies/${editingId}` : `${API_BASE_URL}/api/channel-companies`;
      const res = await fetch(url, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`儲存失敗 (${res.status})`);
      message.success(editingId ? '渠道公司已更新' : '渠道公司已新增');
      setCompanyModal(false);
      fetchAll();
    } catch (e) {
      if (e.errorFields) return; // 表單驗證錯誤，antd 已提示
      message.error(`儲存失敗：${e.message}`);
    }
  };

  const filteredCompanies = companies.filter(c => {
    if (!companySearch) return true;
    const kw = companySearch.toLowerCase();
    const a = c.attributes;
    return [a.name, a.contact_person, a.phone].some(f => (f || '').toLowerCase().includes(kw));
  });

  const companyColumns = [
    { title: '公司名稱', dataIndex: ['attributes', 'name'], key: 'name' },
    { title: '類型', dataIndex: ['attributes', 'type'], key: 'type', width: 90, render: t => <Tag>{COMPANY_TYPE[t] || t}</Tag> },
    { title: '主要窗口', dataIndex: ['attributes', 'contact_person'], key: 'contact_person', width: 110, render: v => v || '—' },
    { title: '電話', dataIndex: ['attributes', 'phone'], key: 'phone', width: 130, render: v => v || '—' },
    { title: '負責業務', key: 'sales_staff', width: 110, render: (_, r) => { const s = r.attributes.sales_staff?.data; return s ? staffName(s) : <span style={{ color: '#c0c0c0' }}>未指派</span>; } },
    { title: '旗下人員', key: 'people', width: 80, align: 'right', render: (_, r) => (r.attributes.channel_people?.data?.length || 0) },
    { title: '合作狀態', dataIndex: ['attributes', 'cooperation_status'], key: 'cooperation_status', width: 90, render: s => { const m = COOP_STATUS[s] || {}; return <Tag color={m.color}>{m.text || s}</Tag>; } },
    { title: '操作', key: 'action', width: 80, render: (_, r) => <Button size="small" icon={<EditOutlined />} onClick={() => openCompany(r)}>編輯</Button> },
  ];

  // ---------- 渠道人員 ----------
  const openPerson = (record = null) => {
    setEditingId(record ? record.id : null);
    if (record) {
      const a = record.attributes;
      personForm.setFieldsValue({
        name: a.name, phone: a.phone, line_id: a.line_id, identity: a.identity || 'agent',
        channel_company: a.channel_company?.data?.id || null, sales_staff: a.sales_staff?.data?.id || null,
        active: a.active !== false, notes: a.notes,
      });
    } else {
      personForm.resetFields();
      personForm.setFieldsValue({ identity: 'agent', active: true });
    }
    setPersonModal(true);
  };

  const savePerson = async () => {
    try {
      const v = await personForm.validateFields();
      const payload = { data: {
        name: v.name, phone: v.phone ? String(v.phone) : null, line_id: v.line_id || null,
        identity: v.identity, active: v.active !== false,
        channel_company: v.channel_company || null, sales_staff: v.sales_staff || null, notes: v.notes || null,
      } };
      const url = editingId ? `${API_BASE_URL}/api/channel-people/${editingId}` : `${API_BASE_URL}/api/channel-people`;
      const res = await fetch(url, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`儲存失敗 (${res.status})`);
      message.success(editingId ? '渠道人員已更新' : '渠道人員已新增');
      setPersonModal(false);
      fetchAll();
    } catch (e) {
      if (e.errorFields) return;
      message.error(`儲存失敗：${e.message}`);
    }
  };

  const filteredPeople = people.filter(p => {
    if (!personSearch) return true;
    const kw = personSearch.toLowerCase();
    const a = p.attributes;
    const company = a.channel_company?.data?.attributes?.name || '';
    return [a.name, a.phone, a.line_id, company].some(f => (f || '').toLowerCase().includes(kw));
  });

  const personColumns = [
    { title: '姓名', dataIndex: ['attributes', 'name'], key: 'name' },
    { title: '電話', dataIndex: ['attributes', 'phone'], key: 'phone', width: 130, render: v => v || '—' },
    { title: '身分', dataIndex: ['attributes', 'identity'], key: 'identity', width: 100, render: i => <Tag color="blue">{PERSON_IDENTITY[i] || i}</Tag> },
    { title: '所屬公司', key: 'company', width: 150, render: (_, r) => r.attributes.channel_company?.data?.attributes?.name || <span style={{ color: '#c0c0c0' }}>獨立</span> },
    { title: '負責業務', key: 'sales_staff', width: 110, render: (_, r) => { const s = r.attributes.sales_staff?.data; return s ? staffName(s) : <span style={{ color: '#c0c0c0' }}>未指派</span>; } },
    { title: '帶客數', key: 'customers', width: 80, align: 'right', render: (_, r) => (r.attributes.customers?.data?.length || 0) },
    { title: '狀態', key: 'active', width: 80, render: (_, r) => r.attributes.active !== false ? <Tag color="green">合作中</Tag> : <Tag color="red">停用</Tag> },
    { title: '操作', key: 'action', width: 80, render: (_, r) => <Button size="small" icon={<EditOutlined />} onClick={() => openPerson(r)}>編輯</Button> },
  ];

  const staffOptions = salesStaff.map(s => <Option key={s.id} value={s.id}>{staffName(s)}</Option>);
  const companyOptions = companies.map(c => <Option key={c.id} value={c.id}>{c.attributes.name}</Option>);

  return (
    <Card title="渠道管理" style={{ margin: 8 }}>
      <Tabs
        defaultActiveKey="companies"
        onChange={(key) => { if (key === 'stats') loadStats(); if (key === 'commission') loadCommissions(); }}
        items={[
          {
            key: 'companies',
            label: <span><ApartmentOutlined /> 渠道公司</span>,
            children: (
              <>
                <Space style={{ marginBottom: 16 }} wrap>
                  <Input.Search placeholder="搜尋公司名稱 / 窗口 / 電話" allowClear style={{ width: 260 }} onChange={e => setCompanySearch(e.target.value)} />
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openCompany()}>新增渠道公司</Button>
                </Space>
                <Table rowKey="id" columns={companyColumns} dataSource={filteredCompanies} loading={loading} size="small" scroll={{ x: 900 }} pagination={{ pageSize: 20, showSizeChanger: true }} />
              </>
            ),
          },
          {
            key: 'people',
            label: <span><ContactsOutlined /> 渠道人員</span>,
            children: (
              <>
                <Space style={{ marginBottom: 16 }} wrap>
                  <Input.Search placeholder="搜尋姓名 / 電話 / 公司" allowClear style={{ width: 260 }} onChange={e => setPersonSearch(e.target.value)} />
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openPerson()}>新增渠道人員</Button>
                </Space>
                <Table rowKey="id" columns={personColumns} dataSource={filteredPeople} loading={loading} size="small" scroll={{ x: 900 }} pagination={{ pageSize: 20, showSizeChanger: true }} />
              </>
            ),
          },
          {
            key: 'stats',
            label: <span><BarChartOutlined /> 成效統計</span>,
            children: (
              <>
                {(() => {
                  const totalBrought = statsPerson.reduce((s, r) => s + r.brought, 0);
                  const totalDeals = statsPerson.reduce((s, r) => s + r.dealCust, 0);
                  const totalAmount = statsPerson.reduce((s, r) => s + r.amount, 0);
                  const top = [...statsCompany].slice(0, 10);
                  const chartOption = {
                    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                    legend: { data: ['成交金額', '帶客數'] },
                    grid: { left: 8, right: 8, bottom: 8, top: 40, containLabel: true },
                    xAxis: { type: 'category', data: top.map(c => c.name), axisLabel: { interval: 0, rotate: top.length > 5 ? 25 : 0 } },
                    yAxis: [
                      { type: 'value', name: '成交金額', axisLabel: { formatter: (v) => v >= 10000 ? `${v / 10000}萬` : v } },
                      { type: 'value', name: '帶客數' },
                    ],
                    series: [
                      { name: '成交金額', type: 'bar', data: top.map(c => c.amount), itemStyle: { color: '#1668dc' } },
                      { name: '帶客數', type: 'bar', yAxisIndex: 1, data: top.map(c => c.brought), itemStyle: { color: '#b37feb' } },
                    ],
                  };
                  return (
                    <>
                      <Space size="large" style={{ marginBottom: 16 }} wrap>
                        <Tag color="purple" style={{ padding: '4px 12px', fontSize: 14 }}>渠道帶客總數 {totalBrought}</Tag>
                        <Tag color="green" style={{ padding: '4px 12px', fontSize: 14 }}>成交組數 {totalDeals}</Tag>
                        <Tag color="blue" style={{ padding: '4px 12px', fontSize: 14 }}>成交金額 {fmtAmount(totalAmount)}</Tag>
                        <Tag style={{ padding: '4px 12px', fontSize: 14 }}>整體轉化率 {totalBrought ? fmtRate(totalDeals / totalBrought) : '—'}</Tag>
                      </Space>
                      {statsCompany.length > 0 && (
                        <Card size="small" title="渠道公司成效(前 10 名，依成交金額)" style={{ marginBottom: 16 }}>
                          <ReactECharts option={chartOption} style={{ height: 320 }} notMerge lazyUpdate />
                        </Card>
                      )}
                      <Card size="small" title="公司層彙總" style={{ marginBottom: 16 }}>
                        <Table
                          rowKey="key" size="small" loading={statsLoading} pagination={false}
                          dataSource={statsCompany}
                          columns={[
                            { title: '渠道公司', dataIndex: 'name', key: 'name' },
                            { title: '帶客數', dataIndex: 'brought', key: 'brought', width: 90, align: 'right', sorter: (a, b) => a.brought - b.brought },
                            { title: '成交組數', dataIndex: 'dealCust', key: 'dealCust', width: 90, align: 'right', sorter: (a, b) => a.dealCust - b.dealCust },
                            { title: '成交金額', dataIndex: 'amount', key: 'amount', width: 140, align: 'right', render: fmtAmount, sorter: (a, b) => a.amount - b.amount },
                            { title: '轉化率', dataIndex: 'rate', key: 'rate', width: 90, align: 'right', render: fmtRate, sorter: (a, b) => a.rate - b.rate },
                          ]}
                        />
                      </Card>
                      <Card size="small" title="渠道人員成效">
                        <Table
                          rowKey="id" size="small" loading={statsLoading}
                          pagination={{ pageSize: 20, showSizeChanger: true }}
                          dataSource={statsPerson}
                          columns={[
                            { title: '渠道人員', dataIndex: 'name', key: 'name' },
                            { title: '所屬公司', dataIndex: 'company', key: 'company', width: 150 },
                            { title: '帶客數', dataIndex: 'brought', key: 'brought', width: 90, align: 'right', sorter: (a, b) => a.brought - b.brought },
                            { title: '成交組數', dataIndex: 'dealCust', key: 'dealCust', width: 90, align: 'right', sorter: (a, b) => a.dealCust - b.dealCust },
                            { title: '成交金額', dataIndex: 'amount', key: 'amount', width: 140, align: 'right', render: fmtAmount, sorter: (a, b) => a.amount - b.amount },
                            { title: '轉化率', dataIndex: 'rate', key: 'rate', width: 90, align: 'right', render: fmtRate, sorter: (a, b) => a.rate - b.rate },
                          ]}
                        />
                      </Card>
                    </>
                  );
                })()}
              </>
            ),
          },
          {
            key: 'commission',
            label: <span><BarChartOutlined /> 佣金結算</span>,
            children: (
              <>
                {(() => {
                  const months = Array.from(new Set(commissions.map(commMonthOf).filter(Boolean))).sort().reverse();
                  const rows = commMonth === 'all' ? commissions : commissions.filter(r => commMonthOf(r) === commMonth);
                  const sum = (arr) => arr.reduce((s, r) => s + (parseFloat(r.attributes?.commission_amount || 0) || 0), 0);
                  const payable = rows.filter(r => r.attributes?.payment_status === 'paid' && r.attributes?.commission_settle_status !== 'settled');
                  return (
                    <>
                      <Space style={{ marginBottom: 16 }} wrap>
                        <span>結算月份：</span>
                        <Select value={commMonth} style={{ width: 160 }} onChange={setCommMonth}
                          options={[{ value: 'all', label: '全部' }, ...months.map(m => ({ value: m, label: m }))]} />
                        <Tag color="blue" style={{ padding: '4px 12px', fontSize: 14 }}>佣金合計 {fmtAmount(sum(rows))}</Tag>
                        <Tag color="orange" style={{ padding: '4px 12px', fontSize: 14 }}>可結算(已入帳未結) {fmtAmount(sum(payable))}</Tag>
                      </Space>
                      <Table
                        rowKey="id" size="small" loading={commLoading}
                        pagination={{ pageSize: 20, showSizeChanger: true }}
                        dataSource={rows}
                        scroll={{ x: 1000 }}
                        columns={[
                          { title: '成交日期', key: 'date', width: 110, render: (_, r) => r.attributes?.deal_date || r.attributes?.date || '—' },
                          { title: '渠道人員', dataIndex: ['attributes', 'commission_channel_person_name'], key: 'cp', width: 120 },
                          { title: '客戶', key: 'cust', width: 110, render: (_, r) => r.attributes?.customer?.data?.attributes?.name || '—' },
                          { title: '成交金額', key: 'deal', width: 130, align: 'right', render: (_, r) => fmtAmount(r.attributes?.deal_amount) },
                          {
                            title: '佣金', key: 'comm', width: 140, align: 'right',
                            render: (_, r) => {
                              const a = r.attributes;
                              const note = a.commission_type === 'percent' ? ` (${a.commission_rate}%)` : a.commission_type === 'fixed' ? ' (固定)' : '';
                              return <span style={{ fontWeight: 600 }}>{fmtAmount(a.commission_amount)}<span style={{ color: '#999', fontWeight: 400 }}>{note}</span></span>;
                            },
                          },
                          {
                            title: '入帳', key: 'pay', width: 90, align: 'center',
                            render: (_, r) => r.attributes?.payment_status === 'paid'
                              ? <Tag color="green">已入帳</Tag> : <Tag color="orange">未入帳</Tag>,
                          },
                          {
                            title: '結算狀態', key: 'settle', width: 110, align: 'center',
                            render: (_, r) => r.attributes?.commission_settle_status === 'settled'
                              ? <Tag color="green">已結算<br />{r.attributes?.commission_settle_month}</Tag>
                              : <Tag color="orange">尚未結算</Tag>,
                          },
                          {
                            title: '操作', key: 'action', width: 130,
                            render: (_, r) => {
                              const a = r.attributes;
                              if (a.commission_settle_status === 'settled') {
                                return <span style={{ color: '#c0c0c0' }}>已完成撥款</span>;
                              }
                              const paid = a.payment_status === 'paid';
                              if (!paid) {
                                return (
                                  <Tooltip title="客戶款項入帳後才可結算佣金">
                                    <Button size="small" disabled>確認結算</Button>
                                  </Tooltip>
                                );
                              }
                              return (
                                <Popconfirm
                                  title="確認結算這筆佣金？"
                                  description={`將「${a.commission_channel_person_name}」的 ${fmtAmount(a.commission_amount)} 標記為已結算（已撥款）`}
                                  onConfirm={() => markSettled(r)}
                                  okText="確認" cancelText="取消"
                                >
                                  <Button size="small" type="primary">確認結算</Button>
                                </Popconfirm>
                              );
                            },
                          },
                        ]}
                      />
                    </>
                  );
                })()}
              </>
            ),
          },
        ]}
      />

      {/* 渠道公司 表單 */}
      <Modal title={editingId ? '編輯渠道公司' : '新增渠道公司'} open={companyModal} onOk={saveCompany} onCancel={() => setCompanyModal(false)} okText="儲存" cancelText="取消" destroyOnClose>
        <Form form={companyForm} layout="vertical">
          <Form.Item name="name" label="公司名稱" rules={[{ required: true, message: '請輸入公司名稱' }]}><Input placeholder="例：永慶不動產 北屯店" /></Form.Item>
          <Form.Item name="type" label="類型"><Select>{Object.entries(COMPANY_TYPE).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}</Select></Form.Item>
          <Form.Item name="contact_person" label="主要窗口"><Input /></Form.Item>
          <Form.Item name="phone" label="電話"><Input /></Form.Item>
          <Form.Item name="tax_id" label="統編"><Input /></Form.Item>
          <Form.Item name="cooperation_status" label="合作狀態"><Select>{Object.entries(COOP_STATUS).map(([k, v]) => <Option key={k} value={k}>{v.text}</Option>)}</Select></Form.Item>
          <Form.Item name="sales_staff" label="負責業務"><Select allowClear showSearch optionFilterProp="children" placeholder="指派負責維繫的業務">{staffOptions}</Select></Form.Item>
          <Form.Item name="notes" label="備註"><TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* 渠道人員 表單 */}
      <Modal title={editingId ? '編輯渠道人員' : '新增渠道人員'} open={personModal} onOk={savePerson} onCancel={() => setPersonModal(false)} okText="儲存" cancelText="取消" destroyOnClose>
        <Form form={personForm} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '請輸入姓名' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="電話"><Input /></Form.Item>
          <Form.Item name="line_id" label="LINE ID"><Input /></Form.Item>
          <Form.Item name="identity" label="身分"><Select>{Object.entries(PERSON_IDENTITY).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}</Select></Form.Item>
          <Form.Item name="channel_company" label="所屬公司" extra="個人介紹人可留空">
            <Select allowClear showSearch optionFilterProp="children" placeholder="不掛公司則留空">{companyOptions}</Select>
          </Form.Item>
          <Form.Item name="sales_staff" label="負責業務"><Select allowClear showSearch optionFilterProp="children" placeholder="指派負責維繫的業務">{staffOptions}</Select></Form.Item>
          <Form.Item name="active" label="合作中" valuePropName="checked" extra="停止合作請關閉（保留歷史帶客紀錄，不刪除）"><Switch /></Form.Item>
          <Form.Item name="notes" label="備註"><TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ChannelManagement;
