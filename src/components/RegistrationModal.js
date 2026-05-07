import React, { useState } from 'react';
import { Modal, Form, Input, message, Result, Button, Select, Switch } from 'antd';
import { API_BASE_URL } from '../utils/api';
import '../styles/RegistrationModal.css';

const RegistrationModal = ({ isOpen, onClose, eventId, sessionIndex, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [hasOverseasInvestment, setHasOverseasInvestment] = useState(false);

    const attendanceOptions = [
        { value: 'attendance1', label: '1人' },
        { value: 'attendance2', label: '2人' },
        { value: 'attendance3', label: '3人' },
        { value: 'attendance4', label: '4人' },
        { value: 'attendance5', label: '5人' }
    ];

    const budgetOptions = [
        { value: 'budget_unknown', label: '未知' },
        { value: 'budget_under_ten', label: '一千萬以下' },
        { value: 'budget_ten_to_twenty', label: '一千萬到兩千萬' },
        { value: 'budget_twenty_to_thirty', label: '兩千萬到三千萬' },
        { value: 'budget_above_thirty', label: '三千萬以上' }
    ];

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            const values = await form.validateFields();

            // 構建註冊數據
            const registrationData = {
                data: {
                    name: values.name,
                    phone: values.phone,
                    ...(values.email && values.email.trim() ? { email: values.email.trim() } : {}),
                    notes: values.notes,
                    event: eventId,
                    sessionIndex: sessionIndex,
                    attendanceCount: values.attendanceCount,
                    status: 'pending',
                    has_overseas_investment: values.has_overseas_investment,
                    overseas_investment_notes: values.overseas_investment_notes,
                    budget_range: values.budget_range
                }
            };


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
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // 顯示成功訊息
            setSubmitted(true);
            message.success('報名成功！');

            // 延遲調用 onSuccess 回調
            if (onSuccess) {
                setTimeout(() => {
                onSuccess();
                }, 1000);
            }
        } catch (error) {
            if (error.response) {
                console.error('Server error details:', {
                    status: error.response.status,
                    data: error.response.data
                });
            }
            message.error('報名失敗，請稍後再試');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        // 如果已經提交成功，延遲關閉 modal
        if (submitted) {
            setTimeout(() => {
                setSubmitted(false);
                form.resetFields();
                onClose();
            }, 1500);
        } else {
        setSubmitted(false);
        form.resetFields();
        onClose();
        }
    };

    return (
        <Modal
            title={submitted ? "" : "活動報名"}
            open={isOpen}
            onCancel={handleClose}
            footer={null}
            maskClosable={!submitting}
            closable={!submitting}
            className={submitted ? "success-modal" : ""}
            width={submitted ? 500 : 520}
            centered
        >
            {submitted ? (
                <Result
                    status="success"
                    title="報名成功"
                    subTitle="您已成功報名此活動！"
                    extra={[
                        <div className="success-confirmation" key="confirmation">
                            <p>我們已收到您的報名資料，後續活動資訊將透過電子郵件通知您。</p>
                            <p>如有任何問題，請與我們聯繫。</p>
                            <Button type="primary" size="large" onClick={handleClose} style={{ marginTop: 20 }}>
                                確認
                            </Button>
                        </div>
                    ]}
                />
            ) : (
                <>
                    <Form
                        form={form}
                        layout="vertical"
                        name="registration_form"
                        initialValues={{ 
                            attendanceCount: 'attendance1',
                            has_overseas_investment: false,
                            budget_range: 'budget_unknown'
                        }}
                    >
                        <Form.Item
                            name="name"
                            label="姓名"
                            rules={[{ required: true, message: '請輸入姓名' }]}
                        >
                            <Input placeholder="請輸入您的姓名" />
                        </Form.Item>

                        <Form.Item
                            name="phone"
                            label="電話"
                            rules={[{ required: true, message: '請輸入電話號碼' }]}
                        >
                            <Input placeholder="請輸入您的電話號碼" />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            label="電子郵件"
                            rules={[
                                { type: 'email', message: '請輸入有效的電子郵件地址' }
                            ]}
                        >
                            <Input placeholder="請輸入您的電子郵件（選填）" />
                        </Form.Item>

                        <Form.Item
                            name="attendanceCount"
                            label="總出席人數"
                            rules={[{ required: true, message: '請選擇總出席人數' }]}
                        >
                            <Select options={attendanceOptions} />
                        </Form.Item>

                        <Form.Item
                            name="has_overseas_investment"
                            label="是否有海外投資經驗"
                            valuePropName="checked"
                        >
                            <Switch 
                                checkedChildren="有" 
                                unCheckedChildren="無"
                                onChange={(checked) => setHasOverseasInvestment(checked)}
                            />
                        </Form.Item>

                        <Form.Item
                            name="budget_range"
                            label="投資預算"
                        >
                            <Select options={budgetOptions} />
                        </Form.Item>

                        {hasOverseasInvestment && (
                            <Form.Item
                                name="overseas_investment_notes"
                                label="投資說明"
                            >
                                <Input.TextArea 
                                    rows={4}
                                    placeholder="請簡述您的海外投資經驗"
                                />
                            </Form.Item>
                        )}

                        <Form.Item>
                        <Button 
                            type="primary" 
                            onClick={handleSubmit} 
                            loading={submitting}
                                block
                        >
                            確認報名
                        </Button>
                        </Form.Item>
                    </Form>
                </>
            )}
        </Modal>
    );
};

export default RegistrationModal; 