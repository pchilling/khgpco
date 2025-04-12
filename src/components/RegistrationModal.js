import React, { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { API_BASE_URL } from '../utils/api';
import '../styles/RegistrationModal.css';

const RegistrationModal = ({ isOpen, onClose, eventId, sessionIndex, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();
            console.log('Form values:', values);
            console.log('Event ID:', eventId);
            console.log('Session Index:', sessionIndex);

            // 構建註冊數據
            const registrationData = {
                data: {
                    name: values.name,
                    phone: values.phone,
                    email: values.email,
                    notes: values.notes,
                    event: eventId,
                    sessionIndex: sessionIndex,
                    status: 'pending'
                }
            };

            console.log('Sending registration data:', registrationData);

            const response = await fetch(`${API_BASE_URL}/api/registrations`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registrationData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API error:', response.status);
                console.error('API error details:', errorData);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Registration successful:', data);

            message.success('報名成功！');
            form.resetFields();
            onClose();
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Error submitting registration:', error);
            if (error.response) {
                console.error('Server error details:', {
                    status: error.response.status,
                    data: error.response.data
                });
            }
            message.error('報名失敗，請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="活動報名"
            open={isOpen}
            onCancel={() => {
                form.resetFields();
                onClose();
            }}
            onOk={handleSubmit}
            okText="確認報名"
            cancelText="取消"
            confirmLoading={loading}
        >
            <Form
                form={form}
                layout="vertical"
                name="registration_form"
            >
                <Form.Item
                    name="name"
                    label="姓名"
                    rules={[
                        { required: true, message: '請輸入姓名' },
                        { max: 50, message: '姓名不能超過50個字符' }
                    ]}
                >
                    <Input placeholder="請輸入您的姓名" />
                </Form.Item>

                <Form.Item
                    name="phone"
                    label="電話"
                    rules={[
                        { required: true, message: '請輸入電話號碼' },
                        { pattern: /^[0-9+\-()]*$/, message: '請輸入有效的電話號碼' }
                    ]}
                >
                    <Input placeholder="請輸入您的電話號碼" />
                </Form.Item>

                <Form.Item
                    name="email"
                    label="電子郵件"
                    rules={[
                        { required: true, message: '請輸入電子郵件' },
                        { type: 'email', message: '請輸入有效的電子郵件地址' }
                    ]}
                >
                    <Input placeholder="請輸入您的電子郵件" />
                </Form.Item>

                <Form.Item
                    name="notes"
                    label="備註"
                    rules={[
                        { max: 500, message: '備註不能超過500個字符' }
                    ]}
                >
                    <Input.TextArea 
                        placeholder="如有特殊需求請在此說明"
                        rows={4}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default RegistrationModal; 