import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Select, message } from 'antd';
import { UserAddOutlined, UserSwitchOutlined, DownloadOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../../utils/api';
import styles from './RegistrationManagement.module.css';
import * as XLSX from 'xlsx';

const { Option } = Select;

const RegistrationManagement = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salesStaff, setSalesStaff] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // 獲取報名資料
  const fetchRegistrations = async () => {
    setLoading(true);
    
    try {
      // 不使用任何認證頭，即使在生產環境
      const response = await fetch(`${API_BASE_URL}/api/registrations?populate=*`);
      
      const data = await response.json();
      
      if (response.ok) {
        setRegistrations(data.data || []);
      } else {
        console.log('獲取報名資料失敗:', data);
        setRegistrations([]);
      }
    } catch (error) {
      console.error('獲取報名資料錯誤:', error);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  // 獲取銷售人員
  const fetchSalesStaff = async () => {
    try {
      // 不使用任何認證頭，即使在生產環境
      const response = await fetch(`${API_BASE_URL}/api/sales-staffs?populate=*`);
      
      const data = await response.json();
      
      if (response.ok) {
        setSalesStaff(data.data || []);
      } else {
        console.log('獲取銷售人員失敗:', data);
        setSalesStaff([]);
      }
    } catch (error) {
      console.error('獲取銷售人員錯誤:', error);
      setSalesStaff([]);
    }
  };

  useEffect(() => {
    fetchRegistrations();
    fetchSalesStaff();
  }, []);

  // 匯出 Excel
  const handleExport = () => {
    try {
      if (!registrations.length) {
        message.warning('沒有可匯出的資料');
        return;
      }

      // 準備匯出資料
      const exportData = registrations.map(record => ({
        '報名時間': new Date(record.attributes.createdAt).toLocaleString(),
        '姓名': record.attributes.name,
        '電話': record.attributes.phone,
        'Email': record.attributes.email,
        '活動名稱': record.attributes.event?.data?.attributes?.title || '未指定活動',
        '狀態': record.attributes.status === 'confirmed' ? '已轉換' : '未處理'
      }));

      // 創建工作表
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '報名資料');

      // 下載檔案
      XLSX.writeFile(wb, `活動報名資料_${new Date().toLocaleDateString()}.xlsx`);
      message.success('匯出成功！');
    } catch (error) {
      message.error('匯出失敗');
      console.error('Export error:', error);
    }
  };

  // 轉換為客戶 - 使用備選方法
  const convertToCustomer = async (record) => {
    try {
      // 使用標準的內容類型頭
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // 1. 創建新客戶
      const customerData = {
        data: {
          name: record.attributes.name,
          phone: record.attributes.phone,
          email: record.attributes.email,
          status: 'potential',
          source: 'event'
        }
      };

      console.log('API URL:', API_BASE_URL);
      console.log('Creating customer with data:', customerData);

      let createCustomerResponse;
      try {
        // 首先嘗試使用 fetch API
        createCustomerResponse = await fetch(`${API_BASE_URL}/api/customers`, {
          method: 'POST',
          headers,
          body: JSON.stringify(customerData)
        });
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        // 如果 fetch 失敗，嘗試使用 XMLHttpRequest
        console.log('Trying with XMLHttpRequest...');
        createCustomerResponse = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_BASE_URL}/api/customers`);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.withCredentials = true; // 允許跨域請求發送 cookies
          
          xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({
                ok: true,
                status: xhr.status,
                json: () => Promise.resolve(JSON.parse(xhr.responseText))
              });
            } else {
              resolve({
                ok: false,
                status: xhr.status,
                json: () => Promise.resolve(JSON.parse(xhr.responseText))
              });
            }
          };
          
          xhr.onerror = function() {
            reject(new Error('Network error'));
          };
          
          xhr.send(JSON.stringify(customerData));
        });
      }

      console.log('Customer creation response status:', createCustomerResponse.status);
      
      let responseData;
      try {
        responseData = await createCustomerResponse.json();
        console.log('Customer creation response data:', responseData);
      } catch (e) {
        console.error('解析創建客戶響應失敗:', e);
        throw new Error('創建客戶失敗：伺服器響應格式錯誤');
      }

      if (!createCustomerResponse.ok) {
        console.error('創建客戶失敗:', responseData);
        throw new Error(responseData.error?.message || '創建客戶失敗');
      }

      const customerId = responseData.data.id;
      console.log('Created customer ID:', customerId);

      // 2. 更新報名狀態
      console.log('Updating registration status for ID:', record.id);
      
      let updateRegistrationResponse;
      try {
        // 首先嘗試使用 fetch API
        updateRegistrationResponse = await fetch(`${API_BASE_URL}/api/registrations/${record.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            data: {
              status: 'confirmed',
              customer: customerId
            }
          })
        });
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        // 如果 fetch 失敗，嘗試使用 XMLHttpRequest
        console.log('Trying with XMLHttpRequest...');
        updateRegistrationResponse = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', `${API_BASE_URL}/api/registrations/${record.id}`);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.withCredentials = true; // 允許跨域請求發送 cookies
          
          xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({
                ok: true,
                status: xhr.status,
                json: () => Promise.resolve(JSON.parse(xhr.responseText))
              });
            } else {
              resolve({
                ok: false,
                status: xhr.status,
                json: () => Promise.resolve(JSON.parse(xhr.responseText))
              });
            }
          };
          
          xhr.onerror = function() {
            reject(new Error('Network error'));
          };
          
          xhr.send(JSON.stringify({
            data: {
              status: 'confirmed',
              customer: customerId
            }
          }));
        });
      }

      console.log('Registration update response status:', updateRegistrationResponse.status);
      
      let updateResponseData;
      try {
        updateResponseData = await updateRegistrationResponse.json();
        console.log('Registration update response data:', updateResponseData);
      } catch (e) {
        console.error('解析更新報名狀態響應失敗:', e);
        throw new Error('更新報名狀態失敗：伺服器響應格式錯誤');
      }

      if (!updateRegistrationResponse.ok) {
        console.error('更新報名狀態失敗:', updateResponseData);
        throw new Error(updateResponseData.error?.message || '更新報名狀態失敗');
      }

      message.success('成功轉換為客戶');
      await fetchRegistrations();
    } catch (error) {
      console.error('轉換失敗:', error);
      message.error(error.message || '轉換失敗');
    }
  };

  // 批量指派銷售人員
  const handleBatchAssign = async () => {
    if (!selectedStaff) {
      message.error('請選擇銷售人員');
      return;
    }

    try {
      // 批量更新客戶
      await Promise.all(selectedRows.map(record => 
        fetch(`${API_BASE_URL}/api/customers/${record.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: {
              assignedStaff: selectedStaff
            }
          })
        })
      ));

      message.success('成功指派銷售人員');
      setAssignModalVisible(false);
      setSelectedRows([]);
      fetchRegistrations();
    } catch (error) {
      console.error('指派失敗:', error);
      message.error('指派失敗');
    }
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
      title: '活動',
      dataIndex: ['attributes', 'event', 'data', 'attributes', 'title'],
      key: 'event',
    },
    {
      title: '報名時間',
      dataIndex: ['attributes', 'createdAt'],
      key: 'createdAt',
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: '狀態',
      dataIndex: ['attributes', 'status'],
      key: 'status',
      render: (status) => (
        <Tag color={status === 'confirmed' ? 'green' : 'blue'}>
          {status === 'confirmed' ? '已轉換' : '未處理'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<UserAddOutlined />}
            onClick={() => convertToCustomer(record)}
            disabled={record.attributes.status === 'confirmed'}
          >
            轉換為客戶
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.registrationManagement}>
      <Card 
        title="活動報名管理" 
        extra={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={!registrations.length}
            >
              匯出 Excel
            </Button>
            <Button
              type="primary"
              icon={<UserSwitchOutlined />}
              onClick={() => setAssignModalVisible(true)}
              disabled={selectedRows.length === 0}
            >
              批量指派
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={registrations || []}
          rowKey={record => record.id}
          loading={loading}
          rowSelection={{
            onChange: (_, rows) => setSelectedRows(rows),
            selectedRowKeys: selectedRows.map(row => row.id),
          }}
        />
      </Card>

      <Modal
        title="指派銷售人員"
        open={assignModalVisible}
        onOk={handleBatchAssign}
        onCancel={() => setAssignModalVisible(false)}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="選擇銷售人員"
          onChange={value => setSelectedStaff(value)}
        >
          {(salesStaff || []).map(staff => (
            <Option key={staff.id} value={staff.id}>
              {staff.attributes.username}
            </Option>
          ))}
        </Select>
      </Modal>
    </div>
  );
};

export default RegistrationManagement; 