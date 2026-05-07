import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import styles from './Profile.module.css';
import { API_BASE_URL } from '../../../utils/api';

const Profile = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    if (!userData) return;

    // 先顯示不可編輯的 username
    form.setFieldsValue({ username: userData.username });

    // 從後端取回 email/phone 並預填
    (async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/sales-staffs/${userData.id}`);
        if (!resp.ok) return;
        const data = await resp.json();
        const attrs = data?.data?.attributes || {};
      form.setFieldsValue({
          email: attrs.email || '',
          phone: attrs.phone || ''
      });
      } catch (e) {
        console.error('載入個人資料失敗:', e);
    }
    })();
  }, [form]);

  const onFinish = async (values) => {
    if (!user) return;
    setLoading(true);
    try {
      const payload = { data: { email: values.email || null, phone: values.phone || null } };
      const resp = await fetch(`${API_BASE_URL}/api/sales-staffs/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('更新失敗');

      // 同步到 localStorage，讓下次開啟仍能看到
      const stored = JSON.parse(localStorage.getItem('user') || 'null') || {};
      localStorage.setItem('user', JSON.stringify({ ...stored, email: values.email || null, phone: values.phone || null }));

      message.success('個人資料更新成功');
    } catch (error) {
      console.error('更新個人資料失敗:', error);
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