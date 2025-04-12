import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Tag, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, ExportOutlined, UserSwitchOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import styles from './CustomerManagement.module.css';
import { API_BASE_URL } from '../../../utils/api';

const { TextArea } = Input;
const { Option } = Select;

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [salesStaff, setSalesStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [batchAssignModalVisible, setBatchAssignModalVisible] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  const statusMap = {
    potential: { text: '潛在客戶', color: 'blue' },
    contacted: { text: '已聯繫', color: 'cyan' },
    negotiating: { text: '洽談中', color: 'orange' },
    closed: { text: '已成交', color: 'green' },
    lost: { text: '已流失', color: 'red' }
  };

  const sourceMap = {
    website: '網站',
    event: '活動',
    referral: '推薦',
    other: '其他'
  };

  useEffect(() => {
    fetchCustomers();
    fetchSalesStaff();
  }, []);

  const fetchSalesStaff = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sales-staffs`);
      const data = await response.json();
      setSalesStaff(data.data);
    } catch (error) {
      console.error('Error fetching sales staff:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/customers?populate=*`);
      const data = await response.json();
      setCustomers(data.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      message.error('獲取客戶資料失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    setCurrentCustomer(record);
    form.setFieldsValue({
      name: record.attributes.name,
      phone: record.attributes.phone,
      email: record.attributes.email,
      address: record.attributes.address,
      notes: record.attributes.notes,
      status: record.attributes.status,
      source: record.attributes.source,
    });
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const response = await fetch(`${API_BASE_URL}/api/customers/${currentCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: values }),
      });

      if (!response.ok) throw new Error('更新失敗');

      message.success('客戶資料已更新');
      setEditModalVisible(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      message.error('更新客戶資料失敗');
    }
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: '確認刪除',
      content: `確定要刪除客戶 ${record.attributes.name} 嗎？`,
      okText: '確認',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/customers/${record.id}`, {
            method: 'DELETE',
          });

          if (!response.ok) throw new Error('刪除失敗');

          message.success('客戶已刪除');
          fetchCustomers();
        } catch (error) {
          console.error('Error deleting customer:', error);
          message.error('刪除客戶失敗');
        }
      },
    });
  };

  const handleAssign = (record) => {
    setCurrentCustomer(record);
    assignForm.setFieldsValue({
      sales_staff: record.attributes.sales_staff?.data?.id
    });
    setAssignModalVisible(true);
  };

  const handleAssignSubmit = async () => {
    try {
      const values = await assignForm.validateFields();
      const response = await fetch(`${API_BASE_URL}/api/customers/${currentCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            sales_staff: values.sales_staff
          }
        }),
      });

      if (!response.ok) throw new Error('指派失敗');

      message.success('已成功指派業務');
      setAssignModalVisible(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error assigning sales staff:', error);
      message.error('指派業務失敗');
    }
  };

  const handleBatchAssign = async () => {
    if (!selectedStaff) {
      message.error('請選擇業務');
      return;
    }

    try {
      await Promise.all(selectedRows.map(record => 
        fetch(`${API_BASE_URL}/api/customers/${record.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              sales_staff: selectedStaff
            }
          })
        })
      ));

      message.success('成功批量指派業務');
      setBatchAssignModalVisible(false);
      setSelectedRows([]);
      setSelectedStaff(null);
      fetchCustomers();
    } catch (error) {
      console.error('Error batch assigning:', error);
      message.error('批量指派失敗');
    }
  };

  const exportToExcel = () => {
    const exportData = customers.map(customer => ({
      '姓名': customer.attributes.name,
      '電話': `'${customer.attributes.phone}`,
      '電子郵件': customer.attributes.email,
      '地址': customer.attributes.address,
      '備註': customer.attributes.notes,
      '狀態': statusMap[customer.attributes.status]?.text,
      '來源': sourceMap[customer.attributes.source],
      '負責業務': customer.attributes.sales_staff?.data?.attributes?.username || '未指派',
      '創建時間': new Date(customer.attributes.createdAt).toLocaleString(),
      '更新時間': new Date(customer.attributes.updatedAt).toLocaleString(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    if (!ws['!cols']) ws['!cols'] = [];
    ws['!cols'][1] = { wch: 15, t: 's' };
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '客戶資料');
    XLSX.writeFile(wb, `客戶資料_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: ['attributes', 'name'],
      key: 'name',
    },
    {
      title: '電話',
      dataIndex: ['attributes', 'phone'],
      key: 'phone',
    },
    {
      title: '電子郵件',
      dataIndex: ['attributes', 'email'],
      key: 'email',
    },
    {
      title: '狀態',
      dataIndex: ['attributes', 'status'],
      key: 'status',
      render: (status) => (
        <Tag color={statusMap[status]?.color}>
          {statusMap[status]?.text}
        </Tag>
      ),
    },
    {
      title: '來源',
      dataIndex: ['attributes', 'source'],
      key: 'source',
      render: (source) => sourceMap[source],
    },
    {
      title: '負責業務',
      dataIndex: ['attributes', 'sales_staff', 'data', 'attributes', 'username'],
      key: 'sales_staff',
      render: (text) => text || '未指派'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="編輯">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)} 
            />
          </Tooltip>
          <Tooltip title="指派業務">
            <Button 
              type="text" 
              icon={<UserSwitchOutlined />} 
              onClick={() => handleAssign(record)} 
            />
          </Tooltip>
          <Tooltip title="刪除">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDelete(record)} 
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.customerManagement}>
      <Card
        title="客戶管理"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<UserSwitchOutlined />}
              onClick={() => setBatchAssignModalVisible(true)}
              disabled={selectedRows.length === 0}
            >
              批量指派
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={exportToExcel}
            >
              導出Excel
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={customers}
          rowKey={record => record.id}
          loading={loading}
          rowSelection={{
            onChange: (_, rows) => setSelectedRows(rows),
            selectedRowKeys: selectedRows.map(row => row.id),
          }}
        />
      </Card>

      <Modal
        title="編輯客戶資料"
        open={editModalVisible}
        onOk={handleSave}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '請輸入姓名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="電話"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="電子郵件"
            rules={[{ type: 'email', message: '請輸入有效的電子郵件' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="address"
            label="地址"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="status"
            label="狀態"
            rules={[{ required: true, message: '請選擇狀態' }]}
          >
            <Select>
              {Object.entries(statusMap).map(([value, { text }]) => (
                <Select.Option key={value} value={value}>
                  {text}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="source"
            label="來源"
            rules={[{ required: true, message: '請選擇來源' }]}
          >
            <Select>
              {Object.entries(sourceMap).map(([value, text]) => (
                <Select.Option key={value} value={value}>
                  {text}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="notes"
            label="備註"
          >
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="指派業務"
        open={assignModalVisible}
        onOk={handleAssignSubmit}
        onCancel={() => setAssignModalVisible(false)}
        okText="確認"
        cancelText="取消"
      >
        <Form
          form={assignForm}
          layout="vertical"
        >
          <Form.Item
            name="sales_staff"
            label="選擇業務"
            rules={[{ required: true, message: '請選擇業務' }]}
          >
            <Select>
              {salesStaff.map(staff => (
                <Option key={staff.id} value={staff.id}>
                  {staff.attributes.username}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量指派業務"
        open={batchAssignModalVisible}
        onOk={handleBatchAssign}
        onCancel={() => {
          setBatchAssignModalVisible(false);
          setSelectedStaff(null);
        }}
        okText="確認"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          已選擇 {selectedRows.length} 個客戶
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="選擇業務"
          onChange={value => setSelectedStaff(value)}
          value={selectedStaff}
        >
          {salesStaff.map(staff => (
            <Option key={staff.id} value={staff.id}>
              {staff.attributes.username}
            </Option>
          ))}
        </Select>
      </Modal>
    </div>
  );
};

export default CustomerManagement; 