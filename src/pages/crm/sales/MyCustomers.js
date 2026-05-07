import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Tag, Tooltip, DatePicker, Checkbox } from 'antd';
import { EditOutlined, FileAddOutlined, PhoneOutlined, MailOutlined, SearchOutlined, FilterOutlined, ReloadOutlined, InteractionOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../../../utils/api';
import { fetchAllStrapi } from '../../../utils/strapiPaginate';

const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const MyCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [contractModalVisible, setContractModalVisible] = useState(false);
  const [interactionModalVisible, setInteractionModalVisible] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [form] = Form.useForm();
  const [contractForm] = Form.useForm();
  const [interactionForm] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterForm] = Form.useForm();
  const [searchKeyword, setSearchKeyword] = useState('');

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

  const interactionTypeMap = {
    call: '通話',
    email: '電子郵件',
    meeting: '會議',
    visit: '參觀',
    other: '其他'
  };

  // 添加互動狀態映射
  const interactionStatusMap = {
    pending: { text: '待處理', color: 'orange' },
    completed: { text: '已完成', color: 'green' },
    canceled: { text: '已取消', color: 'red' },
    follow_up: { text: '需跟進', color: 'blue' }
  };

  useEffect(() => {
    fetchCustomers();
    fetchProjects();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [customers, searchKeyword]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      // 獲取當前登錄的銷售人員信息
      const user = JSON.parse(localStorage.getItem('user'));
      
      // 只獲取分配給當前銷售人員的客戶
      const all = await fetchAllStrapi(
        API_BASE_URL,
        `/api/customers?filters[sales_staff][id][$eq]=${user.id}&populate=*`
      );
      setCustomers(all);
      setFilteredCustomers(all);
    } catch (error) {
      console.error('Error fetching customers:', error);
      message.error('獲取客戶資料失敗');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`);
      const data = await response.json();
      setProjects(data.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
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
      projects: record.attributes.projects?.data?.map(p => p.id) || [],
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
        body: JSON.stringify({ 
          data: {
            ...values,
            projects: values.projects ? values.projects.map(id => ({ id })) : []
          }
        }),
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

  const handleContract = (record) => {
    setCurrentCustomer(record);
    // 設置現有的合約資料到表單中
    contractForm.setFieldsValue({
      contractInfo: record.attributes.contractInfo || '',
      contractDate: record.attributes.contractDate || null,
    });
    setContractModalVisible(true);
  };

  const handleContractSubmit = async () => {
    try {
      const values = await contractForm.validateFields();
      
      message.loading('更新合約資訊中...', 1);
      
      const response = await fetch(`${API_BASE_URL}/api/customers/${currentCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            hasContract: true,
            contractInfo: values.contractInfo,
            contractDate: values.contractDate
          }
        }),
      });

      if (!response.ok) throw new Error('更新失敗');

      message.success('合約信息已更新');
      setContractModalVisible(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error saving contract info:', error);
      message.error('更新合約信息失敗');
    }
  };

  const handleInteraction = (record) => {
    setCurrentCustomer(record);
    interactionForm.resetFields();
    setInteractionModalVisible(true);
  };

  const handleInteractionSubmit = async () => {
    try {
      const values = await interactionForm.validateFields();
      
      // 獲取當前登錄的銷售人員信息
      const user = JSON.parse(localStorage.getItem('user'));
      
      // 創建新的互動記錄
      const response = await fetch(`${API_BASE_URL}/api/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            customer: currentCustomer.id,
            sales_staff: user.id,
            type: values.type,
            notes: values.notes,
            date: values.date,
            next_follow_up: values.next_follow_up || null,
            status: values.status || 'pending'
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('API Error:', errorData);
        throw new Error('創建互動記錄失敗');
      }

      message.success('互動記錄已添加');
      setInteractionModalVisible(false);
      // 刷新客戶列表以顯示最新的互動狀態
      fetchCustomers();
    } catch (error) {
      console.error('Error adding interaction:', error);
      message.error('添加互動記錄失敗');
    }
  };

  const maskPhone = (phone) => {
    if (!phone) return '';
    const phoneStr = phone.toString();
    if (phoneStr.length <= 5) return phoneStr;
    const start = phoneStr.substring(0, 3);
    const end = phoneStr.substring(phoneStr.length - 2);
    const mask = '*'.repeat(phoneStr.length - 5);
    return `${start}${mask}${end}`;
  };

  const maskEmail = (email) => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    
    const name = parts[0];
    const domain = parts[1];
    
    const nameMasked = name.length <= 2 ? name : name.substring(0, 2) + '*'.repeat(Math.min(name.length - 2, 5));
    
    const domainParts = domain.split('.');
    const domainName = domainParts[0];
    const domainMasked = domainName.length <= 2 ? domainName : domainName.substring(0, 2) + '*'.repeat(Math.min(domainName.length - 2, 5));
    
    return `${nameMasked}@${domainMasked}.${domainParts.slice(1).join('.')}`;
  };

  const exportToExcel = () => {
    // 顯示導出的記錄數量
    const isFiltered = filteredCustomers.length !== customers.length;
    const confirmMessage = isFiltered 
      ? `確定要導出篩選後的 ${filteredCustomers.length} 筆記錄嗎？`
      : `確定要導出全部 ${customers.length} 筆記錄嗎？`;
    
    Modal.confirm({
      title: '導出確認',
      content: confirmMessage,
      okText: '確定導出',
      cancelText: '取消',
      onOk: () => {
        message.loading('正在生成Excel文件...', 1);
        
        const exportData = filteredCustomers.map(customer => ({
          '姓名': customer.attributes.name,
          '電話': customer.attributes.phone,
          '電子郵件': customer.attributes.email,
          '地址': customer.attributes.address,
          '備註': customer.attributes.notes,
          '狀態': statusMap[customer.attributes.status]?.text,
          '來源': sourceMap[customer.attributes.source],
          '創建時間': new Date(customer.attributes.createdAt).toLocaleString(),
          '更新時間': new Date(customer.attributes.updatedAt).toLocaleString(),
          '房產合約': customer.attributes.hasContract ? '有' : '無',
          '合約資訊': customer.attributes.contractInfo || '',
          '合約日期': customer.attributes.contractDate || '',
          '相關建案': customer.attributes.projects?.data?.map(p => p.attributes.name || `建案 ${p.id}`).join(', ') || '',
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '我的客戶');
        
        const fileName = isFiltered 
          ? `我的客戶_篩選結果_${new Date().toISOString().split('T')[0]}.xlsx`
          : `我的客戶_全部_${new Date().toISOString().split('T')[0]}.xlsx`;
          
        XLSX.writeFile(wb, fileName);
        
        message.success(`成功導出 ${exportData.length} 筆客戶資料`);
      }
    });
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
    setFilteredCustomers(customers);
    setFilterVisible(false);
  };

  const applyFilters = (formValues = null) => {
    try {
      let filtered = [...customers];
      
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        filtered = filtered.filter(customer => 
          (customer.attributes.name && customer.attributes.name.toLowerCase().includes(keyword)) ||
          (customer.attributes.phone && customer.attributes.phone.toString().includes(keyword)) ||
          (customer.attributes.email && customer.attributes.email.toLowerCase().includes(keyword)) ||
          (customer.attributes.address && customer.attributes.address.toLowerCase().includes(keyword))
        );
      }
      
      if (formValues) {
        if (formValues.status && formValues.status.length > 0) {
          filtered = filtered.filter(customer => 
            customer.attributes.status && formValues.status.includes(customer.attributes.status)
          );
        }
        
        if (formValues.source && formValues.source.length > 0) {
          filtered = filtered.filter(customer => 
            customer.attributes.source && formValues.source.includes(customer.attributes.source)
          );
        }
        
        if (formValues.hasContract !== undefined && formValues.hasContract !== '') {
          const hasContract = formValues.hasContract === true || formValues.hasContract === 'true';
          filtered = filtered.filter(customer => 
            customer.attributes.hasContract === hasContract
          );
        }
        
        if (formValues.project) {
          filtered = filtered.filter(customer => 
            customer.attributes.projects?.data?.some(p => p.id === formValues.project)
          );
        }
        
        if (formValues.dateRange && formValues.dateRange[0] && formValues.dateRange[1]) {
          const startDate = new Date(formValues.dateRange[0].format('YYYY-MM-DD'));
          const endDate = new Date(formValues.dateRange[1].format('YYYY-MM-DD'));
          endDate.setHours(23, 59, 59, 999);
          
          filtered = filtered.filter(customer => {
            if (!customer.attributes.createdAt) return false;
            const createdAt = new Date(customer.attributes.createdAt);
            return createdAt >= startDate && createdAt <= endDate;
          });
        }
      }
      
      if (filtered.length !== customers.length) {
        message.info(`共找到 ${filtered.length} 位客戶`);
      }
      
      setFilteredCustomers(filtered);
    } catch (error) {
      console.error('Error applying filters:', error);
      message.error('過濾出錯，請重試');
      setFilteredCustomers(customers);
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
      key: 'phone',
      render: (_, record) => record.attributes.phone || '-',
    },
    {
      title: '電子郵件',
      key: 'email',
      render: (_, record) => (
        record.attributes.email ? (
          <a href={`mailto:${record.attributes.email}`}>
            {record.attributes.email}
          </a>
        ) : '-'
      ),
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
      title: '合約',
      dataIndex: ['attributes', 'hasContract'],
      key: 'hasContract',
      render: (hasContract) => (
        <Tag color={hasContract ? 'green' : 'gray'}>
          {hasContract ? '已簽約' : '未簽約'}
        </Tag>
      ),
    },
    {
      title: '相關建案',
      key: 'projects',
      render: (_, record) => {
        const projects = record.attributes.projects?.data || [];
        return projects.length > 0 
          ? projects.map(p => p.attributes.name || `建案 ${p.id}`).join(', ')
          : '無';
      }
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
          <Tooltip title="添加合約">
            <Button 
              type="text" 
              icon={<FileAddOutlined />} 
              onClick={() => handleContract(record)} 
            />
          </Tooltip>
          <Tooltip title="添加互動記錄">
            <Button 
              type="text" 
              icon={<InteractionOutlined />} 
              onClick={() => handleInteraction(record)} 
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="我的客戶"
      extra={
        <Space>
          <Input
            placeholder="搜索客戶"
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
            onClick={() => fetchCustomers()}
          >
            刷新
          </Button>
          <Button
            type="primary"
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
              <Form.Item name="status" label="客戶狀態" style={{ minWidth: '200px' }}>
                <Select mode="multiple" placeholder="選擇客戶狀態" style={{ width: '200px' }}>
                  {Object.entries(statusMap).map(([value, { text }]) => (
                    <Option key={value} value={value}>{text}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="source" label="客戶來源" style={{ minWidth: '200px' }}>
                <Select mode="multiple" placeholder="選擇客戶來源" style={{ width: '200px' }}>
                  {Object.entries(sourceMap).map(([value, text]) => (
                    <Option key={value} value={value}>{text}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="hasContract" label="合約狀態" style={{ minWidth: '200px' }}>
                <Select placeholder="選擇合約狀態" style={{ width: '200px' }}>
                  <Option value="">全部</Option>
                  <Option value={true}>已簽約</Option>
                  <Option value={false}>未簽約</Option>
                </Select>
              </Form.Item>
              <Form.Item name="project" label="相關建案" style={{ minWidth: '200px' }}>
                <Select 
                  placeholder="選擇建案" 
                  style={{ width: '200px' }}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  optionFilterProp="children"
                >
                  <Option value="">全部</Option>
                  {projects.map(project => (
                    <Option key={project.id} value={project.id}>
                      {project.attributes.name || `建案 ${project.id}`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="dateRange" label="創建日期" style={{ minWidth: '300px' }}>
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
        dataSource={filteredCustomers}
        rowKey={record => record.id}
        loading={loading}
      />

      <Modal
        title="編輯客戶資料"
        open={editModalVisible}
        onOk={handleSave}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={700}
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
            name="projects"
            label="相關建案"
          >
            <Select 
              mode="multiple" 
              placeholder="請選擇相關建案"
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
              optionFilterProp="children"
            >
              {projects.map(project => (
                <Select.Option key={project.id} value={project.id}>
                  {project.attributes.name || `建案 ${project.id}`}
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
        title="添加房產合約"
        open={contractModalVisible}
        onOk={handleContractSubmit}
        onCancel={() => setContractModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={contractForm}
          layout="vertical"
        >
          <Form.Item
            name="contractInfo"
            label="合約信息"
            rules={[{ required: true, message: '請輸入合約信息' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="contractDate"
            label="合約日期"
          >
            <Input type="date" />
          </Form.Item>
          <Form.Item
            name="contract"
            label="上傳合約文件"
          >
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" />
            <div style={{ marginTop: 8 }}>
              支持 .pdf, .jpg, .jpeg, .png 格式文件
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加互動記錄"
        open={interactionModalVisible}
        onOk={handleInteractionSubmit}
        onCancel={() => setInteractionModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={interactionForm}
          layout="vertical"
        >
          <Form.Item
            name="type"
            label="互動類型"
            rules={[{ required: true, message: '請選擇互動類型' }]}
          >
            <Select>
              {Object.entries(interactionTypeMap).map(([value, text]) => (
                <Select.Option key={value} value={value}>
                  {text}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="notes"
            label="互動內容"
            rules={[{ required: true, message: '請輸入互動內容' }]}
          >
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item
            name="date"
            label="互動日期"
            rules={[{ required: true, message: '請選擇互動日期' }]}
            initialValue={new Date().toISOString().split('T')[0]}
          >
            <Input type="date" />
          </Form.Item>
          <Form.Item
            name="next_follow_up"
            label="跟進日期"
            initialValue={new Date().toISOString().split('T')[0]}
          >
            <Input type="date" />
          </Form.Item>
          <Form.Item
            name="status"
            label="互動狀態"
            initialValue="pending"
          >
            <Select>
              {Object.entries(interactionStatusMap).map(([value, { text }]) => (
                <Select.Option key={value} value={value}>
                  {text}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default MyCustomers; 