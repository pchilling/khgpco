import React, { useState, useEffect } from 'react';
import { Card, Table, Space, Button, Input, Form, Select, DatePicker, message, Tag, Tooltip, Modal } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined, ExportOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../../../utils/api';

const { Option } = Select;
const { RangePicker } = DatePicker;

const InteractionManagement = () => {
  const [interactions, setInteractions] = useState([]);
  const [filteredInteractions, setFilteredInteractions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salesStaff, setSalesStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterForm] = Form.useForm();
  const [searchKeyword, setSearchKeyword] = useState('');

  // 互動類型和狀態映射
  const interactionTypeMap = {
    call: '通話',
    email: '電子郵件',
    meeting: '會議',
    visit: '參觀',
    other: '其他'
  };

  const interactionStatusMap = {
    pending: { text: '待處理', color: 'orange' },
    completed: { text: '已完成', color: 'green' },
    canceled: { text: '已取消', color: 'red' },
    follow_up: { text: '需跟進', color: 'blue' }
  };

  useEffect(() => {
    fetchInteractions();
    fetchSalesStaff();
    fetchCustomers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [interactions, searchKeyword]);

  const fetchInteractions = async () => {
    try {
      setLoading(true);
      // 管理員獲取所有互動記錄
      const response = await fetch(`${API_BASE_URL}/api/interactions?populate=*&sort=date:desc`);
      const data = await response.json();
      setInteractions(data.data || []);
      setFilteredInteractions(data.data || []);
    } catch (error) {
      console.error('Error fetching interactions:', error);
      message.error('獲取互動記錄失敗');
    } finally {
      setLoading(false);
    }
  };

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
      const response = await fetch(`${API_BASE_URL}/api/customers?populate=*`);
      const data = await response.json();
      setCustomers(data.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  // 搜索和過濾函數
  const handleSearch = (e) => {
    setSearchKeyword(e.target.value);
  };

  const handleFilter = async () => {
    try {
      const values = await filterForm.validateFields();
      applyFilters(values);
    } catch (error) {
      console.error('Filter form validation error:', error);
    }
  };

  const handleResetFilter = () => {
    filterForm.resetFields();
    setSearchKeyword('');
    setFilteredInteractions(interactions);
    setFilterVisible(false);
  };

  const applyFilters = (formValues = null) => {
    try {
      let filtered = [...interactions];
      
      // 關鍵字搜索
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        filtered = filtered.filter(interaction => 
          (interaction.attributes.notes && interaction.attributes.notes.toLowerCase().includes(keyword)) ||
          (interaction.attributes.customer?.data?.attributes?.name && 
            interaction.attributes.customer.data.attributes.name.toLowerCase().includes(keyword))
        );
      }
      
      // 表單篩選
      if (formValues) {
        // 業務人員篩選
        if (formValues.sales_staff) {
          filtered = filtered.filter(interaction => 
            interaction.attributes.sales_staff?.data?.id === formValues.sales_staff
          );
        }
        
        // 互動類型篩選
        if (formValues.type && formValues.type.length > 0) {
          filtered = filtered.filter(interaction => 
            interaction.attributes.type && formValues.type.includes(interaction.attributes.type)
          );
        }
        
        // 互動狀態篩選
        if (formValues.status && formValues.status.length > 0) {
          filtered = filtered.filter(interaction => 
            interaction.attributes.status && formValues.status.includes(interaction.attributes.status)
          );
        }
        
        // 客戶篩選
        if (formValues.customer) {
          filtered = filtered.filter(interaction => 
            interaction.attributes.customer?.data?.id === formValues.customer
          );
        }
        
        // 日期範圍篩選
        if (formValues.dateRange && formValues.dateRange[0] && formValues.dateRange[1]) {
          const startDate = new Date(formValues.dateRange[0].format('YYYY-MM-DD'));
          const endDate = new Date(formValues.dateRange[1].format('YYYY-MM-DD'));
          endDate.setHours(23, 59, 59, 999);
          
          filtered = filtered.filter(interaction => {
            if (!interaction.attributes.date) return false;
            const interactionDate = new Date(interaction.attributes.date);
            return interactionDate >= startDate && interactionDate <= endDate;
          });
        }
      }
      
      setFilteredInteractions(filtered);
      if (filtered.length !== interactions.length) {
        message.info(`共找到 ${filtered.length} 筆互動記錄`);
      }
    } catch (error) {
      console.error('Error applying filters:', error);
      message.error('過濾出錯，請重試');
      setFilteredInteractions(interactions);
    }
  };

  // 導出到Excel
  const exportToExcel = () => {
    Modal.confirm({
      title: '導出確認',
      content: `確定要導出${filteredInteractions.length}筆互動記錄嗎？`,
      okText: '確定',
      cancelText: '取消',
      onOk: () => {
        const exportData = filteredInteractions.map(interaction => ({
          '銷售人員': interaction.attributes.sales_staff?.data?.attributes?.username || '',
          '客戶': interaction.attributes.customer?.data?.attributes?.name || '',
          '互動類型': interactionTypeMap[interaction.attributes.type] || interaction.attributes.type,
          '互動日期': interaction.attributes.date,
          '互動內容': interaction.attributes.notes,
          '互動狀態': interactionStatusMap[interaction.attributes.status]?.text || interaction.attributes.status,
          '跟進日期': interaction.attributes.next_follow_up || '',
          '創建時間': new Date(interaction.attributes.createdAt).toLocaleString(),
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '互動記錄');
        XLSX.writeFile(wb, `互動記錄_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        message.success(`成功導出 ${exportData.length} 筆互動記錄`);
      }
    });
  };

  // 表格列定義
  const columns = [
    {
      title: '銷售人員',
      dataIndex: ['attributes', 'sales_staff', 'data', 'attributes', 'username'],
      key: 'sales_staff',
      render: (text) => text || '未知'
    },
    {
      title: '客戶',
      dataIndex: ['attributes', 'customer', 'data', 'attributes', 'name'],
      key: 'customer',
      render: (_, record) => record.attributes.customer?.data?.attributes?.name || '-'
    },
    {
      title: '互動類型',
      dataIndex: ['attributes', 'type'],
      key: 'type',
      render: (type) => interactionTypeMap[type] || type,
    },
    {
      title: '互動日期',
      dataIndex: ['attributes', 'date'],
      key: 'date',
      render: (date) => date || '-',
    },
    {
      title: '互動內容',
      dataIndex: ['attributes', 'notes'],
      key: 'notes',
      ellipsis: {
        showTitle: false,
      },
      render: (notes) => (
        <Tooltip placement="topLeft" title={notes}>
          {notes || '-'}
        </Tooltip>
      ),
    },
    {
      title: '狀態',
      dataIndex: ['attributes', 'status'],
      key: 'status',
      render: (status) => (
        <Tag color={interactionStatusMap[status]?.color || 'default'}>
          {interactionStatusMap[status]?.text || status}
        </Tag>
      ),
    },
    {
      title: '跟進日期',
      dataIndex: ['attributes', 'next_follow_up'],
      key: 'next_follow_up',
      render: (next_follow_up) => next_follow_up || '-',
    },
  ];

  return (
    <Card
      title="互動記錄管理"
      extra={
        <Space>
          <Input
            placeholder="搜索互動記錄"
            value={searchKeyword}
            onChange={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
          />
          <Button
            icon={<FilterOutlined />}
            onClick={() => setFilterVisible(!filterVisible)}
          >
            篩選
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchInteractions()}
          >
            刷新
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
      {filterVisible && (
        <div className="filter-panel" style={{ 
          backgroundColor: '#f8f8f8',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '16px',
          border: '1px solid #e8e8e8'
        }}>
          <Form
            form={filterForm}
            layout="horizontal"
            onFinish={handleFilter}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <Form.Item name="sales_staff" label="銷售人員" style={{ minWidth: '200px' }}>
                <Select placeholder="選擇銷售人員" style={{ width: '200px' }}>
                  <Option value="">全部</Option>
                  {salesStaff.map(staff => (
                    <Option key={staff.id} value={staff.id}>
                      {staff.attributes.username}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="type" label="互動類型" style={{ minWidth: '200px' }}>
                <Select mode="multiple" placeholder="選擇互動類型" style={{ width: '200px' }}>
                  {Object.entries(interactionTypeMap).map(([value, text]) => (
                    <Option key={value} value={value}>{text}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="status" label="互動狀態" style={{ minWidth: '200px' }}>
                <Select mode="multiple" placeholder="選擇互動狀態" style={{ width: '200px' }}>
                  {Object.entries(interactionStatusMap).map(([value, { text }]) => (
                    <Option key={value} value={value}>{text}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="customer" label="客戶" style={{ minWidth: '200px' }}>
                <Select 
                  placeholder="選擇客戶" 
                  style={{ width: '200px' }}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  <Option value="">全部</Option>
                  {customers.map(customer => (
                    <Option key={customer.id} value={customer.id}>
                      {customer.attributes.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="dateRange" label="互動日期" style={{ minWidth: '300px' }}>
                <RangePicker />
              </Form.Item>
              <Form.Item style={{ marginLeft: 'auto' }}>
                <Space>
                  <Button type="primary" htmlType="submit">
                    篩選
                  </Button>
                  <Button onClick={handleResetFilter}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </div>
          </Form>
        </div>
      )}

      <Table
        columns={columns}
        dataSource={filteredInteractions}
        rowKey={record => record.id}
        loading={loading}
      />
    </Card>
  );
};

export default InteractionManagement; 