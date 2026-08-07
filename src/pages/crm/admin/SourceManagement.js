import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../../utils/api';

const SourceManagement = () => {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => { loadSources(); }, []);

  const loadSources = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/customer-sources`);
      if (!res.ok) throw new Error(`載入失敗 (${res.status})`);
      const data = await res.json();
      setSources(data.data || []);
    } catch (e) {
      console.error(e);
      message.error(`載入來源失敗：${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({ name: record.attributes.name });
    setModalOpen(true);
  };

  const save = async () => {
    try {
      const v = await form.validateFields();
      if (editingId) {
        const res = await fetch(`${API_BASE_URL}/api/customer-sources/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { name: v.name.trim() } }),
        });
        if (!res.ok) throw new Error(`更新失敗 (${res.status})`);
        message.success('來源已更新');
      } else {
        // 排序放最後(現有最大 sort_order + 1;「其他」固定 99 不算入)
        const maxSort = sources
          .filter(s => !s.attributes.is_other)
          .reduce((m, s) => Math.max(m, s.attributes.sort_order || 0), 0);
        const res = await fetch(`${API_BASE_URL}/api/customer-sources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { name: v.name.trim(), sort_order: maxSort + 1 } }),
        });
        if (!res.ok) throw new Error(`新增失敗 (${res.status})`);
        message.success('來源已新增');
      }
      setModalOpen(false);
      loadSources();
    } catch (e) {
      if (e.errorFields) return;
      message.error(`儲存失敗：${e.message}`);
    }
  };

  const remove = async (record) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/customer-sources/${record.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `刪除失敗 (${res.status})`);
      }
      const body = await res.json().catch(() => ({}));
      const n = body?.meta?.reassigned || 0;
      message.success(n > 0 ? `已刪除,${n} 筆資料已歸回「其他」` : '來源已刪除');
      loadSources();
    } catch (e) {
      message.error(`刪除失敗：${e.message}`);
    }
  };

  const columns = [
    { title: '來源名稱', dataIndex: ['attributes', 'name'], key: 'name', width: 240 },
    {
      title: '類型', key: 'type', width: 120,
      render: (_, r) => r.attributes.is_other
        ? <Tag color="default">系統預設</Tag>
        : <Tag color="blue">自訂</Tag>,
    },
    {
      title: '操作', key: 'action', width: 180,
      render: (_, r) => r.attributes.is_other ? (
        <span style={{ color: '#c0c0c0' }}>不可刪除</span>
      ) : (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>編輯</Button>
          <Popconfirm
            title="刪除此來源？"
            description="使用此來源的客戶／報名會自動歸回「其他」,不會遺失資料。"
            onConfirm={() => remove(r)}
            okText="刪除" cancelText="取消" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>刪除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="客戶來源管理"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadSources}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增來源</Button>
        </Space>
      }
      style={{ margin: 8, minHeight: 'calc(100vh - 96px)' }}
    >
      <div style={{ marginBottom: 12, color: '#8c8c8c', fontSize: 13 }}>
        來源用於客戶與報名的「客戶來源」欄位。可自行新增/刪除;刪除某來源時,原本使用它的客戶與報名會自動歸回「其他」。「其他」為系統預設,不可刪除。
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={sources}
        loading={loading}
        size="small"
        pagination={false}
      />

      <Modal
        title={editingId ? '編輯來源' : '新增來源'}
        open={modalOpen}
        onOk={save}
        onCancel={() => setModalOpen(false)}
        okText="儲存" cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="來源名稱" rules={[{ required: true, message: '請輸入來源名稱' }]}>
            <Input placeholder="例：FB、Google、朋友介紹" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SourceManagement;
