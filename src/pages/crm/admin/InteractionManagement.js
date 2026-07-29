
import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, DatePicker, Tag, Tooltip, message, Switch, InputNumber } from 'antd';
import { PlusOutlined, FilterOutlined, SearchOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, ExportOutlined, SmileTwoTone, MehTwoTone, FrownTwoTone, QuestionCircleTwoTone } from '@ant-design/icons';
import { API_BASE_URL } from '../../../utils/api';
import { fetchAllStrapi } from '../../../utils/strapiPaginate';
import * as XLSX from 'xlsx';

const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const interactionTypeMap = {
  phone_call: '電話聯絡',
  email: '電子郵件',
  meeting: '會議拜訪',
  site_visit: '現場參觀',
  other: '其他'
};

const interactionStatusMap = {
  initial_contact: { text: '初次接觸', color: 'blue' },
  following_up: { text: '跟進中', color: 'cyan' },
  negotiating: { text: '洽談中', color: 'orange' },
  contract_signed: { text: '已簽約', color: 'gold' },
  payment_received: { text: '已收款', color: 'green' },
  completed: { text: '已完成', color: 'green' },
  pending: { text: '待處理', color: 'default' },
  cancelled: { text: '已取消', color: 'red' }
};

const getTypeColor = (t) => ({ phone_call: 'blue', email: 'geekblue', meeting: 'purple', site_visit: 'cyan', other: 'default' }[t] || 'default');

export default function InteractionManagement() {
  const [loading, setLoading] = useState(false);
  const [interactions, setInteractions] = useState([]);
  const [filteredInteractions, setFilteredInteractions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [salesStaff, setSalesStaff] = useState([]);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterForm] = Form.useForm();

  const [editing, setEditing] = useState(null); // record or null
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const normalizeDate = (val) => {
    if (!val) return null;
    try {
      if (typeof val.format === 'function') return val.format('YYYY-MM-DD');
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch {}
    return null;
  };

  const toDateOnlyString = (val) => {
    if (!val) return undefined;
    if (typeof val === 'string') return val.slice(0, 10);
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch {}
    return undefined;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [ints, custs, staff, projs] = await Promise.all([
        fetchAllStrapi(API_BASE_URL, '/api/interactions?populate[]=customer&populate[]=sales_staff&populate[]=project&sort[0]=date:desc'),
        fetchAllStrapi(API_BASE_URL, '/api/customers?populate[sales_staff]=*&populate[channel_person]=*&sort=updatedAt:desc'),
        fetchAllStrapi(API_BASE_URL, '/api/sales-staffs?populate=*'),
        fetchAllStrapi(API_BASE_URL, '/api/projects?populate=*'),
      ]);
      setInteractions(ints || []);
      setFilteredInteractions(ints || []);
      setCustomers(custs || []);
      setSalesStaff(staff || []);
      setProjects(projs || []);
    } catch (e) {
      console.error('Load interactions failed', e);
      message.error('載入聯絡記錄失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => { applyFilters(); }, [interactions, searchKeyword]);

  const applyFilters = (formValues = null) => {
    try {
      let list = [...interactions];
      if (searchKeyword) {
        const k = searchKeyword.toLowerCase();
        list = list.filter(r => {
          const a = r.attributes || {};
          const name = a.customer?.data?.attributes?.name || '';
          const notes = a.notes || '';
          const staffName = a.sales_staff?.data?.attributes?.name || a.sales_staff?.data?.attributes?.username || '';
          return name.toLowerCase().includes(k) || notes.toLowerCase().includes(k) || staffName.toLowerCase().includes(k);
        });
      }
      if (formValues) {
        if (formValues.sales_staff) {
          list = list.filter(r => r.attributes?.sales_staff?.data?.id === formValues.sales_staff);
        }
        if (formValues.type && formValues.type.length > 0) {
          list = list.filter(r => r.attributes?.type && formValues.type.includes(r.attributes.type));
        }
        if (formValues.status && formValues.status.length > 0) {
          list = list.filter(r => r.attributes?.status && formValues.status.includes(r.attributes.status));
        }
        if (formValues.customer) {
          list = list.filter(r => r.attributes?.customer?.data?.id === formValues.customer);
        }
        if (formValues.dateRange && formValues.dateRange[0] && formValues.dateRange[1]) {
          const startRaw = formValues.dateRange[0];
          const endRaw = formValues.dateRange[1];
          const startDate = new Date(normalizeDate(startRaw));
          const endDate = new Date(normalizeDate(endRaw));
          endDate.setHours(23, 59, 59, 999);
          list = list.filter(r => {
            const d = r.attributes?.date ? new Date(r.attributes.date) : null;
            return d && d >= startDate && d <= endDate;
          });
        }
      }
      setFilteredInteractions(list);
      if (list.length !== interactions.length) {
        message.info(`共找到 ${list.length} 筆聯絡記錄`);
      }
    } catch (e) {
      console.error('applyFilters failed', e);
      message.error('過濾出錯，請重試');
      setFilteredInteractions(interactions);
    }
  };

  const exportToExcel = () => {
    const isFiltered = filteredInteractions.length !== interactions.length;
    const confirmMessage = isFiltered
      ? `確定要導出篩選後的 ${filteredInteractions.length} 筆記錄嗎？`
      : `確定要導出全部 ${interactions.length} 筆記錄嗎？`;
    Modal.confirm({
      title: '導出確認',
      content: confirmMessage,
      okText: '確定導出',
      cancelText: '取消',
      onOk: () => {
        const exportData = filteredInteractions.map(interaction => ({
          '銷售人員': interaction.attributes.sales_staff?.data?.attributes?.name || interaction.attributes.sales_staff?.data?.attributes?.username || '',
          '客戶': interaction.attributes.customer?.data?.attributes?.name || '',
          '聯絡類型': interactionTypeMap[interaction.attributes.type] || interaction.attributes.type,
          '聯絡日期': interaction.attributes.date,
          '聯絡內容': interaction.attributes.notes,
          '聯絡狀態': interactionStatusMap[interaction.attributes.status]?.text || interaction.attributes.status,
          '聯絡結果': interaction.attributes.outcome || '',
          '相關建案': interaction.attributes.project?.data?.attributes?.name || '',
          '是否成交': interaction.attributes.is_deal ? '是' : '否',
          '成交金額': interaction.attributes.is_deal ? interaction.attributes.deal_amount : '',
          '入帳日期': interaction.attributes.is_deal ? interaction.attributes.payment_date : '',
          '下次跟進日期': interaction.attributes.next_follow_up || '',
          '創建時間': new Date(interaction.attributes.createdAt).toLocaleString(),
          '更新時間': new Date(interaction.attributes.updatedAt).toLocaleString(),
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '聯絡記錄');
        const fileName = isFiltered
          ? `聯絡記錄_篩選結果_${new Date().toISOString().split('T')[0]}.xlsx`
          : `聯絡記錄_全部_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        message.success(`成功導出 ${exportData.length} 筆聯絡記錄`);
      }
    });
  };

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    const a = record.attributes || {};
    setEditing(record);
    form.setFieldsValue({
      customer: a.customer?.data?.id,
      sales_staff: a.sales_staff?.data?.id,
      project: a.project?.data?.id,
      type: a.type,
      status: a.status,
      outcome: a.outcome,
      date: toDateOnlyString(a.date),
      next_follow_up: toDateOnlyString(a.next_follow_up),
      notes: a.notes,
      is_deal: !!a.is_deal,
      deal_amount: a.deal_amount ? Number(a.deal_amount) : undefined,
      payment_date: toDateOnlyString(a.payment_date),
      deal_date: toDateOnlyString(a.deal_date),
      payment_status: a.payment_status || 'unpaid',
      commission_type: a.commission_type || undefined,
      commission_rate: a.commission_rate ? Number(a.commission_rate) : undefined,
      commission_amount: a.commission_amount ? Number(a.commission_amount) : undefined,
    });
    setModalOpen(true);
  };

  const handleDelete = async (record) => {
    Modal.confirm({
      title: '刪除確認',
      content: '確定要刪除此聯絡記錄嗎？',
      okType: 'danger',
      onOk: async () => {
        try {
          const resp = await fetch(`${API_BASE_URL}/api/interactions/${record.id}`, { method: 'DELETE' });
          if (!resp.ok) throw new Error('刪除失敗');
          message.success('已刪除');
          loadData();
        } catch (e) {
          console.error(e);
          message.error('刪除失敗');
        }
      }
    });
  };

  const submit = async () => {
    try {
      const v = await form.validateFields();

      // 成交 + 佣金:客戶有綁渠道且有選佣金方式,才快照渠道並計算佣金
      let dealFields = { is_deal: false };
      if (v.is_deal) {
        dealFields = {
          is_deal: true,
          deal_amount: Number(v.deal_amount || 0),
          ...(v.deal_date ? { deal_date: normalizeDate(v.deal_date) } : {}),
          payment_date: normalizeDate(v.payment_date),
          payment_status: v.payment_status || 'unpaid',
        };
        const cust = customers.find(c => c.id === Number(v.customer));
        const channel = cust?.attributes?.channel_person?.data;
        if (channel && v.commission_type) {
          const amount = v.commission_type === 'percent'
            ? Math.round(Number(v.deal_amount || 0) * Number(v.commission_rate || 0) / 100)
            : Number(v.commission_amount || 0);
          Object.assign(dealFields, {
            commission_channel_person_id: channel.id,
            commission_channel_person_name: channel.attributes?.name || '',
            commission_type: v.commission_type,
            commission_rate: v.commission_type === 'percent' ? Number(v.commission_rate || 0) : null,
            commission_amount: amount,
            // 編輯時保留既有結算狀態,新建預設未結算
            commission_settle_status: editing?.attributes?.commission_settle_status || 'unsettled',
          });
        }
      }

      const payload = {
        customer: Number(v.customer),
        ...(v.sales_staff ? { sales_staff: Number(v.sales_staff) } : {}),
        ...(v.project ? { project: Number(v.project) } : {}),
        type: v.type,
        status: v.status,
        ...(v.outcome ? { outcome: v.outcome } : {}),
        date: normalizeDate(v.date) || new Date().toISOString().split('T')[0],
        ...(v.next_follow_up ? { next_follow_up: normalizeDate(v.next_follow_up) } : {}),
        ...(v.notes ? { notes: v.notes } : {}),
        ...dealFields
      };

      const isEdit = !!editing;
      const url = isEdit ? `${API_BASE_URL}/api/interactions/${editing.id}` : `${API_BASE_URL}/api/interactions`;
      const method = isEdit ? 'PUT' : 'POST';
      const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: payload }) });
      if (!resp.ok) throw new Error(isEdit ? '更新失敗' : '新增失敗');
      message.success(isEdit ? '已更新' : '已新增');
      setModalOpen(false);
      setEditing(null);
      loadData();
    } catch (e) {
      if (e?.errorFields) return; // 表單驗證錯誤已由 AntD 顯示
      console.error(e);
      message.error(e.message || '提交失敗');
    }
  };

  const columns = [
    { title: '客戶', key: 'customer', render: (_, r) => r.attributes?.customer?.data?.attributes?.name || '-' },
    { title: '負責業務', key: 'sales_staff', render: (_, r) => r.attributes?.sales_staff?.data?.attributes?.name || r.attributes?.sales_staff?.data?.attributes?.username || '-' },
    { title: '聯絡類型', dataIndex: ['attributes', 'type'], key: 'type', render: (type) => (<Tag color={getTypeColor(type)}>{interactionTypeMap[type] || type}</Tag>) },
    { title: '聯絡日期', dataIndex: ['attributes', 'date'], key: 'date', render: (date) => date || '-' },
    { title: '聯絡內容', dataIndex: ['attributes', 'notes'], key: 'notes', ellipsis: { showTitle: false }, render: (notes) => (
      <Tooltip placement="topLeft" title={notes}>
        {notes || '-'}
      </Tooltip>
    ) },
    { title: '狀態', dataIndex: ['attributes', 'status'], key: 'status', render: (status) => (
      <Tag color={interactionStatusMap[status]?.color || 'default'}>
        {interactionStatusMap[status]?.text || status}
      </Tag>
    ) },
    { title: '聯絡結果', dataIndex: ['attributes', 'outcome'], key: 'outcome', render: (outcome) => {
      const map = {
        positive: { icon: <SmileTwoTone twoToneColor="#52c41a" />, text: '正向' },
        neutral: { icon: <MehTwoTone twoToneColor="#faad14" />, text: '中性' },
        negative: { icon: <FrownTwoTone twoToneColor="#ff4d4f" />, text: '負向' },
      };
      const item = map[outcome] || { icon: <QuestionCircleTwoTone twoToneColor="#8c8c8c" />, text: '-' };
      return (
        <Tooltip title={item.text}>
          <span>{item.icon}</span>
        </Tooltip>
      );
    } },
    { title: '相關建案', key: 'project', render: (_, r) => r.attributes?.project?.data?.attributes?.name || '-' },
    { title: '是否成交', dataIndex: ['attributes', 'is_deal'], key: 'is_deal', render: (is_deal) => is_deal ? '是' : '否' },
    { title: '成交金額', dataIndex: ['attributes', 'deal_amount'], key: 'deal_amount', render: (deal_amount) => deal_amount || '-' },
    { title: '入帳日期', dataIndex: ['attributes', 'payment_date'], key: 'payment_date', render: (payment_date) => payment_date || '-' },
    {
      title: '操作', key: 'action', width: 120, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="編輯">
            <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="刪除">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="聯絡記錄管理"
      extra={
        <Space>
          <Input
            placeholder="搜索客戶姓名、聯絡內容或業務人員"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
          />
          <Button icon={<FilterOutlined />} onClick={() => setFilterVisible(!filterVisible)}>篩選</Button>
          <Button icon={<ReloadOutlined />} onClick={() => loadData()}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增聯絡</Button>
          <Button icon={<ExportOutlined />} onClick={exportToExcel}>導出Excel</Button>
        </Space>
      }
    >
      {filterVisible && (
        <div className="filter-panel" style={{
          backgroundColor: '#f8f8f8',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '16px',
          border: '1px solid #e8e8e8'
        }}>
          <Form form={filterForm} layout="horizontal" onFinish={applyFilters}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <Form.Item name="sales_staff" label="銷售人員" style={{ minWidth: '200px' }}>
                <Select placeholder="選擇銷售人員" style={{ width: '200px' }} allowClear>
                  {salesStaff.map(staff => (
                    <Option key={staff.id} value={staff.id}>
                      {staff.attributes?.name || staff.attributes?.username}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="type" label="聯絡類型" style={{ minWidth: '200px' }}>
                <Select mode="multiple" placeholder="選擇聯絡類型" style={{ width: '200px' }}>
                  {Object.entries(interactionTypeMap).map(([value, text]) => (
                    <Option key={value} value={value}>{text}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="status" label="聯絡狀態" style={{ minWidth: '200px' }}>
                <Select mode="multiple" placeholder="選擇聯絡狀態" style={{ width: '200px' }}>
                  {Object.entries(interactionStatusMap).map(([value, { text }]) => (
                    <Option key={value} value={value}>{text}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="customer" label="客戶" style={{ minWidth: '200px' }}>
                <Select placeholder="選擇客戶" style={{ width: '200px' }} showSearch filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())} allowClear>
                  {customers.map(customer => (
                    <Option key={customer.id} value={customer.id}>{customer.attributes?.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="dateRange" label="聯絡日期" style={{ minWidth: '300px' }}>
                <RangePicker />
              </Form.Item>
              <Form.Item style={{ marginLeft: 'auto' }}>
                <Space>
                  <Button type="primary" htmlType="submit">篩選</Button>
                </Space>
              </Form.Item>
            </div>
          </Form>
        </div>
      )}

      <div style={{
        marginBottom: 16,
        padding: '8px 12px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '4px',
        fontSize: '14px',
        color: '#0369a1'
      }}>
        提示：可搜尋「客戶姓名」、「聯絡內容」或「業務人員姓名」關鍵字來快速找到相關記錄
      </div>

      <Table columns={columns} dataSource={filteredInteractions} rowKey={record => record.id} loading={loading} scroll={{ x: 1200 }} />

      <Modal title={editing ? '編輯聯絡記錄' : '新增聯絡記錄'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); }} onOk={submit} okText="保存" cancelText="取消" width={720}>
        <Form form={form} layout="vertical">
          <Form.Item name="customer" label="客戶" rules={[{ required: true, message: '請選擇客戶' }]}>
            <Select placeholder="輸入客戶名稱搜尋" showSearch optionFilterProp="children" filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}>
              {customers.map(customer => (
                <Option key={customer.id} value={customer.id}>{customer.attributes?.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="sales_staff" label="負責業務">
            <Select placeholder="選擇業務" allowClear>
              {salesStaff.map(s => (<Option key={s.id} value={s.id}>{s.attributes?.name || s.attributes?.username}</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="type" label="聯絡類型" rules={[{ required: true, message: '請選擇聯絡類型' }]}>
            <Select placeholder="選擇聯絡類型">
              {Object.entries(interactionTypeMap).map(([value, text]) => (
                <Option key={value} value={value}>{text}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="date" label="聯絡日期" rules={[{ required: true, message: '請選擇聯絡日期' }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="notes" label="聯絡內容" rules={[{ required: true, message: '請輸入聯絡內容' }]}>
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item name="status" label="聯絡狀態" rules={[{ required: true, message: '請選擇聯絡狀態' }]}>
            <Select placeholder="選擇聯絡狀態">
              {Object.entries(interactionStatusMap).map(([value, { text }]) => (
                <Option key={value} value={value}>{text}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="outcome" label="聯絡結果">
            <Select placeholder="選擇聯絡結果" allowClear>
              <Option value="positive">正向</Option>
              <Option value="neutral">中性</Option>
              <Option value="negative">負向</Option>
            </Select>
          </Form.Item>
          <Form.Item name="project" label="相關建案（選填）">
            <Select allowClear placeholder="輸入建案名稱搜尋" showSearch optionFilterProp="children" filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}>
              {projects.map(p => (
                <Option key={p.id} value={p.id}>{p.attributes?.name || `建案 ${p.id}`}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="next_follow_up" label="下次跟進日期">
            <Input type="date" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="is_deal" label="是否成交" valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
            <Form.Item shouldUpdate>
              {({ getFieldValue }) => {
                if (!getFieldValue('is_deal')) return null;
                const cust = customers.find(c => c.id === Number(getFieldValue('customer')));
                const channel = cust?.attributes?.channel_person?.data;
                const dealAmount = Number(getFieldValue('deal_amount') || 0);
                const cType = getFieldValue('commission_type');
                const cRate = Number(getFieldValue('commission_rate') || 0);
                const preview = cType === 'percent' ? Math.round(dealAmount * cRate / 100) : Number(getFieldValue('commission_amount') || 0);
                return (
                  <div style={{ display: 'contents' }}>
                    <Form.Item name="deal_amount" label="成交金額" rules={[{ required: true, message: '請輸入成交金額' }]}>
                      <InputNumber style={{ width: '100%' }} min={0} step={10000} placeholder="輸入金額（元）" />
                    </Form.Item>
                    <Form.Item name="deal_date" label="成交日期">
                      <Input type="date" />
                    </Form.Item>
                    <Form.Item name="payment_status" label="入帳狀態" initialValue="unpaid">
                      <Select options={[{ value: 'unpaid', label: '未入帳' }, { value: 'paid', label: '已入帳' }]} />
                    </Form.Item>
                    <Form.Item name="payment_date" label="入帳日期">
                      <Input type="date" />
                    </Form.Item>
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #eee', paddingTop: 10, marginTop: 2 }}>
                      <div style={{ marginBottom: 8, color: '#888' }}>
                        渠道佣金 {channel ? `— 歸屬：${channel.attributes?.name}` : '— 此客戶未綁渠道，可略過'}
                      </div>
                      {channel && (
                        <Space wrap align="baseline">
                          <Form.Item name="commission_type" label="佣金方式" style={{ marginBottom: 0 }}>
                            <Select allowClear style={{ width: 130 }} placeholder="不計佣金"
                              options={[{ value: 'percent', label: '百分比' }, { value: 'fixed', label: '固定金額' }]} />
                          </Form.Item>
                          {cType === 'percent' && (
                            <Form.Item name="commission_rate" label="比率(%)" style={{ marginBottom: 0 }}>
                              <InputNumber min={0} max={100} step={0.5} style={{ width: 110 }} />
                            </Form.Item>
                          )}
                          {cType === 'fixed' && (
                            <Form.Item name="commission_amount" label="金額" style={{ marginBottom: 0 }}>
                              <InputNumber min={0} step={1000} style={{ width: 150 }} />
                            </Form.Item>
                          )}
                          {cType && (
                            <span style={{ color: '#1668dc' }}>應付佣金 ≈ NT${preview.toLocaleString()}</span>
                          )}
                        </Space>
                      )}
                    </div>
                  </div>
                );
              }}
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </Card>
  );
} 