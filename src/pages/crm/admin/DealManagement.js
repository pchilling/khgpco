import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Form, Input, Select, InputNumber, Tooltip, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../../utils/api';
import { fetchAllStrapi } from '../../../utils/strapiPaginate';

const { Option } = Select;
const { TextArea } = Input;

const fmtAmount = (n) => (n ? `NT$${Number(n).toLocaleString()}` : '—');
const monthOf = (d) => (d.attributes?.deal_date || '').slice(0, 7);

const DealManagement = () => {
  const [deals, setDeals] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [salesStaff, setSalesStaff] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [payFilter, setPayFilter] = useState('all');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [d, c, p, s] = await Promise.all([
        fetchAllStrapi(API_BASE_URL, '/api/deals?populate[customer][fields][0]=name&populate[project][fields][0]=name&populate[sales_staff][fields][0]=name&populate[sales_staff][fields][1]=username&sort=deal_date:desc'),
        fetchAllStrapi(API_BASE_URL, '/api/customers?fields[0]=name&populate[channel_person][fields][0]=name'),
        fetch(`${API_BASE_URL}/api/projects?pagination[pageSize]=1000&fields[0]=name`).then(r => r.json()).then(j => j.data || []),
        fetch(`${API_BASE_URL}/api/sales-staffs?pagination[pageSize]=1000`).then(r => r.json()).then(j => j.data || []),
      ]);
      setDeals(d);
      setCustomers(c);
      setProjects(p);
      setSalesStaff(s);
    } catch (e) {
      console.error(e);
      message.error(`載入成交資料失敗：${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const staffName = (s) => s?.attributes?.name || s?.attributes?.username || `業務 ${s?.id}`;
  const custChannel = (custId) => {
    const c = customers.find(x => x.id === custId);
    return c?.attributes?.channel_person?.data || null;
  };

  const openModal = (record = null) => {
    setEditingId(record ? record.id : null);
    if (record) {
      const a = record.attributes;
      form.setFieldsValue({
        customer: a.customer?.data?.id || null,
        project: a.project?.data?.id || null,
        deal_amount: a.deal_amount ? Number(a.deal_amount) : undefined,
        deal_date: a.deal_date || '',
        payment_status: a.payment_status || 'unpaid',
        payment_date: a.payment_date || '',
        sales_staff: a.sales_staff?.data?.id || null,
        commission_type: a.commission_type || undefined,
        commission_rate: a.commission_rate ? Number(a.commission_rate) : undefined,
        commission_amount: a.commission_amount ? Number(a.commission_amount) : undefined,
        commission_settle_status: a.commission_settle_status || 'unsettled',
        notes: a.notes || '',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ payment_status: 'unpaid', deal_date: new Date().toISOString().slice(0, 10) });
    }
    setModalOpen(true);
  };

  const save = async () => {
    try {
      const v = await form.validateFields();
      const channel = custChannel(Number(v.customer));
      const data = {
        customer: Number(v.customer),
        project: v.project || null,
        deal_amount: Number(v.deal_amount || 0),
        deal_date: v.deal_date || null,
        payment_status: v.payment_status || 'unpaid',
        payment_date: v.payment_date || null,
        sales_staff: v.sales_staff || null,
        notes: v.notes || null,
        commission_settle_status: v.commission_settle_status || 'unsettled',
      };
      // 佣金:客戶有綁渠道且有選佣金方式才記(快照渠道)
      if (channel && v.commission_type) {
        const amount = v.commission_type === 'percent'
          ? Math.round(Number(v.deal_amount || 0) * Number(v.commission_rate || 0) / 100)
          : Number(v.commission_amount || 0);
        Object.assign(data, {
          commission_channel_person_id: channel.id,
          commission_channel_person_name: channel.attributes?.name || '',
          commission_type: v.commission_type,
          commission_rate: v.commission_type === 'percent' ? Number(v.commission_rate || 0) : null,
          commission_amount: amount,
        });
      } else {
        Object.assign(data, {
          commission_channel_person_id: null, commission_channel_person_name: null,
          commission_type: null, commission_rate: null, commission_amount: null,
        });
      }
      const url = editingId ? `${API_BASE_URL}/api/deals/${editingId}` : `${API_BASE_URL}/api/deals`;
      const res = await fetch(url, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
      if (!res.ok) throw new Error(`儲存失敗 (${res.status})`);
      message.success(editingId ? '成交已更新' : '成交已新增');
      setModalOpen(false);
      fetchAll();
    } catch (e) {
      if (e.errorFields) return;
      message.error(`儲存失敗：${e.message}`);
    }
  };

  const quickUpdate = async (id, patch, okMsg) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/deals/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: patch }) });
      if (!res.ok) throw new Error(`失敗 (${res.status})`);
      message.success(okMsg);
      fetchAll();
    } catch (e) { message.error(e.message); }
  };

  const months = Array.from(new Set(deals.map(monthOf).filter(Boolean))).sort().reverse();
  const filtered = deals.filter(d => {
    const a = d.attributes;
    if (monthFilter !== 'all' && monthOf(d) !== monthFilter) return false;
    if (payFilter !== 'all' && (a.payment_status || 'unpaid') !== payFilter) return false;
    if (search) {
      const kw = search.toLowerCase();
      const cn = a.customer?.data?.attributes?.name || '';
      const pn = a.project?.data?.attributes?.name || '';
      if (![cn, pn].some(f => f.toLowerCase().includes(kw))) return false;
    }
    return true;
  });

  const totalAmount = filtered.reduce((s, d) => s + (Number(d.attributes?.deal_amount) || 0), 0);
  const totalCommission = filtered.reduce((s, d) => s + (Number(d.attributes?.commission_amount) || 0), 0);

  const columns = [
    { title: '成交日期', key: 'deal_date', width: 110, render: (_, d) => d.attributes?.deal_date || '—' },
    { title: '客戶', key: 'customer', width: 130, render: (_, d) => d.attributes?.customer?.data?.attributes?.name || '—' },
    { title: '建案', key: 'project', width: 150, ellipsis: true, render: (_, d) => d.attributes?.project?.data?.attributes?.name || <span style={{ color: '#c0c0c0' }}>—</span> },
    { title: '成交金額', key: 'amount', width: 140, align: 'right', render: (_, d) => <b>{fmtAmount(d.attributes?.deal_amount)}</b> },
    { title: '成交業務', key: 'staff', width: 110, render: (_, d) => { const s = d.attributes?.sales_staff?.data; return s ? staffName(s) : '—'; } },
    { title: '渠道', key: 'channel', width: 110, render: (_, d) => d.attributes?.commission_channel_person_name || <span style={{ color: '#c0c0c0' }}>—</span> },
    { title: '佣金', key: 'commission', width: 120, align: 'right', render: (_, d) => d.attributes?.commission_amount ? fmtAmount(d.attributes.commission_amount) : <span style={{ color: '#c0c0c0' }}>未記</span> },
    {
      title: '客戶付款', key: 'pay', width: 120, align: 'center',
      render: (_, d) => d.attributes?.payment_status === 'paid'
        ? <Tag color="green">已付款</Tag>
        : <Popconfirm title="標記為客戶已付款？" onConfirm={() => quickUpdate(d.id, { payment_status: 'paid', payment_date: new Date().toISOString().slice(0, 10) }, '已標記客戶付款')} okText="確認" cancelText="取消">
            <Button size="small">客戶已付款</Button>
          </Popconfirm>,
    },
    {
      title: '撥款給渠道', key: 'settle', width: 120, align: 'center',
      render: (_, d) => {
        const a = d.attributes;
        if (a.commission_settle_status === 'reversed') return <Tag color="red">已作廢</Tag>;
        if (a.commission_settle_status === 'settled') return <Tag color="green">已撥款</Tag>;
        if (!a.commission_amount) return <span style={{ color: '#c0c0c0' }}>—</span>;
        const paid = a.payment_status === 'paid';
        return (
          <Tooltip title={paid ? '' : '客戶付款後才可撥款給渠道'}>
            <Popconfirm disabled={!paid} title="確認把佣金撥款給渠道？" onConfirm={() => quickUpdate(d.id, { commission_settle_status: 'settled', commission_settle_month: monthOf(d) }, '已撥款給渠道')} okText="確認" cancelText="取消">
              <Button size="small" type="primary" disabled={!paid}>撥款</Button>
            </Popconfirm>
          </Tooltip>
        );
      },
    },
    { title: '操作', key: 'action', width: 80, render: (_, d) => <Button size="small" icon={<EditOutlined />} onClick={() => openModal(d)}>編輯</Button> },
  ];

  return (
    <Card title="成交管理" style={{ margin: 8 }}>
      <div style={{ background: '#f6f8fa', border: '1px solid #eef0f2', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#555', lineHeight: 1.9 }}>
        <b style={{ color: '#333' }}>名詞說明：</b>
        <span style={{ color: '#389e0d' }}>客戶付款</span>＝收到客戶的錢　·
        <span style={{ color: '#1668dc' }}>撥款</span>＝把佣金付給渠道（<b>要先「客戶付款」才能撥款</b>，避免還沒收錢就先付出去）　·
        <span style={{ color: '#cf1322' }}>退訂作廢</span>＝客戶退訂，這筆佣金作廢不用付
      </div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search placeholder="搜尋客戶 / 建案" allowClear style={{ width: 220 }} onChange={e => setSearch(e.target.value)} />
        <Select value={monthFilter} style={{ width: 140 }} onChange={setMonthFilter}
          options={[{ value: 'all', label: '全部月份' }, ...months.map(m => ({ value: m, label: m }))]} />
        <Select value={payFilter} style={{ width: 130 }} onChange={setPayFilter}
          options={[{ value: 'all', label: '付款:全部' }, { value: 'paid', label: '已付款' }, { value: 'unpaid', label: '未付款' }]} />
        <Tag color="blue" style={{ padding: '4px 12px', fontSize: 14 }}>成交金額 {fmtAmount(totalAmount)}</Tag>
        <Tag color="purple" style={{ padding: '4px 12px', fontSize: 14 }}>佣金合計 {fmtAmount(totalCommission)}</Tag>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新增成交</Button>
      </Space>

      <Table rowKey="id" columns={columns} dataSource={filtered} loading={loading} size="small" scroll={{ x: 1200 }} pagination={{ pageSize: 20, showSizeChanger: true }} />

      <Modal title={editingId ? '編輯成交' : '新增成交'} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} okText="儲存" cancelText="取消" width={560} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="customer" label="客戶" rules={[{ required: true, message: '請選擇客戶' }]}>
            <Select showSearch optionFilterProp="children" placeholder="選擇客戶">
              {customers.map(c => <Option key={c.id} value={c.id}>{c.attributes.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="project" label="建案 / 戶別">
            <Select allowClear showSearch optionFilterProp="children" placeholder="選擇建案">
              {projects.map(p => <Option key={p.id} value={p.id}>{p.attributes.name || `建案 ${p.id}`}</Option>)}
            </Select>
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="deal_amount" label="成交金額" rules={[{ required: true, message: '請輸入金額' }]}>
              <InputNumber style={{ width: 180 }} min={0} step={10000} placeholder="元" />
            </Form.Item>
            <Form.Item name="deal_date" label="成交日期"><Input type="date" /></Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="payment_status" label="客戶付款">
              <Select style={{ width: 130 }} options={[{ value: 'unpaid', label: '未付款' }, { value: 'paid', label: '已付款' }]} />
            </Form.Item>
            <Form.Item name="payment_date" label="付款日期"><Input type="date" /></Form.Item>
            <Form.Item name="sales_staff" label="成交業務">
              <Select allowClear showSearch optionFilterProp="children" style={{ width: 150 }} placeholder="選擇業務">
                {salesStaff.map(s => <Option key={s.id} value={s.id}>{staffName(s)}</Option>)}
              </Select>
            </Form.Item>
          </Space>

          {/* 佣金 */}
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const channel = custChannel(Number(getFieldValue('customer')));
              const cType = getFieldValue('commission_type');
              const amt = getFieldValue('deal_amount') || 0;
              const rate = getFieldValue('commission_rate') || 0;
              const preview = cType === 'percent' ? Math.round(amt * rate / 100) : Number(getFieldValue('commission_amount') || 0);
              return (
                <div style={{ borderTop: '1px dashed #eee', paddingTop: 10 }}>
                  <div style={{ marginBottom: 8, color: '#888' }}>渠道佣金 {channel ? `— 歸屬：${channel.attributes?.name}` : '— 此客戶未綁渠道,可略過'}</div>
                  {channel && (
                    <Space wrap align="baseline">
                      <Form.Item name="commission_type" label="佣金方式" style={{ marginBottom: 8 }}>
                        <Select allowClear style={{ width: 130 }} placeholder="不計佣金" options={[{ value: 'percent', label: '百分比' }, { value: 'fixed', label: '固定金額' }]} />
                      </Form.Item>
                      {cType === 'percent' && <Form.Item name="commission_rate" label="比率(%)" style={{ marginBottom: 8 }}><InputNumber min={0} max={100} step={0.5} style={{ width: 110 }} /></Form.Item>}
                      {cType === 'fixed' && <Form.Item name="commission_amount" label="金額" style={{ marginBottom: 8 }}><InputNumber min={0} step={1000} style={{ width: 150 }} /></Form.Item>}
                      {cType && <span style={{ color: '#1668dc' }}>應付佣金 ≈ NT${preview.toLocaleString()}</span>}
                    </Space>
                  )}
                </div>
              );
            }}
          </Form.Item>
          <Form.Item name="notes" label="備註"><TextArea rows={2} /></Form.Item>
          {editingId && (
            <Form.Item name="commission_settle_status" label="撥款狀態">
              <Select options={[{ value: 'unsettled', label: '未撥款' }, { value: 'settled', label: '已撥款' }, { value: 'reversed', label: '退訂作廢' }]} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
};

export default DealManagement;
