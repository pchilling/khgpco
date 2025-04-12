import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import styles from './Profile.module.css';

const Profile = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 從 localStorage 獲取用戶信息
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    if (userData) {
      form.setFieldsValue({
        username: userData.username,
        email: userData.email || '',
        phone: userData.phone || ''
      });
    }
  }, [form]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // TODO: 實現更新個人資料的 API 調用
      message.success('個人資料更新成功');
    } catch (error) {
      message.error('更新失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.profileContainer}>
      <Card title="個人資料" className={styles.profileCard}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className={styles.profileForm}
        >
          <Form.Item
            label="用戶名"
            name="username"
            rules={[{ required: true, message: '請輸入用戶名' }]}
          >
            <Input prefix={<UserOutlined />} disabled />
          </Form.Item>

          <Form.Item
            label="電子郵件"
            name="email"
            rules={[
              { type: 'email', message: '請輸入有效的電子郵件地址' }
            ]}
          >
            <Input prefix={<MailOutlined />} />
          </Form.Item>

          <Form.Item
            label="電話"
            name="phone"
            rules={[
              { pattern: /^[0-9]+$/, message: '請輸入有效的電話號碼' }
            ]}
          >
            <Input prefix={<PhoneOutlined />} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              更新資料
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Profile; 