import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Form, Input, Select, Switch, Tabs, Tooltip, message } from 'antd';
import { PlusOutlined, EditOutlined, ApartmentOutlined, ContactsOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../../utils/api';

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
        defaultActiveKey="people"
        items={[
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
