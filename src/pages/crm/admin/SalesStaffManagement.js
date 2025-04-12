import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Form, Input, Select, Switch, message } from 'antd';
import { UserAddOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../../utils/api';
import styles from './SalesStaffManagement.module.css';

const { Option } = Select;
const { confirm } = Modal;

const SalesStaffManagement = () => {
  const [salesStaff, setSalesStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [currentStaffId, setCurrentStaffId] = useState(null);

  useEffect(() => {
    fetchSalesStaff();
  }, []);

  const fetchSalesStaff = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/sales-staffs?populate=*`);
      const data = await response.json();
      console.log('Fetched sales staff:', data);
      setSalesStaff(data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching sales staff:', err);
      message.error('獲取銷售人員數據失敗，請稍後再試');
      setSalesStaff([]);
    } finally {
      setIsLoading(false);
    }
  };

  const showModal = (staff = null) => {
    setIsEditing(!!staff);
    setCurrentStaffId(staff ? staff.id : null);
    
    if (staff) {
      form.setFieldsValue({
        username: staff.attributes.username || '',
        email: staff.attributes.email || '',
        password: '',
        name: staff.attributes.name || '',
        role: staff.attributes.role || 'staff',
        phone: staff.attributes.phone || '',
        active: staff.attributes.active !== false
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        role: 'staff',
        active: true
      });
    }
    
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsLoading(true);
      
      // 確保電話號碼以字符串形式發送
      if (values.phone) {
        values.phone = values.phone.toString();
      }
      
      const url = isEditing 
        ? `${API_BASE_URL}/api/sales-staffs/${currentStaffId}`
        : `${API_BASE_URL}/api/sales-staffs`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      // 如果是編輯模式且没有输入新密码，則從提交數據中移除密碼欄位
      if (isEditing && !values.password) {
        delete values.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: values }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '操作失敗');
      }

      await fetchSalesStaff();
      message.success(isEditing ? '銷售人員資料已更新！' : '新銷售人員已成功創建！');
      setModalVisible(false);
      
    } catch (err) {
      console.error('Error saving sales staff:', err);
      message.error(err.message || '操作失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id) => {
    confirm({
      title: '確定要刪除此銷售人員嗎？',
      icon: <ExclamationCircleOutlined />,
      content: '此操作無法撤銷',
      okText: '確定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/sales-staffs/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('刪除失敗');
          }

          await fetchSalesStaff();
          message.success('銷售人員已成功刪除！');
          
        } catch (err) {
          console.error('Error deleting sales staff:', err);
          message.error('刪除銷售人員失敗，請稍後再試');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const columns = [
    {
      title: '用戶名',
      dataIndex: ['attributes', 'username'],
      key: 'username',
    },
    {
      title: '姓名',
      dataIndex: ['attributes', 'name'],
      key: 'name',
    },
    {
      title: '電子郵件',
      dataIndex: ['attributes', 'email'],
      key: 'email',
    },
    {
      title: '電話',
      dataIndex: ['attributes', 'phone'],
      key: 'phone',
    },
    {
      title: '角色',
      dataIndex: ['attributes', 'role'],
      key: 'role',
      render: (role) => (
        role === 'manager' ? '管理員' : '銷售人員'
      ),
    },
    {
      title: '狀態',
      dataIndex: ['attributes', 'active'],
      key: 'active',
      render: (active) => (
        <Tag color={active !== false ? 'green' : 'red'}>
          {active !== false ? '啟用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
            type="primary"
            ghost
          >
            編輯
          </Button>
          <Button 
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            danger
          >
            刪除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.salesStaffManagement}>
      <Card 
        title="銷售人員管理" 
        extra={
          <Button 
            type="primary" 
            icon={<UserAddOutlined />}
            onClick={() => showModal()}
          >
            新增銷售人員
          </Button>
        }
      >
        {error && <div className={styles.errorAlert}>{error}</div>}
        
        <Table
          columns={columns}
          dataSource={salesStaff || []}
          rowKey={record => record.id}
          loading={isLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={isEditing ? '編輯銷售人員' : '新增銷售人員'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        confirmLoading={isLoading}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            role: 'staff',
            active: true
          }}
        >
          <div className={styles.formRow}>
            <Form.Item
              name="username"
              label="用戶名"
              rules={[{ required: true, message: '請輸入用戶名' }]}
              className={styles.formCol}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="name"
              label="姓名"
              rules={[{ required: true, message: '請輸入姓名' }]}
              className={styles.formCol}
            >
              <Input />
            </Form.Item>
          </div>

          <div className={styles.formRow}>
            <Form.Item
              name="email"
              label="電子郵件"
              rules={[
                { required: true, message: '請輸入電子郵件' },
                { type: 'email', message: '請輸入有效的電子郵件' }
              ]}
              className={styles.formCol}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="phone"
              label="電話"
              className={styles.formCol}
              getValueFromEvent={(e) => {
                // 確保電話號碼始終以字符串形式存儲
                return e.target.value.toString();
              }}
            >
              <Input type="text" />
            </Form.Item>
          </div>

          <div className={styles.formRow}>
            <Form.Item
              name="password"
              label={isEditing ? '新密碼（如不修改請留空）' : '密碼'}
              rules={[
                { required: !isEditing, message: '請輸入密碼' }
              ]}
              className={styles.formCol}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              name="role"
              label="角色"
              rules={[{ required: true, message: '請選擇角色' }]}
              className={styles.formCol}
            >
              <Select>
                <Option value="staff">銷售人員</Option>
                <Option value="manager">管理員</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="active"
            valuePropName="checked"
          >
            <Switch checkedChildren="啟用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SalesStaffManagement; 