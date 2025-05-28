import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Tag, DatePicker, Tooltip } from 'antd';
import { PlusOutlined, FilterOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../../utils/api';
import * as XLSX from 'xlsx';

const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Interactions = () => {
  const [interactions, setInteractions] = useState([]);
  const [filteredInteractions, setFilteredInteractions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentInteraction, setCurrentInteraction] = useState(null);

  // 互動類型映射
  const interactionTypeMap = {
    call: '通話',
    email: '電子郵件',
    meeting: '會議',
    visit: '參觀',
    other: '其他'
  };

  // 互動狀態映射
  const interactionStatusMap = {
    pending: { text: '待處理', color: 'orange' },
    completed: { text: '已完成', color: 'green' },
    canceled: { text: '已取消', color: 'red' },
    follow_up: { text: '需跟進', color: 'blue' }
  };

  useEffect(() => {
    fetchInteractions();
    fetchCustomers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [interactions, searchKeyword]);

  const fetchInteractions = async () => {
    try {
      setLoading(true);
      // 獲取當前登錄的銷售人員信息
      const user = JSON.parse(localStorage.getItem('user'));
      
      // 只獲取當前銷售人員的互動記錄
      const response = await fetch(`${API_BASE_URL}/api/interactions?filters[sales_staff][id][$eq]=${user.id}&populate=*&sort=date:desc`);
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

  const fetchCustomers = async () => {
    try {
      // 獲取當前登錄的銷售人員信息
      const user = JSON.parse(localStorage.getItem('user'));
      
      // 只獲取分配給當前銷售人員的客戶
      const response = await fetch(`${API_BASE_URL}/api/customers?filters[sales_staff][id][$eq]=${user.id}&populate=*`);
      const data = await response.json();
      setCustomers(data.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleAddInteraction = () => {
    form.resetFields();
    form.setFieldsValue({
      date: new Date().toISOString().split('T')[0],
      status: 'pending'
    });
    setAddModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 獲取當前登錄的銷售人員信息
      const user = JSON.parse(localStorage.getItem('user'));
      
      let apiMethod = 'POST';
      let apiUrl = `${API_BASE_URL}/api/interactions`;
      let successMessage = '互動記錄已添加';
      
      // 如果是編輯模式
      if (currentInteraction) {
        apiMethod = 'PUT';
        apiUrl = `${API_BASE_URL}/api/interactions/${currentInteraction.id}`;
        successMessage = '互動記錄已更新';
      }

      const response = await fetch(apiUrl, {
        method: apiMethod,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            customer: values.customer,
            sales_staff: user.id,
            type: values.type,
            notes: values.notes,
            date: values.date,
            next_follow_up: values.next_follow_up || null,
            status: values.status
          }
        }),
      });

      if (!response.ok) throw new Error(currentInteraction ? '更新互動記錄失敗' : '創建互動記錄失敗');

      message.success(successMessage);
      setAddModalVisible(false);
      setCurrentInteraction(null);
      fetchInteractions();
    } catch (error) {
      console.error('Error saving interaction:', error);
      message.error(currentInteraction ? '更新互動記錄失敗' : '添加互動記錄失敗');
    }
  };

  const handleEdit = (record) => {
    setCurrentInteraction(record);
    form.setFieldsValue({
      customer: record.attributes.customer?.data?.id,
      type: record.attributes.type,
      notes: record.attributes.notes,
      date: record.attributes.date,
      next_follow_up: record.attributes.next_follow_up,
      status: record.attributes.status
    });
    setAddModalVisible(true);
  };

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
        if (formValues.type && formValues.type.length > 0) {
          filtered = filtered.filter(interaction => 
            interaction.attributes.type && formValues.type.includes(interaction.attributes.type)
          );
        }
        
        if (formValues.status && formValues.status.length > 0) {
          filtered = filtered.filter(interaction => 
            interaction.attributes.status && formValues.status.includes(interaction.attributes.status)
          );
        }
        
        if (formValues.customer) {
          filtered = filtered.filter(interaction => 
            interaction.attributes.customer?.data?.id === formValues.customer
          );
        }
        
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

        if (formValues.followUpRange && formValues.followUpRange[0] && formValues.followUpRange[1]) {
          const startDate = new Date(formValues.followUpRange[0].format('YYYY-MM-DD'));
          const endDate = new Date(formValues.followUpRange[1].format('YYYY-MM-DD'));
          endDate.setHours(23, 59, 59, 999);
          
          filtered = filtered.filter(interaction => {
            if (!interaction.attributes.next_follow_up) return false;
            const followUpDate = new Date(interaction.attributes.next_follow_up);
            return followUpDate >= startDate && followUpDate <= endDate;
          });
        }
      }
      
      if (filtered.length !== interactions.length) {
        message.info(`共找到 ${filtered.length} 筆互動記錄`);
      }
      
      setFilteredInteractions(filtered);
    } catch (error) {
      console.error('Error applying filters:', error);
      message.error('過濾出錯，請重試');
      setFilteredInteractions(interactions);
    }
  };

  const exportToExcel = () => {
    // 顯示導出的記錄數量
    const isFiltered = filteredInteractions.length !== interactions.length;
    const confirmMessage = isFiltered 
      ? `確定要導出篩選後的 ${filteredInteractions.length} 筆記錄嗎？`
      : `確定要導出全部 ${interactions.length} 筆記錄嗎？`;
    
    Modal.confirm({
      title: '導出確認',
      content: confirmMessage,
      okText: '確定導出',
      cancelText: '取消',
      onOk: () => {
        message.loading('正在生成Excel文件...', 1);
        
        const exportData = filteredInteractions.map(interaction => ({
          '客戶': interaction.attributes.customer?.data?.attributes?.name || '',
          '互動類型': interactionTypeMap[interaction.attributes.type] || interaction.attributes.type,
          '互動日期': interaction.attributes.date,
          '互動內容': interaction.attributes.notes,
          '互動狀態': interactionStatusMap[interaction.attributes.status]?.text || interaction.attributes.status,
          '跟進日期': interaction.attributes.next_follow_up || '',
          '創建時間': new Date(interaction.attributes.createdAt).toLocaleString(),
          '更新時間': new Date(interaction.attributes.updatedAt).toLocaleString(),
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '互動記錄');
        
        const fileName = isFiltered 
          ? `互動記錄_篩選結果_${new Date().toISOString().split('T')[0]}.xlsx`
          : `互動記錄_全部_${new Date().toISOString().split('T')[0]}.xlsx`;
          
        XLSX.writeFile(wb, fileName);
        
        message.success(`成功導出 ${exportData.length} 筆互動記錄`);
      }
    });
  };

  // 查找今天需要跟進的互動記錄數量
  const getTodayFollowUps = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return interactions.filter(interaction => {
      if (!interaction.attributes.next_follow_up) return false;
      const followUpDate = new Date(interaction.attributes.next_follow_up);
      followUpDate.setHours(0, 0, 0, 0);
      return followUpDate.getTime() === today.getTime();
    }).length;
  };

  const columns = [
    {
      title: '客戶',
      dataIndex: ['attributes', 'customer', 'data', 'attributes', 'name'],
      key: 'customer',
      render: (_, record) => {
        return record.attributes.customer?.data?.attributes?.name || '-';
      }
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
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="link" 
            onClick={() => handleEdit(record)}
          >
            編輯
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          互動記錄
          {getTodayFollowUps() > 0 && (
            <Tag color="red" style={{ marginLeft: 8 }}>
              今日待跟進: {getTodayFollowUps()}
            </Tag>
          )}
        </div>
      }
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
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddInteraction}
          >
            新增互動
          </Button>
          <Button
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
                <Select placeholder="選擇客戶" style={{ width: '200px' }}>
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
              <Form.Item name="followUpRange" label="跟進日期" style={{ minWidth: '300px' }}>
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

      <Modal
        title={currentInteraction ? "編輯互動記錄" : "新增互動記錄"}
        open={addModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setAddModalVisible(false);
          setCurrentInteraction(null);
        }}
        okText="保存"
        cancelText="取消"
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="customer"
            label="客戶"
            rules={[{ required: true, message: '請選擇客戶' }]}
          >
            <Select placeholder="選擇客戶">
              {customers.map(customer => (
                <Option key={customer.id} value={customer.id}>
                  {customer.attributes.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="type"
            label="互動類型"
            rules={[{ required: true, message: '請選擇互動類型' }]}
          >
            <Select placeholder="選擇互動類型">
              {Object.entries(interactionTypeMap).map(([value, text]) => (
                <Option key={value} value={value}>{text}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="date"
            label="互動日期"
            rules={[{ required: true, message: '請選擇互動日期' }]}
          >
            <Input type="date" />
          </Form.Item>
          <Form.Item
            name="notes"
            label="互動內容"
            rules={[{ required: true, message: '請輸入互動內容' }]}
          >
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item
            name="status"
            label="互動狀態"
            rules={[{ required: true, message: '請選擇互動狀態' }]}
          >
            <Select placeholder="選擇互動狀態">
              {Object.entries(interactionStatusMap).map(([value, { text }]) => (
                <Option key={value} value={value}>{text}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="next_follow_up"
            label="跟進日期"
          >
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Interactions; 