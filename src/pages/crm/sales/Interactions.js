import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Tag, DatePicker, Tooltip, Switch, InputNumber } from 'antd';
import { PlusOutlined, FilterOutlined, SearchOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, SmileTwoTone, MehTwoTone, FrownTwoTone, QuestionCircleTwoTone } from '@ant-design/icons';
import { API_BASE_URL } from '../../../utils/api';
import { fetchAllStrapi } from '../../../utils/strapiPaginate';
import * as XLSX from 'xlsx';

const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Interactions = () => {
  const [interactions, setInteractions] = useState([]);
  const [filteredInteractions, setFilteredInteractions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentInteraction, setCurrentInteraction] = useState(null);

  // 互動類型映射
  const interactionTypeMap = {
    phone_call: '電話聯絡',
    email: '電子郵件',
    meeting: '面對面會議',
    site_visit: '實地拜訪',
    other: '其他方式'
  };

  // 互動狀態映射
  const interactionStatusMap = {
    initial_contact: { text: '初次接觸', color: 'blue' },
    following_up: { text: '跟進中', color: 'cyan' },
    negotiating: { text: '洽談中', color: 'orange' },
    contract_signed: { text: '已簽約', color: 'green' },
    payment_received: { text: '已收款', color: 'lime' },
    completed: { text: '已完成', color: 'green' },
    pending: { text: '待處理', color: 'default' },
    cancelled: { text: '已取消', color: 'red' }
  };

  useEffect(() => {
    fetchInteractions();
    fetchCustomers();
    fetchProjects();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [interactions, searchKeyword]);

  const fetchInteractions = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user'));
      
      // 我的客戶 + 全部互動記錄並行抓
      const [myCustomers, allInteractions] = await Promise.all([
        fetchAllStrapi(API_BASE_URL, `/api/customers?filters[sales_staff][id][$eq]=${user.id}`),
        fetchAllStrapi(API_BASE_URL, `/api/interactions?populate[]=customer&populate[]=sales_staff&populate[]=project&sort[0]=date:desc`),
      ]);
      const myCustomerIds = new Set((myCustomers || []).map(c => c.id));

      const safe = (allInteractions || []).filter(it => {
        const custId = it?.attributes?.customer?.data?.id;
        const staffId = it?.attributes?.sales_staff?.data?.id;
        return staffId === user.id && myCustomerIds.has(custId);
      });

      setInteractions(safe);
      setFilteredInteractions(safe);
    } catch (error) {
      console.error('Error fetching interactions:', error);
      message.error('獲取互動記錄失敗');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const allCustomers = await fetchAllStrapi(
        API_BASE_URL,
        `/api/customers?filters[sales_staff][id][$eq]=${user.id}&populate=*`
      );
      setCustomers(allCustomers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/projects?pagination[pageSize]=1000`);
      const data = await resp.json();
      setProjects(data?.data || []);
    } catch (e) {
      console.error('Error fetching projects:', e);
    }
  };

  const handleAddInteraction = () => {
    form.resetFields();
    form.setFieldsValue({
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      is_deal: false,
    });
    setAddModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const user = JSON.parse(localStorage.getItem('user'));
      
      let apiMethod = 'POST';
      let apiUrl = `${API_BASE_URL}/api/interactions`;
      let successMessage = '聯絡記錄已添加';
      
      if (currentInteraction) {
        apiMethod = 'PUT';
        apiUrl = `${API_BASE_URL}/api/interactions/${currentInteraction.id}`;
        successMessage = '聯絡記錄已更新';
      }

      const normalizeDate = (val) => {
        if (!val) return null;
        try {
          if (typeof val.format === 'function') return val.format('YYYY-MM-DD');
          const d = new Date(val);
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        } catch {}
        return null;
      };

      const dataPayload = {
        customer: Number(values.customer),
        sales_staff: Number(user.id),
        type: values.type,
        date: normalizeDate(values.date) || new Date().toISOString().split('T')[0],
        status: values.status,
        ...(values.notes ? { notes: values.notes } : {}),
        ...(values.next_follow_up ? { next_follow_up: normalizeDate(values.next_follow_up) } : {}),
        ...(values.outcome ? { outcome: values.outcome } : {}),
        ...(values.project ? { project: Number(values.project) } : {}),
        ...(values.is_deal
          ? { is_deal: true, deal_amount: Number(values.deal_amount || 0), payment_date: normalizeDate(values.payment_date) }
          : { is_deal: false })
      };

      const tokenRaw = localStorage.getItem('jwt') || localStorage.getItem('token') || '';
      const bearer = tokenRaw && tokenRaw.includes('.') ? `Bearer ${tokenRaw}` : undefined;

      const response = await fetch(apiUrl, {
        method: apiMethod,
        headers: {
          'Content-Type': 'application/json',
          ...(bearer ? { Authorization: bearer } : {}),
        },
        body: JSON.stringify({ data: dataPayload }),
      });

      if (!response.ok) {
        let err = null;
        try { err = await response.json(); } catch (_) {}
        console.error('Save interaction failed:', err);
        throw new Error(currentInteraction ? '更新聯絡記錄失敗' : '創建聯絡記錄失敗');
      }

      message.success(successMessage);
      setAddModalVisible(false);
      setCurrentInteraction(null);
      fetchInteractions();
    } catch (error) {
      console.error('Error:', error);
      message.error(currentInteraction ? '更新聯絡記錄失敗' : '創建聯絡記錄失敗');
    }
  };

  const handleEdit = (record) => {
    setCurrentInteraction(record);
    form.setFieldsValue({
      customer: record.attributes.customer?.data?.id,
      type: record.attributes.type,
      notes: record.attributes.notes,
      date: record.attributes.date,
      next_follow_up: record.attributes.next_follow_up,
      status: record.attributes.status,
      outcome: record.attributes.outcome || null,
      project: record.attributes.project?.data?.id || null,
      is_deal: !!record.attributes.is_deal,
      deal_amount: record.attributes.is_deal ? record.attributes.deal_amount : null,
      payment_date: record.attributes.is_deal ? record.attributes.payment_date : null,
    });
    setAddModalVisible(true);
  };

  // 刪除互動記錄
  const handleDelete = (record) => {
    Modal.confirm({
      title: '確認刪除',
      content: `確定要刪除與客戶「${record.attributes.customer?.data?.attributes?.name || '未知客戶'}」的互動記錄嗎？`,
      okText: '確定刪除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/interactions/${record.id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('刪除失敗');
          }

          message.success('互動記錄已刪除');
          fetchInteractions(); // 重新載入資料
        } catch (error) {
          console.error('Error deleting interaction:', error);
          message.error('刪除互動記錄失敗');
        }
      }
    });
  };

  const handleSearch = (e) => {
    setSearchKeyword(e.target.value);
  };

  const handleFilter = async () => {
    try {
      const values = await filterForm.validateFields();
      applyFilters(values);
    } catch (error) {
      console.error('Filter form validation error:', error);
    }
  };

  const handleResetFilter = () => {
    filterForm.resetFields();
    setSearchKeyword('');
    setFilteredInteractions(interactions);
    setFilterVisible(false);
  };

  const applyFilters = (formValues = null) => {
    try {
      let filtered = [...interactions];
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        filtered = filtered.filter(interaction => 
          (interaction.attributes.customer?.data?.attributes?.name && 
            interaction.attributes.customer.data.attributes.name.toLowerCase().includes(keyword)) ||
          (interaction.attributes.notes && interaction.attributes.notes.toLowerCase().includes(keyword))
        );
      }
      if (formValues) {
        if (formValues.type && formValues.type.length > 0) {
          filtered = filtered.filter(interaction => 
            interaction.attributes.type && formValues.type.includes(interaction.attributes.type)
          );
        }
        if (formValues.status && formValues.status.length > 0) {
          filtered = filtered.filter(interaction => 
            interaction.attributes.status && formValues.status.includes(interaction.attributes.status)
          );
        }
        if (formValues.customer) {
          filtered = filtered.filter(interaction => 
            interaction.attributes.customer?.data?.id === formValues.customer
          );
        }
        if (formValues.dateRange && formValues.dateRange[0] && formValues.dateRange[1]) {
          const toDate = (v) => (v && typeof v.toDate === 'function') ? v.toDate() : new Date(v);
          const startDate = toDate(formValues.dateRange[0]);
          startDate.setHours(0, 0, 0, 0);
          const endDate = toDate(formValues.dateRange[1]);
          endDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter(interaction => {
            if (!interaction.attributes.date) return false;
            const interactionDate = new Date(interaction.attributes.date);
            return interactionDate >= startDate && interactionDate <= endDate;
          });
        }
      }
      if (filtered.length !== interactions.length) {
        message.info(`共找到 ${filtered.length} 筆聯絡記錄`);
      }
      setFilteredInteractions(filtered);
    } catch (error) {
      console.error('Error applying filters:', error);
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
        message.loading('正在生成Excel文件...', 1);
        const exportData = filteredInteractions.map(interaction => ({
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

  const getTodayFollowUps = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return interactions.filter(interaction => {
      if (!interaction.attributes.next_follow_up) return false;
      const followUpDate = new Date(interaction.attributes.next_follow_up);
      followUpDate.setHours(0, 0, 0, 0);
      return followUpDate.getTime() === today.getTime();
    }).length;
  };

  const columns = [
    {
      title: '客戶',
      dataIndex: ['attributes', 'customer', 'data', 'attributes', 'name'],
      key: 'customer',
      render: (_, record) => {
        return record.attributes.customer?.data?.attributes?.name || '-';
      }
    },
    { title: '聯絡類型', dataIndex: ['attributes', 'type'], key: 'type', render: (type) => interactionTypeMap[type] || type },
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
    {
      title: '聯絡結果', 
      dataIndex: ['attributes', 'outcome'], 
      key: 'outcome', 
      render: (outcome) => {
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
      }
    },
    { title: '相關建案', key: 'project', render: (_, r) => r.attributes.project?.data?.attributes?.name || '-' },
    { title: '是否成交', dataIndex: ['attributes', 'is_deal'], key: 'is_deal', render: (is_deal) => is_deal ? '是' : '否' },
    { title: '成交金額', dataIndex: ['attributes', 'deal_amount'], key: 'deal_amount', render: (deal_amount) => deal_amount || '-' },
    { title: '入帳日期', dataIndex: ['attributes', 'payment_date'], key: 'payment_date', render: (payment_date) => payment_date || '-' },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="編輯">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" />
          </Tooltip>
          <Tooltip title="刪除">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} size="small" />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          聯絡記錄
          {getTodayFollowUps() > 0 && (
            <Tag color="red" style={{ marginLeft: 8 }}>
              今日待跟進: {getTodayFollowUps()}
            </Tag>
          )}
        </div>
      }
      extra={
        <Space>
          <Input
            placeholder="搜索客戶姓名或聯絡內容"
            value={searchKeyword}
            onChange={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
          />
          <Button icon={<FilterOutlined />} onClick={() => setFilterVisible(!filterVisible)}>篩選</Button>
          <Button icon={<ReloadOutlined />} onClick={() => fetchInteractions()}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddInteraction}>新增聯絡</Button>
          <Button onClick={exportToExcel}>導出Excel</Button>
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
          <Form form={filterForm} layout="horizontal" onFinish={handleFilter}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
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
                <Select placeholder="選擇客戶" style={{ width: '200px' }} showSearch filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}>
                  <Option value="">全部</Option>
                  {customers.map(customer => (
                    <Option key={customer.id} value={customer.id}>{customer.attributes.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="dateRange" label="聯絡日期" style={{ minWidth: '300px' }}>
                <RangePicker />
              </Form.Item>
              <Form.Item style={{ marginLeft: 'auto' }}>
                <Space>
                  <Button type="primary" htmlType="submit">篩選</Button>
                  <Button onClick={handleResetFilter}>重置</Button>
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
        提示：可搜尋「客戶姓名」或「聯絡內容」關鍵字
      </div>

      <Table columns={columns} dataSource={filteredInteractions} rowKey={record => record.id} loading={loading} scroll={{ x: 1000 }} />

      <Modal
        title={currentInteraction ? "編輯聯絡記錄" : "新增聯絡記錄"}
        open={addModalVisible}
        onOk={handleSubmit}
        onCancel={() => { setAddModalVisible(false); setCurrentInteraction(null); }}
        okText="保存"
        cancelText="取消"
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="customer" label="客戶" rules={[{ required: true, message: '請選擇客戶' }]}>
            <Select placeholder="輸入客戶名稱搜尋" showSearch optionFilterProp="children" filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}>
              {customers.map(customer => (
                <Option key={customer.id} value={customer.id}>{customer.attributes.name}</Option>
              ))}
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
            <Select placeholder="選擇聯絡結果">
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
            <Form.Item shouldUpdate={(prev, curr) => prev.is_deal !== curr.is_deal}>
              {({ getFieldValue }) => getFieldValue('is_deal') ? (
                <div style={{ display: 'contents' }}>
                  <Form.Item name="deal_amount" label="成交金額" rules={[{ required: true, message: '請輸入成交金額' }]}>
                    <InputNumber style={{ width: '100%' }} min={0} step={10000} placeholder="輸入金額（元）" />
                  </Form.Item>
                  <Form.Item name="payment_date" label="入帳日期" rules={[{ required: true, message: '請選擇入帳日期' }]}>
                    <Input type="date" />
                  </Form.Item>
                </div>
              ) : null}
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </Card>
  );
};

export default Interactions; 