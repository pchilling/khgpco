import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Tag, Modal, Form, Input, Select, InputNumber,
  DatePicker, message, Popconfirm, Divider, Tooltip, Row, Col, Empty,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  EnvironmentOutlined, TeamOutlined, CalendarOutlined, ApartmentOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { API_BASE_URL } from '../../../utils/api';
import { fetchAllStrapi } from '../../../utils/strapiPaginate';

const { TextArea } = Input;
const LOCALE = 'zh-Hant-TW';

// 活動/建案寫入走 sales-staff JWT 中介層,但 events/projects 的 GET 是公開
// (不在攔截器保護清單),所以寫入時要「手動」帶 token。
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

const STATUS = { upcoming: { text: '即將舉行', color: 'green' }, ended: { text: '已結束', color: 'default' } };

const EventManagement = () => {
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();
  // 編輯時:各場次(依 index)已有多少報名 → 防呆(有報名的場次不給刪,避免 sessionIndex 錯位)
  const [sessionRegCounts, setSessionRegCounts] = useState({});
  const [saving, setSaving] = useState(false);

  // 建案下拉即時新增用
  const [newProjectName, setNewProjectName] = useState('');
  const [addingProject, setAddingProject] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [evs, projs] = await Promise.all([
        fetchAllStrapi(API_BASE_URL, `/api/events?locale=${LOCALE}&populate[session]=*&populate[related_project][fields][0]=name&sort=createdAt:desc`),
        fetchAllStrapi(API_BASE_URL, `/api/projects?locale=${LOCALE}&fields[0]=name&sort=name:asc`),
      ]);
      setEvents(evs);
      setProjects(projs);
    } catch (e) {
      console.error(e);
      message.error(`載入活動失敗：${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 讀某活動各場次的報名數(防呆用)
  const loadSessionRegCounts = async (eventId) => {
    try {
      const regs = await fetchAllStrapi(API_BASE_URL, `/api/registrations?filters[event][id][$eq]=${eventId}&fields[0]=sessionIndex`);
      const counts = {};
      regs.forEach(r => {
        const idx = r.attributes?.sessionIndex;
        if (idx !== null && idx !== undefined) counts[idx] = (counts[idx] || 0) + 1;
      });
      setSessionRegCounts(counts);
    } catch (e) {
      console.error('讀取場次報名數失敗', e);
      setSessionRegCounts({});
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setSessionRegCounts({});
    form.resetFields();
    form.setFieldsValue({ status: 'upcoming', session: [{}] });
    setModalOpen(true);
  };

  const openEdit = async (record) => {
    setEditingId(record.id);
    const a = record.attributes;
    const sessions = (a.session || []).map(s => ({
      location: s.location,
      startDateTime: s.startDateTime ? dayjs(s.startDateTime) : null,
      endDateTime: s.endDateTime ? dayjs(s.endDateTime) : null,
      maxParticipants: s.maxParticipants,
    }));
    form.setFieldsValue({
      title: a.title,
      description: a.description,
      status: a.status || 'upcoming',
      related_project: a.related_project?.data?.id || null,
      eventlink: a.eventlink,
      session: sessions.length ? sessions : [{}],
    });
    setModalOpen(true);
    loadSessionRegCounts(record.id);
  };

  const save = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const session = (v.session || []).map(s => ({
        location: s.location || null,
        startDateTime: s.startDateTime ? dayjs(s.startDateTime).toISOString() : null,
        endDateTime: s.endDateTime ? dayjs(s.endDateTime).toISOString() : null,
        maxParticipants: s.maxParticipants ?? null,
      }));
      const payload = {
        data: {
          title: v.title,
          description: v.description || null,
          status: v.status || 'upcoming',
          related_project: v.related_project || null,
          eventlink: v.eventlink || null,
          session,
        },
      };
      const url = editingId ? `${API_BASE_URL}/api/events/${editingId}` : `${API_BASE_URL}/api/events`;
      const res = await fetch(url, { method: editingId ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`儲存失敗 (${res.status})`);
      message.success(editingId ? '活動已更新' : '活動已新增');
      setModalOpen(false);
      loadAll();
    } catch (e) {
      if (e.errorFields) return;
      message.error(`儲存失敗：${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/${record.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error(`刪除失敗 (${res.status})`);
      message.success('活動已刪除');
      loadAll();
    } catch (e) {
      message.error(`刪除失敗：${e.message}`);
    }
  };

  // 下拉即時新增建案(輕量:只存名稱)
  const addProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    setAddingProject(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ data: { name, locale: LOCALE } }),
      });
      if (!res.ok) throw new Error(`新增建案失敗 (${res.status})`);
      const body = await res.json();
      const created = body?.data;
      const id = created?.id;
      const newItem = { id, attributes: { name } };
      setProjects(prev => [...prev, newItem].sort((a, b) => (a.attributes.name || '').localeCompare(b.attributes.name || '')));
      form.setFieldsValue({ related_project: id });
      setNewProjectName('');
      message.success(`已新增建案「${name}」`);
    } catch (e) {
      message.error(`新增建案失敗：${e.message}`);
    } finally {
      setAddingProject(false);
    }
  };

  const columns = [
    { title: '活動名稱', dataIndex: ['attributes', 'title'], key: 'title', width: 300, ellipsis: true },
    {
      title: '關聯建案', key: 'project', width: 160,
      render: (_, r) => r.attributes.related_project?.data?.attributes?.name || <span style={{ color: '#c0c0c0' }}>—</span>,
    },
    {
      title: '場次數', key: 'sessions', width: 90, align: 'center',
      render: (_, r) => (r.attributes.session?.length || 0),
    },
    {
      title: '狀態', dataIndex: ['attributes', 'status'], key: 'status', width: 110, align: 'center',
      render: (s) => { const m = STATUS[s] || {}; return <Tag color={m.color || 'default'}>{m.text || s || '未設定'}</Tag>; },
    },
    {
      title: '操作', key: 'action', width: 160,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>編輯</Button>
          <Popconfirm
            title="刪除此活動？"
            description="活動刪除後,已報名者的活動關聯會消失(報名資料本身不刪)。"
            onConfirm={() => remove(r)} okText="刪除" cancelText="取消" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>刪除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={<span><CalendarOutlined style={{ color: '#1668dc', marginRight: 8 }} />活動管理</span>}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadAll}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增活動</Button>
        </Space>
      }
      style={{ margin: 8 }}
    >
      <Table
        rowKey="id" columns={columns} dataSource={events} loading={loading}
        size="small" scroll={{ x: 900 }} pagination={{ pageSize: 20, showSizeChanger: true }}
      />

      <Modal
        title={editingId ? '編輯活動' : '新增活動'}
        open={modalOpen}
        onOk={save}
        confirmLoading={saving}
        onCancel={() => setModalOpen(false)}
        okText="儲存" cancelText="取消"
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="title" label="活動名稱" rules={[{ required: true, message: '請輸入活動名稱' }]}>
            <Input size="large" placeholder="例：台中七期豪宅投資說明會" />
          </Form.Item>
          <Form.Item name="description" label="活動說明">
            <TextArea rows={2} placeholder="活動簡介（選填）" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="status" label="狀態">
                <Select options={Object.entries(STATUS).map(([k, v]) => ({ value: k, label: v.text }))} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="related_project" label={<span><ApartmentOutlined /> 關聯建案</span>} extra="這場活動在推哪個建案">
                <Select
                  allowClear showSearch optionFilterProp="label" placeholder="選擇或新增建案"
                  options={projects.map(p => ({ value: p.id, label: p.attributes.name }))}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space style={{ padding: '0 8px 4px' }}>
                        <Input
                          placeholder="新建案名稱" value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                        <Button type="text" icon={<PlusOutlined />} loading={addingProject} onClick={addProject}>新增</Button>
                      </Space>
                    </>
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="eventlink" label="活動連結（選填）">
            <Input placeholder="https://..." />
          </Form.Item>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 14px' }}>
            <CalendarOutlined style={{ color: '#1668dc' }} />
            <span style={{ fontWeight: 600, fontSize: 15, color: '#262626' }}>場次</span>
            <Form.Item noStyle shouldUpdate={(p, c) => p.session !== c.session}>
              {({ getFieldValue }) => {
                const n = (getFieldValue('session') || []).length;
                return <span style={{ color: '#8c8c8c', fontSize: 13 }}>共 {n} 場</span>;
              }}
            </Form.Item>
            <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
          </div>

          <Form.List name="session">
            {(fields, { add, remove: removeField }) => (
              <>
                {fields.map((field, idx) => {
                  const hasRegs = (sessionRegCounts[idx] || 0) > 0;
                  const isLast = idx === fields.length - 1;
                  const canDelete = fields.length > 1 && !hasRegs && isLast;
                  return (
                    <div
                      key={field.key}
                      style={{
                        border: '1px solid #eef0f2', borderRadius: 12, padding: '14px 16px 2px',
                        marginBottom: 12, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            width: 26, height: 26, borderRadius: '50%', background: '#1668dc', color: '#fff',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
                          }}>{idx + 1}</span>
                          <span style={{ fontWeight: 600, color: '#262626' }}>場次 {idx + 1}</span>
                          {hasRegs && <Tag color="orange" bordered={false}>已有 {sessionRegCounts[idx]} 筆報名</Tag>}
                        </div>
                        {/* 防呆:只允許刪「最後一個且無報名」的場次,避免 sessionIndex 錯位 */}
                        <Tooltip title={hasRegs ? '此場次已有報名,不可刪除' : (!isLast ? '只能從最後一個場次刪除' : (fields.length <= 1 ? '至少保留一個場次' : '刪除此場次'))}>
                          <Button
                            type="text" danger shape="circle" size="small" icon={<DeleteOutlined />}
                            disabled={!canDelete}
                            onClick={() => removeField(field.name)}
                          />
                        </Tooltip>
                      </div>
                      <Row gutter={12}>
                        <Col span={16}>
                          <Form.Item name={[field.name, 'location']} label="地點" style={{ marginBottom: 12 }}>
                            <Input prefix={<EnvironmentOutlined style={{ color: '#c0c0c0' }} />} placeholder="例：台中市西屯區…展廳" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item name={[field.name, 'maxParticipants']} label={<span><TeamOutlined /> 人數上限</span>} style={{ marginBottom: 12 }}>
                            <InputNumber min={0} style={{ width: '100%' }} placeholder="不限" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item name={[field.name, 'startDateTime']} label="開始時間" style={{ marginBottom: 12 }}>
                            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} placeholder="開始" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name={[field.name, 'endDateTime']} label="結束時間" style={{ marginBottom: 12 }}>
                            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} placeholder="結束" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>
                  );
                })}
                {fields.length === 0 && (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚無場次" style={{ margin: '8px 0' }} />
                )}
                <Button type="dashed" onClick={() => add({})} icon={<PlusOutlined />} block style={{ height: 42, borderRadius: 10 }}>
                  新增場次
                </Button>
                <div style={{ color: '#bbb', fontSize: 12, marginTop: 8 }}>
                  已有報名的場次不可刪除（保護報名對應的場次順序）；可自由修改場次內容或往後新增。
                </div>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Card>
  );
};

export default EventManagement;
