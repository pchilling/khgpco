import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Modal, message, Input, Form, Popconfirm, Alert, Spin, Row, Col, Typography, Badge, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined, InboxOutlined, WarningOutlined, UserAddOutlined, CheckCircleOutlined, UndoOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../../utils/api';
import styles from './ContactMessages.module.css';

const { Title, Text } = Typography;

const ContactMessages = () => {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [messageType, setMessageType] = useState('active'); // 'active' 或 'archived'
  const [error, setError] = useState(null);
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertForm] = Form.useForm();

  useEffect(() => {
    fetchMessages();
  }, [messageType]);

  useEffect(() => {
    if (searchKeyword) {
      const filtered = messages.filter(
        msg => 
          msg.attributes.name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          msg.attributes.email?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          msg.attributes.message?.toLowerCase().includes(searchKeyword.toLowerCase())
      );
      setFilteredMessages(filtered);
    } else {
      setFilteredMessages(messages);
    }
  }, [messages, searchKeyword]);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('嘗試獲取聯絡訊息...');
      // 使用完整的API URL
      const apiUrl = `${API_BASE_URL}/api/contact-messages`;
      console.log('API端點:', apiUrl);
      
      let queryString = `?sort=createdAt:desc&populate=*`;
      
      if (messageType === 'active') {
        queryString += `&publicationState=live`;
      } else {
        queryString += `&publicationState=preview`;
      }
      
      const response = await fetch(`${apiUrl}${queryString}`);
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(`權限錯誤 (${response.status}): 請確認您有權限查看聯絡訊息。可能需要在Strapi中為您的角色開啟權限。`);
        }
        throw new Error(`API請求失敗: ${response.status} ${response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log('API原始響應:', responseText);
      
      const data = responseText ? JSON.parse(responseText) : {data: []};
      console.log('解析後的數據:', data);
      
      let resultData = data.data || [];
      if (messageType === 'archived') {
        resultData = resultData.filter(item => item.attributes.publishedAt === null);
      }
      
      console.log('處理後的結果數據:', resultData);
      
      setMessages(resultData);
      setFilteredMessages(resultData);
    } catch (error) {
      console.error('獲取聯絡訊息失敗:', error);
      setError(error.message || '獲取聯絡訊息失敗');
      message.error('獲取聯絡訊息失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewMessage = (record) => {
    setSelectedMessage(record);
    setModalVisible(true);
    // 不自動標記為已讀，讓用戶手動操作
  };

  const handleMarkAsRead = async (record) => {
    try {
      console.log('嘗試將訊息標記為已讀...');
      
      // 準備狀態更新數據
      const updateData = {
        data: {
          status: 'read'  // 使用API支援的狀態值
        }
      };
      
      console.log('更新數據:', JSON.stringify(updateData, null, 2));
      
      const response = await fetch(`${API_BASE_URL}/api/contact-messages/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API錯誤詳情:', errorData);
        throw new Error(`更新狀態失敗: ${response.status} ${response.statusText}`);
      }
      
      // 更新本地狀態
      const updatedMessages = messages.map(msg => 
        msg.id === record.id 
          ? {...msg, attributes: {...msg.attributes, status: 'read'}} 
          : msg
      );
      setMessages(updatedMessages);
      setFilteredMessages(updatedMessages);
      
      message.success('訊息已標記為已讀');
    } catch (error) {
      console.error('標記已讀失敗:', error);
      message.error('標記訊息為已讀失敗: ' + error.message);
    }
  };

  const handleMarkAsUnread = async (record) => {
    try {
      console.log('嘗試將訊息標記為未讀...');
      
      // 準備狀態更新數據
      const updateData = {
        data: {
          status: 'unread'  // 使用API支援的狀態值
        }
      };
      
      console.log('更新數據:', JSON.stringify(updateData, null, 2));
      
      const response = await fetch(`${API_BASE_URL}/api/contact-messages/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API錯誤詳情:', errorData);
        throw new Error(`更新狀態失敗: ${response.status} ${response.statusText}`);
      }
      
      // 更新本地狀態
      const updatedMessages = messages.map(msg => 
        msg.id === record.id 
          ? {...msg, attributes: {...msg.attributes, status: 'unread'}} 
          : msg
      );
      setMessages(updatedMessages);
      setFilteredMessages(updatedMessages);
      
      message.success('訊息已標記為未讀');
    } catch (error) {
      console.error('標記未讀失敗:', error);
      message.error('標記訊息為未讀失敗: ' + error.message);
    }
  };

  const handleArchive = async (record) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/contact-messages/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            publishedAt: null
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`封存失敗: ${response.status} ${response.statusText}`);
      }
      
      message.success('訊息已封存');
      fetchMessages();
    } catch (error) {
      console.error('Error archiving message:', error);
      message.error('封存訊息失敗: ' + error.message);
    }
  };

  const handleRestore = async (record) => {
    try {
      const currentTime = new Date().toISOString();
      const response = await fetch(`${API_BASE_URL}/api/contact-messages/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            publishedAt: currentTime
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`恢復失敗: ${response.status} ${response.statusText}`);
      }
      
      message.success('訊息已恢復');
      fetchMessages();
    } catch (error) {
      console.error('Error restoring message:', error);
      message.error('恢復訊息失敗: ' + error.message);
    }
  };

  // 轉換為客戶功能
  const showConvertModal = (record) => {
    setSelectedMessage(record);
    setConvertModalVisible(true);
    convertForm.setFieldsValue({
      name: record.attributes.name,
      email: record.attributes.email,
      phone: record.attributes.phone,
      notes: record.attributes.message,
      status: 'potential' // 使用英文值作為狀態
    });
  };

  const handleConvertToCustomer = async () => {
    try {
      await convertForm.validateFields();
      const values = convertForm.getFieldsValue();
      
      setConvertLoading(true);
      
      // 準備客戶數據 - 嚴格按照API要求
      const customerData = {
        data: {
          name: values.name,
          email: values.email,
          phone: values.phone,
          status: values.status, 
          source: "website",
          notes: values.notes || ""
        }
      };
      
      console.log('嘗試建立客戶，完整資料:', JSON.stringify(customerData, null, 2));
      
      // 建立客戶
      const customerResponse = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customerData)
      });
      
      // 檢查API錯誤
      if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        console.error('建立客戶API錯誤詳情:', errorText);
        
        if (errorText.includes('ValidationError')) {
          const errorJson = JSON.parse(errorText);
          const errors = errorJson.error?.details?.errors || [];
          const fieldErrors = errors.map(err => `${err.path}: ${err.message}`).join(', ');
          throw new Error(`資料驗證失敗: ${fieldErrors}`);
        }
        
        throw new Error(`建立客戶失敗: ${customerResponse.status}`);
      }
      
      // 解析成功響應
      const customerResult = await customerResponse.json();
      console.log('建立客戶成功，結果:', customerResult);
      
      // 獲取客戶ID
      const customerId = customerResult.data?.id;
      if (!customerId) {
        throw new Error('無法獲取新建客戶ID');
      }
      
      // 準備訊息更新資料 - 簡化為僅更新必要欄位
      const messageUpdateData = {
        data: {
          status: 'read',
          notes: `已於 ${new Date().toLocaleString()} 轉換為客戶 ID=${customerId}`
        }
      };
      
      // 嘗試設置convertedToCustomer
      try {
        messageUpdateData.data.convertedToCustomer = true;
      } catch (e) {
        console.log('設置convertedToCustomer失敗，繼續處理:', e);
      }
      
      console.log('更新訊息數據:', JSON.stringify(messageUpdateData, null, 2));
      
      const updateResponse = await fetch(`${API_BASE_URL}/api/contact-messages/${selectedMessage.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageUpdateData)
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('更新訊息API錯誤:', errorText);
        
        if (errorText.includes('ValidationError')) {
          const errorJson = JSON.parse(errorText);
          const errors = errorJson.error?.details?.errors || [];
          const fieldErrors = errors.map(err => `${err.path}: ${err.message}`).join(', ');
          throw new Error(`訊息更新驗證失敗: ${fieldErrors}`);
        }
        
        throw new Error(`更新訊息失敗: ${updateResponse.status}`);
      }
      
      // 成功處理
      message.success('已成功轉換為客戶！客戶ID: ' + customerId);
      setConvertModalVisible(false);
      fetchMessages();
      
    } catch (error) {
      console.error('轉換客戶失敗:', error);
      message.error(error.message || '轉換失敗，請稍後再試');
    } finally {
      setConvertLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchKeyword(e.target.value);
  };

  // 檢查訊息是否已轉換為客戶
  const isMessageConverted = (record) => {
    // 檢查convertedToCustomer標誌（若存在）
    if (record.attributes.convertedToCustomer === true) {
      return true;
    }
    
    // 檢查是否有customers關聯（確保存在attributes且有customers資料）
    if (record.attributes && record.attributes.customers) {
      // 檢查是否有資料
      if (record.attributes.customers.data && record.attributes.customers.data.length > 0) {
        return true;
      }
    }
    
    // 檢查notes是否包含轉換記錄
    if (record.attributes.notes && record.attributes.notes.includes('轉換為客戶')) {
      return true;
    }
    
    return false;
  };

  // 檢查訊息是否已讀
  const isMessageRead = (record) => {
    return record.attributes.status === 'read' || record.attributes.isRead === true;
  };

  // 測試客戶創建功能 - 僅用於診斷
  const testCustomerCreation = async () => {
    try {
      message.info('開始測試客戶創建...');
      
      // 使用最基本的測試數據
      const testData = {
        data: {
          name: "測試客戶",
          email: "test@example.com",
          phone: "0912-345-678",
          status: "potential",
          source: "website",
          notes: "測試創建"
        }
      };
      
      console.log('測試客戶數據:', JSON.stringify(testData, null, 2));
      
      // 發送測試請求
      const response = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });
      
      // 讀取響應文本
      const responseText = await response.text();
      console.log('測試響應狀態:', response.status);
      console.log('測試響應內容:', responseText);
      
      // 檢查響應
      if (!response.ok) {
        message.error(`測試失敗: ${response.status} - 請查看控制台詳情`);
      } else {
        message.success('測試客戶創建成功!');
      }
    } catch (error) {
      console.error('測試錯誤:', error);
      message.error(`測試錯誤: ${error.message}`);
    }
  };

  const columns = [
    {
      title: '狀態',
      key: 'status',
      width: 80,
      render: (_, record) => {
        if (isMessageConverted(record)) {
          return <Badge status="purple" text="已轉換" />;
        }
        const isUnread = !isMessageRead(record);
        return (
          <Badge 
            status={isUnread ? "processing" : "success"} 
            text={isUnread ? '未讀' : '已讀'} 
          />
        );
      },
    },
    {
      title: '姓名',
      dataIndex: ['attributes', 'name'],
      key: 'name',
      width: 100,
      render: (name, record) => {
        const isUnread = !isMessageRead(record);
        return (
          <Text strong={isUnread}>{name}</Text>
        );
      }
    },
    {
      title: '電子郵件',
      dataIndex: ['attributes', 'email'],
      key: 'email',
      width: 180,
      ellipsis: true,
      render: (email, record) => {
        const isUnread = !isMessageRead(record);
        return (
          <Text strong={isUnread}>{email}</Text>
        );
      }
    },
    {
      title: '電話',
      dataIndex: ['attributes', 'phone'],
      key: 'phone',
      width: 120,
      render: (phone, record) => {
        const isUnread = !isMessageRead(record);
        return (
          <Text strong={isUnread}>{phone || '-'}</Text>
        );
      }
    },
    {
      title: '訊息內容',
      dataIndex: ['attributes', 'message'],
      key: 'message',
      ellipsis: true,
      render: (text, record) => {
        const isUnread = !isMessageRead(record);
        const shortText = text?.substring(0, 30) + (text?.length > 30 ? '...' : '') || '-';
        return (
          <Tooltip title={text}>
            <Text strong={isUnread}>{shortText}</Text>
          </Tooltip>
        );
      }
    },
    {
      title: '提交時間',
      dataIndex: ['attributes', 'createdAt'],
      key: 'createdAt',
      width: 160,
      render: (createdAt, record) => {
        const isUnread = !isMessageRead(record);
        return (
          <Text strong={isUnread}>{new Date(createdAt).toLocaleString()}</Text>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 280,
      render: (_, record) => {
        // 創建一個按鈕數組，根據條件添加按鈕
        const buttons = [];
        
        // 添加查看按鈕
        buttons.push(
          <Button 
            key="view"
            type="primary" 
            icon={<EyeOutlined />} 
            onClick={() => handleViewMessage(record)}
            size="small"
          >
            查看
          </Button>
        );
        
        // 添加轉為客戶按鈕
        if (!isMessageConverted(record) && messageType === 'active') {
          buttons.push(
            <Button 
              key="convert"
              type="primary" 
              ghost
              icon={<UserAddOutlined />} 
              onClick={() => showConvertModal(record)}
              size="small"
            >
              轉為客戶
            </Button>
          );
        }
        
        // 添加標記已讀/未讀按鈕
        if (isMessageRead(record)) {
          buttons.push(
            <Button
              key="mark-unread"
              type="dashed"
              icon={<UndoOutlined />}
              onClick={() => handleMarkAsUnread(record)}
              size="small"
            >
              標為未讀
            </Button>
          );
        } else {
          buttons.push(
            <Button
              key="mark-read"
              type="default"
              icon={<CheckCircleOutlined />}
              onClick={() => handleMarkAsRead(record)}
              size="small"
            >
              標為已讀
            </Button>
          );
        }
        
        // 添加封存/恢復按鈕
        if (messageType === 'active') {
          buttons.push(
            <Popconfirm
              key="archive"
              title="確定要封存此訊息？"
              onConfirm={() => handleArchive(record)}
              okText="確定"
              cancelText="取消"
            >
              <Button 
                type="default" 
                icon={<InboxOutlined />} 
                size="small"
                danger
              >
                封存
              </Button>
            </Popconfirm>
          );
        } else {
          buttons.push(
            <Popconfirm
              key="restore"
              title="確定要恢復此訊息？"
              onConfirm={() => handleRestore(record)}
              okText="確定"
              cancelText="取消"
            >
              <Button 
                type="default" 
                size="small"
              >
                恢復
              </Button>
            </Popconfirm>
          );
        }
        
        return (
          <div className={styles.actionButtonsContainer}>
            {buttons}
          </div>
        );
      },
    },
  ];

  return (
    <Card
      title={
        <Row gutter={16} align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>網站聯絡訊息</Title>
          </Col>
          <Col>
            <Badge 
              count={filteredMessages.filter(msg => !isMessageRead(msg)).length} 
              style={{ backgroundColor: '#1890ff' }} 
              title="未讀訊息數量"
            />
          </Col>
        </Row>
      }
      extra={
        <Space size="middle">
          <div className={styles.tabButtons}>
            <Button.Group>
              <Button 
                type={messageType === 'active' ? 'primary' : 'default'}
                onClick={() => setMessageType('active')}
              >
                活躍訊息
              </Button>
              <Button 
                type={messageType === 'archived' ? 'primary' : 'default'}
                onClick={() => setMessageType('archived')}
              >
                已封存
              </Button>
            </Button.Group>
          </div>
          <Input
            placeholder="搜索訊息"
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={handleSearch}
            style={{ width: 200 }}
            allowClear
          />
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchMessages}
          >
            刷新
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <Button type="dashed" onClick={testCustomerCreation}>
              測試API
            </Button>
          )}
        </Space>
      }
      className={styles.contactMessagesCard}
    >
      {error && (
        <Alert
          message="錯誤"
          description={error}
          type="error"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" danger onClick={fetchMessages}>
              重試
            </Button>
          }
        />
      )}
      
      <Table
        columns={columns}
        dataSource={filteredMessages}
        rowKey={(record) => record.id}
        loading={loading}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `共 ${total} 條訊息`
        }}
        rowClassName={(record) => !isMessageRead(record) ? styles.unreadRow : ''}
        scroll={{ x: 1200 }}
        locale={{
          emptyText: error ? '載入失敗' : (loading ? '載入中...' : '目前沒有聯絡訊息')
        }}
      />

      {/* 查看訊息詳情彈窗 */}
      <Modal
        title={
          <Space>
            <span>聯絡訊息詳情</span>
            {selectedMessage && !isMessageRead(selectedMessage) && (
              <Button 
                type="primary" 
                size="small" 
                onClick={() => {
                  handleMarkAsRead(selectedMessage);
                  setSelectedMessage({
                    ...selectedMessage,
                    attributes: {
                      ...selectedMessage.attributes,
                      isRead: true,
                      status: 'read'
                    }
                  });
                }}
              >
                標記為已讀
              </Button>
            )}
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            關閉
          </Button>,
          selectedMessage && !isMessageConverted(selectedMessage) && (
            <Button 
              key="convert"
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => {
                setModalVisible(false);
                showConvertModal(selectedMessage);
              }}
            >
              轉為客戶
            </Button>
          )
        ]}
        width={700}
      >
        {selectedMessage && (
          <Form layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="姓名">
                  <Input value={selectedMessage.attributes.name} readOnly />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="電話">
                  <Input value={selectedMessage.attributes.phone || '-'} readOnly />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="電子郵件">
              <Input value={selectedMessage.attributes.email} readOnly />
            </Form.Item>
            <Form.Item label="訊息內容">
              <Input.TextArea 
                value={selectedMessage.attributes.message} 
                readOnly 
                rows={6}
              />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="提交時間">
                  <Input 
                    value={new Date(selectedMessage.attributes.createdAt).toLocaleString()} 
                    readOnly 
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="狀態">
                  {isMessageConverted(selectedMessage) ? (
                    <Tag color="purple">已轉換為客戶</Tag>
                  ) : isMessageRead(selectedMessage) ? (
                    <Tag color="green">已讀</Tag>
                  ) : (
                    <Tag color="blue">未讀</Tag>
                  )}
                </Form.Item>
              </Col>
            </Row>
            {isMessageConverted(selectedMessage) && (
              <Alert
                message="此訊息已轉換為客戶"
                type="success"
                showIcon
              />
            )}
          </Form>
        )}
      </Modal>

      {/* 轉換為客戶彈窗 */}
      <Modal
        title="轉換為客戶"
        open={convertModalVisible}
        onCancel={() => setConvertModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setConvertModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={convertLoading}
            onClick={handleConvertToCustomer}
          >
            確認轉換
          </Button>
        ]}
        width={700}
      >
        <Spin spinning={convertLoading}>
          <Form 
            form={convertForm}
            layout="vertical"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="客戶姓名"
                  rules={[{ required: true, message: '請輸入客戶姓名' }]}
                >
                  <Input placeholder="請輸入客戶姓名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label="電話"
                  rules={[{ required: true, message: '請輸入電話號碼' }]}
                >
                  <Input placeholder="請輸入電話號碼" />
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item
              name="email"
              label="電子郵件"
              rules={[
                { required: true, message: '請輸入電子郵件' },
                { type: 'email', message: '請輸入有效的電子郵件格式' }
              ]}
            >
              <Input placeholder="請輸入電子郵件" />
            </Form.Item>
            
            <Form.Item
              name="status"
              label="客戶狀態"
              rules={[{ required: true, message: '請選擇客戶狀態' }]}
            >
              <select 
                style={{ 
                  width: '100%', 
                  height: '32px', 
                  padding: '4px 11px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '2px' 
                }}
                defaultValue="potential"
              >
                <option value="potential">潛在客戶</option>
                <option value="contacted">已聯繫</option>
                <option value="negotiating">洽談中</option>
                <option value="closed">成交客戶</option>
                <option value="lost">已流失</option>
              </select>
            </Form.Item>
            
            <Form.Item
              name="notes"
              label="備註"
            >
              <Input.TextArea rows={4} placeholder="客戶備註" />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </Card>
  );
};

export default ContactMessages; 