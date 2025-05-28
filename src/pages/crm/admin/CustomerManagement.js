import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Tag, Tooltip, Checkbox, Row, Col, DatePicker, Tabs, Switch, Upload, Typography, Popconfirm, Alert, Timeline, Empty, Spin } from 'antd';
import { EditOutlined, DeleteOutlined, ExportOutlined, UserSwitchOutlined, FileAddOutlined, FilterOutlined, SearchOutlined, ReloadOutlined, FileTextOutlined, RollbackOutlined, FileExcelOutlined, CloudUploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import styles from './CustomerManagement.module.css';
import { API_BASE_URL } from '../../../utils/api';
import moment from 'moment';

const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 自定義狀態顯示組件
const StatusIndicator = ({ color, text }) => (
  <div className={styles.statusIndicator}>
    <div 
      className={styles.statusDot}
      style={{ backgroundColor: color }}
    />
    <span className={styles.statusText}>{text}</span>
  </div>
);

// 創建一個判斷是否為移動設備的函數
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      // 檢測iPadOS 13+
      const isIPad = /Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
      // 普通移動設備檢測
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      // 屏幕寬度檢測
      const isSmallScreen = window.innerWidth < 1025;
      
      setIsMobile(isIPad || isMobileDevice || isSmallScreen);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);
  
  return isMobile;
};

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [salesStaff, setSalesStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [batchAssignModalVisible, setBatchAssignModalVisible] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [currentNotes, setCurrentNotes] = useState('');
  const [currentCustomerName, setCurrentCustomerName] = useState('');
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [contractFile, setContractFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [contactRecordModalVisible, setContactRecordModalVisible] = useState(false);
  const [contactRecordsVisible, setContactRecordsVisible] = useState(false);
  const [contactRecords, setContactRecords] = useState([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [pendingCustomersVisible, setPendingCustomersVisible] = useState(false);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [displayColumns, setDisplayColumns] = useState([]);
  const isMobile = useIsMobile();
  const [contactForm] = Form.useForm();

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

  // 自定義標籤樣式 - 接收isMobile作為參數
  const CustomTag = ({ color, text, round = false, isMobile = false }) => {
    const tagStyle = {
      color: color, 
      background: `${color}10`,
      borderColor: `${color}30`,
      padding: isMobile ? '1px 5px' : '2px 8px',
      fontSize: isMobile ? '11px' : '13px',
      borderRadius: round ? '12px' : '2px',
      fontWeight: isMobile ? 400 : 500,
      border: `1px solid ${color}30`,
      boxShadow: 'none',
      display: 'inline-block',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: isMobile ? '60px' : '100%'
    };
    
    return (
      <Tooltip title={text}>
        <span style={tagStyle}>{text}</span>
      </Tooltip>
    );
  };

  // 聯絡類型映射
  const contactTypeMap = {
    phone: '電話聯絡',
    email: '電子郵件',
    meeting: '面對面會議',
    video: '視訊會議',
    social: '社群媒體',
    other: '其他方式'
  };

  // 聯絡結果映射
  const contactResultMap = {
    interested: '有興趣',
    considering: '考慮中',
    callback: '要求回電',
    meeting: '約定會面',
    no_answer: '未接通',
    not_interested: '無興趣',
    wrong_number: '號碼有誤',
    other: '其他'
  };

  // 基礎列定義
  const baseColumns = [
    {
      title: '姓名',
      dataIndex: ['attributes', 'name'],
      key: 'name',
      fixed: 'left',
      width: 120,
    },
    {
      title: '電話',
      dataIndex: ['attributes', 'phone'],
      key: 'phone',
      width: 120,
      render: (phone) => (
        <Tooltip title={phone}>
          {maskPhone(phone)}
        </Tooltip>
      ),
    },
    {
      title: '電子郵件',
      dataIndex: ['attributes', 'email'],
      key: 'email',
      width: 180,
      render: (email) => (
        <Tooltip title={email}>
          {maskEmail(email)}
        </Tooltip>
      ),
    },
    {
      title: '狀態',
      dataIndex: ['attributes', 'status'],
      key: 'status',
      width: 100,
      render: (status) => (
        <CustomTag 
          color={statusMap[status]?.color} 
          text={statusMap[status]?.text}
          round={true}
          isMobile={isMobile}
        />
      ),
      filters: Object.entries(statusMap).map(([value, { text }]) => ({
        text,
        value,
      })),
      onFilter: (value, record) => record.attributes.status === value,
    },
    {
      title: '來源',
      dataIndex: ['attributes', 'source'],
      key: 'source',
      width: 100,
      render: (source) => sourceMap[source],
    },
    {
      title: '備註',
      dataIndex: ['attributes', 'notes'],
      key: 'notes',
      width: isMobile ? 100 : 180,
      ellipsis: true,
      render: (notes, record) => {
        if (!notes || notes.trim() === '') {
          return <span style={{ color: '#c0c0c0' }}>無</span>;
        }
        
        // 在iPad上顯示更短的預覽
        const previewLength = isMobile ? 6 : 20;
        const displayText = notes.length > previewLength 
          ? `${notes.substring(0, previewLength)}...` 
          : notes;
        
        return (
          <Tooltip title={notes}>
            <div 
              className={styles.noteText} 
              onClick={() => handleViewNotes(record)}
            >
              {displayText}
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: '合約',
      dataIndex: ['attributes', 'hasContract'],
      key: 'hasContract',
      width: 100,
      render: (hasContract) => (
        <CustomTag 
          color={hasContract ? '#52c41a' : '#87878a'} 
          text={hasContract ? '已簽約' : '未簽約'}
          isMobile={isMobile}
        />
      ),
    },
    {
      title: '負責業務',
      dataIndex: ['attributes', 'sales_staff', 'data', 'attributes', 'username'],
      key: 'sales_staff',
      width: 120,
      render: (text) => text || '未指派'
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: isMobile ? 80 : 150,
      render: (_, record) => <ActionButtons record={record} />,
    },
  ];

  useEffect(() => {
    fetchCustomers();
    fetchSalesStaff();
    fetchProjects();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [customers, searchKeyword]);

  // 根據設備顯示不同的列
  useEffect(() => {
    if (isMobile) {
      // 在iPad上隱藏部分列以改善顯示效果
      const updatedColumns = baseColumns.filter(col => 
        !['email'].includes(col.key)
      );
      
      // 在iPad上調整操作欄位的寬度
      updatedColumns.forEach(col => {
        if (col.key === 'action') {
          col.width = 70;
        }
        
        // 縮小名字欄寬度
        if (col.key === 'name') {
          col.width = 90;
        }
        
        // 縮小電話欄寬度
        if (col.key === 'phone') {
          col.width = 90;
        }
        
        // 縮小備註欄寬度
        if (col.key === 'notes') {
          col.width = 80;
        }
      });
      
      setDisplayColumns(updatedColumns);
    } else {
      setDisplayColumns(baseColumns);
    }
  }, [isMobile]);

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
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/customers?populate=*`);
      const data = await response.json();
      setCustomers(data.data);
      setFilteredCustomers(data.data);
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
      source: record.attributes.source,
      projects: record.attributes.projects?.data?.map(p => p.id) || [],
      sales_staff: record.attributes.sales_staff?.data?.id || null,
      hasContract: record.attributes.hasContract || false,
      contractInfo: record.attributes.contractInfo || '',
      contractDate: record.attributes.contractDate || '',
    });
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      console.log('準備更新客戶，ID:', currentCustomer.id);
      console.log('表單數據:', values);
      
      // 簡化API數據
      const apiData = {
        data: {
          name: values.name,
          email: values.email || null,
          phone: values.phone || null,
          status: values.status,
          source: values.source,
          notes: values.notes || null,
          address: values.address || null
        }
      };
      
      // 移除所有undefined和null值
      Object.keys(apiData.data).forEach(key => {
        if (apiData.data[key] === undefined || apiData.data[key] === null) {
          delete apiData.data[key];
        }
      });
      
      console.log('API請求數據:', JSON.stringify(apiData, null, 2));
      
      const response = await fetch(`${API_BASE_URL}/api/customers/${currentCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });
      
      // 檢查API響應
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API錯誤詳情:', errorText);
        throw new Error(`更新失敗 (${response.status}): ${response.statusText}`);
      }

      message.success('客戶資料已更新');
      setEditModalVisible(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      message.error(`更新客戶資料失敗: ${error.message}`);
    }
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: '確認刪除',
      content: `確定要刪除客戶 ${record.attributes.name} 嗎？`,
      okText: '確認',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/customers/${record.id}`, {
            method: 'DELETE',
          });

          if (!response.ok) throw new Error('刪除失敗');

          message.success('客戶已刪除');
          fetchCustomers();
        } catch (error) {
          console.error('Error deleting customer:', error);
          message.error('刪除客戶失敗');
        }
      },
    });
  };

  const handleBatchAssign = async () => {
    if (!selectedStaff) {
      message.error('請選擇業務');
      return;
    }

    try {
      console.log(`批量分配客戶給業務ID: ${selectedStaff}, 共 ${selectedRows.length} 筆`);
      
      await Promise.all(selectedRows.map(record => {
        // 準備API數據 - 最簡化
        const apiData = {
          data: {
            sales_staff: selectedStaff
          }
        };
        
        console.log(`更新客戶ID: ${record.id}, 數據:`, JSON.stringify(apiData, null, 2));
        
        return fetch(`${API_BASE_URL}/api/customers/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
          body: JSON.stringify(apiData)
        });
      }));

      message.success('成功批量指派業務');
      setBatchAssignModalVisible(false);
      setSelectedRows([]);
      setSelectedStaff(null);
      fetchCustomers();
    } catch (error) {
      console.error('Error batch assigning:', error);
      message.error('批量指派失敗');
    }
  };

  const handleBatchUnassign = async () => {
    Modal.confirm({
      title: '確認沒收客戶',
      content: `確定要從業務員手中收回這 ${selectedRows.length} 個客戶的分配嗎？`,
      okText: '確認沒收',
      cancelText: '取消',
      onOk: async () => {
        try {
          console.log(`批量收回 ${selectedRows.length} 筆客戶的業務分配`);
          
          await Promise.all(selectedRows.map(record => {
            // 準備API數據 - 最簡化
            const apiData = {
              data: {
                sales_staff: null
              }
            };
            
            console.log(`取消客戶ID: ${record.id} 的業務分配, 數據:`, JSON.stringify(apiData, null, 2));
            
            return fetch(`${API_BASE_URL}/api/customers/${record.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
              body: JSON.stringify(apiData)
            });
          }));

          message.success('成功批量收回業務分配');
          setSelectedRows([]);
          fetchCustomers();
        } catch (error) {
          console.error('Error batch unassigning:', error);
          message.error('批量收回分配失敗');
        }
      }
    });
  };

  // 重置表單，用於新增客戶
  const resetForm = () => {
    form.resetFields();
    // 設置默認值
    form.setFieldsValue({
      status: 'potential',
      source: 'website',
      hasContract: false
    });
  };

  // 新增客戶處理函數
  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      console.log('準備新增客戶');
      console.log('表單數據:', values);
      
      // 簡化API數據
      const apiData = {
            data: {
          name: values.name,
          email: values.email || null,
          phone: values.phone || null,
          status: values.status,
          source: values.source,
          notes: values.notes || null,
          address: values.address || null
        }
      };
      
      // 移除所有undefined和null值
      Object.keys(apiData.data).forEach(key => {
        if (apiData.data[key] === undefined || apiData.data[key] === null) {
          delete apiData.data[key];
        }
      });
      
      console.log('API請求數據:', JSON.stringify(apiData, null, 2));
      
      const response = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      // 檢查API響應
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API錯誤詳情:', errorText);
        throw new Error(`新增失敗 (${response.status}): ${response.statusText}`);
      }

      message.success('客戶資料已新增');
      setAddModalVisible(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error adding customer:', error);
      message.error(`新增客戶資料失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setContractFile(file);
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
      '電話': `'${customer.attributes.phone}`,
          '電話(遮罩)': `'${maskPhone(customer.attributes.phone)}`,
      '電子郵件': customer.attributes.email,
          '電子郵件(遮罩)': maskEmail(customer.attributes.email),
      '地址': customer.attributes.address,
      '備註': customer.attributes.notes,
      '狀態': statusMap[customer.attributes.status]?.text,
      '來源': sourceMap[customer.attributes.source],
      '負責業務': customer.attributes.sales_staff?.data?.attributes?.username || '未指派',
      '創建時間': new Date(customer.attributes.createdAt).toLocaleString(),
      '更新時間': new Date(customer.attributes.updatedAt).toLocaleString(),
          '房產合約': customer.attributes.hasContract ? '有' : '無',
          '合約資訊': customer.attributes.contractInfo || '',
          '合約日期': customer.attributes.contractDate || '',
          '相關建案': customer.attributes.projects?.data?.map(p => p.attributes.name || `建案 ${p.id}`).join(', ') || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    if (!ws['!cols']) ws['!cols'] = [];
    ws['!cols'][1] = { wch: 15, t: 's' };
        ws['!cols'][2] = { wch: 15, t: 's' };
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '客戶資料');
        
        const fileName = isFiltered 
          ? `客戶資料_篩選結果_${new Date().toISOString().split('T')[0]}.xlsx`
          : `客戶資料_全部_${new Date().toISOString().split('T')[0]}.xlsx`;
          
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
        
        if (formValues.sales_staff) {
          filtered = filtered.filter(customer => 
            customer.attributes.sales_staff?.data?.id === formValues.sales_staff
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

  const handleViewNotes = (record) => {
    setCurrentNotes(record.attributes.notes || '無備註');
    setCurrentCustomerName(record.attributes.name);
    setNotesModalVisible(true);
  };

  const ActionButtons = ({ record }) => {
    if (isMobile) {
      return (
        <div className={styles.mobileActions}>
          <div className={styles.actionRow}>
          <Tooltip title="編輯">
            <Button 
              type="text" 
                size="small"
                className={styles.actionButton}
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)} 
            />
          </Tooltip>
            <Tooltip title="聯絡記錄">
            <Button 
              type="text" 
                size="small"
                className={styles.actionButton}
                icon={<FileTextOutlined />} 
                onClick={() => handleViewContactRecords(record)} 
              />
            </Tooltip>
          </div>
          <div className={styles.actionRow}>
            <Tooltip title="添加跟進">
              <Button 
                type="text" 
                size="small"
                className={styles.actionButton}
                icon={<FileAddOutlined />} 
                onClick={() => handleAddCustomerContactRecord(record)} 
            />
          </Tooltip>
          <Tooltip title="刪除">
            <Button 
              type="text" 
                size="small"
                className={styles.actionButton}
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDelete(record)} 
            />
          </Tooltip>
          </div>
        </div>
      );
    }
    
    return (
      <div className={styles.actionButtonsGroup}>
        <Tooltip title="編輯">
          <Button 
            type="text" 
            size="small"
            className={styles.actionButton}
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)} 
          />
        </Tooltip>
        <Tooltip title="聯絡記錄">
          <Button 
            type="text" 
            size="small"
            className={styles.actionButton}
            icon={<FileTextOutlined />} 
            onClick={() => handleViewContactRecords(record)} 
          />
        </Tooltip>
        <Tooltip title="添加跟進">
          <Button 
            type="text" 
            size="small"
            className={styles.actionButton}
            icon={<FileAddOutlined />} 
            onClick={() => handleAddCustomerContactRecord(record)} 
          />
        </Tooltip>
        <Tooltip title="刪除">
          <Button 
            type="text" 
            size="small"
            className={styles.actionButton}
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record)} 
          />
        </Tooltip>
      </div>
    );
  };

  // 處理CSV文件上傳
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCsvFile(file);
      // 預覽CSV內容
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const csvText = event.target.result;
          const rows = csvText.split('\n');
          
          // 假設第一行是標題
          const headers = rows[0].split(',').map(h => h.trim());
          
          // 預覽前5行數據
          const previewData = [];
          for (let i = 1; i < Math.min(rows.length, 6); i++) {
            if (rows[i].trim()) {
              const values = rows[i].split(',').map(v => v.trim());
              const row = {};
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              previewData.push(row);
            }
          }
          
          setImportPreview(previewData);
        } catch (error) {
          console.error('Error parsing CSV:', error);
          message.error('CSV解析失敗，請確認格式正確');
          setCsvFile(null);
          setImportPreview([]);
        }
      };
      reader.readAsText(file);
    }
  };

  // 處理CSV客戶匯入
  const handleCsvImport = async () => {
    if (!csvFile) {
      message.error('請先選擇CSV文件');
      return;
    }
    
    setImportLoading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const csvText = event.target.result;
          const rows = csvText.split('\n');
          
          // 假設第一行是標題
          const headers = rows[0].split(',').map(h => h.trim());
          
          // 待匯入的客戶數據
          const customersToImport = [];
          
          // 從第二行開始解析數據
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i].trim();
            if (row) {
              const values = row.split(',').map(v => v.trim());
              
              const customer = {
                name: '',
                phone: '',
                email: '',
                address: '',
                status: 'potential',
                source: 'website',
                notes: '',
                hasContract: false
              };
              
              // 匹配標題與值
              headers.forEach((header, index) => {
                const value = values[index] || '';
                
                // 根據標題欄位映射到客戶屬性
                switch(header.toLowerCase()) {
                  case '姓名':
                  case 'name':
                    customer.name = value;
                    break;
                  case '電話':
                  case 'phone':
                    customer.phone = value;
                    break;
                  case '電子郵件':
                  case 'email':
                    customer.email = value;
                    break;
                  case '地址':
                  case 'address':
                    customer.address = value;
                    break;
                  case '狀態':
                  case 'status':
                    // 將中文狀態映射到英文狀態標識
                    if (value === '潛在客戶') customer.status = 'potential';
                    else if (value === '已聯繫') customer.status = 'contacted';
                    else if (value === '洽談中') customer.status = 'negotiating';
                    else if (value === '已成交') customer.status = 'closed';
                    else if (value === '已流失') customer.status = 'lost';
                    else if (Object.keys(statusMap).includes(value)) customer.status = value;
                    break;
                  case '來源':
                  case 'source':
                    // 將中文來源映射到英文來源標識
                    if (value === '網站') customer.source = 'website';
                    else if (value === '活動') customer.source = 'event';
                    else if (value === '推薦') customer.source = 'referral';
                    else if (value === '其他') customer.source = 'other';
                    else if (Object.keys(sourceMap).includes(value)) customer.source = value;
                    break;
                  case '備註':
                  case 'notes':
                    customer.notes = value;
                    break;
                  case '合約':
                  case 'hascontract':
                    customer.hasContract = value === '是' || value === 'true' || value === '1';
                    break;
                  default:
                    break;
                }
              });
              
              // 僅添加有姓名的客戶
              if (customer.name) {
                customersToImport.push(customer);
              }
            }
          }
          
          // 批量創建客戶
          const results = await Promise.allSettled(
            customersToImport.map(customer => 
              fetch(`${API_BASE_URL}/api/customers`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ data: customer }),
              })
            )
          );
          
          // 計算成功和失敗數量
          const successCount = results.filter(result => result.status === 'fulfilled').length;
          const failCount = results.filter(result => result.status === 'rejected').length;
          
          if (successCount > 0) {
            message.success(`成功匯入 ${successCount} 位客戶`);
            if (failCount > 0) {
              message.warning(`有 ${failCount} 位客戶匯入失敗`);
            }
            fetchCustomers();
            setImportModalVisible(false);
            setCsvFile(null);
            setImportPreview([]);
          } else {
            message.error('匯入失敗，請檢查CSV格式');
          }
        } catch (error) {
          console.error('Error importing CSV:', error);
          message.error('匯入失敗，請檢查CSV格式');
        } finally {
          setImportLoading(false);
        }
      };
      
      reader.readAsText(csvFile);
    } catch (error) {
      console.error('Error reading CSV file:', error);
      message.error('讀取CSV文件失敗');
      setImportLoading(false);
    }
  };

  // 處理添加聯絡記錄
  const handleAddContactRecord = () => {
    setCurrentCustomer(null);
    contactForm.resetFields();
    setContactRecordModalVisible(true);
  };

  // 處理添加特定客戶的聯絡記錄
  const handleAddCustomerContactRecord = (customer) => {
    setCurrentCustomer(customer);
    contactForm.resetFields();
    contactForm.setFieldsValue({
      customer_id: customer.id,
      customer_name: customer.attributes.name,
    });
    setContactRecordModalVisible(true);
  };

  // 保存聯絡記錄
  const handleSaveContactRecord = async () => {
    try {
      const values = await contactForm.validateFields();
      setContactLoading(true);
      
      // 構建聯絡記錄資料
      const contactData = {
        content: values.content,
        contact_type: values.contact_type,
        contact_result: values.contact_result,
        // 如果是從客戶詳情添加，使用當前客戶ID，否則使用選擇的客戶ID
        customer: values.customer_id,
        sales_staff: values.sales_staff,
        contact_date: values.contact_date ? values.contact_date.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
        next_follow_up_date: values.next_follow_up_date ? values.next_follow_up_date.format('YYYY-MM-DD') : null,
      };

      // 保存聯絡記錄
      const response = await fetch(`${API_BASE_URL}/api/contact-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: contactData }),
      });

      if (!response.ok) throw new Error('保存聯絡記錄失敗');

      message.success('聯絡記錄已保存');
      setContactRecordModalVisible(false);
      
      // 如果當前在查看客戶的聯絡記錄，則刷新記錄
      if (contactRecordsVisible && currentCustomer) {
        fetchCustomerContactRecords(currentCustomer.id);
      }
    } catch (error) {
      console.error('Error saving contact record:', error);
      message.error('保存聯絡記錄失敗');
    } finally {
      setContactLoading(false);
    }
  };

  // 獲取客戶的聯絡記錄
  const fetchCustomerContactRecords = async (customerId) => {
    try {
      setContactLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/contact-records?filters[customer][id][$eq]=${customerId}&populate=*&sort=contact_date:desc`);
      
      if (!response.ok) throw new Error('獲取聯絡記錄失敗');
      
      const data = await response.json();
      setContactRecords(data.data || []);
      setContactRecordsVisible(true);
    } catch (error) {
      console.error('Error fetching contact records:', error);
      message.error('獲取聯絡記錄失敗');
    } finally {
      setContactLoading(false);
    }
  };

  // 查看客戶聯絡記錄
  const handleViewContactRecords = (customer) => {
    setCurrentCustomer(customer);
    setCurrentCustomerName(customer.attributes.name);
    fetchCustomerContactRecords(customer.id);
  };

  // 獲取待分配客戶列表
  const handleViewPendingCustomers = () => {
    setPendingCustomersVisible(true);
    
    // 過濾未分配業務的客戶
    const pending = customers.filter(customer => 
      !customer.attributes.sales_staff?.data
    );
    
    setFilteredCustomers(pending);
    message.info(`共有 ${pending.length} 位待分配客戶`);
  };

  return (
    <div className={styles.customerManagement}>
      <Card
        title={
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>客戶管理</div>
            <div className={styles.headerActions}>
              <div className={styles.actionButtons}>
                <Button
                  type="primary"
                  icon={<FileAddOutlined />}
                  onClick={() => {
                    resetForm();
                    setAddModalVisible(true);
                  }}
                >
                  新增客戶
                </Button>
                <Button
                  icon={<CloudUploadOutlined />}
                  onClick={() => setImportModalVisible(true)}
                >
                  CSV匯入
                </Button>
                <Button
                  icon={<FileTextOutlined />}
                  onClick={handleAddContactRecord}
                >
                  新增聯絡記錄
                </Button>
                <Button
                  icon={<UserSwitchOutlined />}
                  onClick={handleViewPendingCustomers}
                >
                  待分配客戶
                </Button>
              </div>
              <div className={styles.searchAndFilterArea}>
                <Input
                  placeholder="搜索客戶"
                  value={searchKeyword}
                  onChange={handleSearch}
                  prefix={<SearchOutlined />}
                  style={{ width: isMobile ? '100%' : 200 }}
                />
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setFilterVisible(!filterVisible)}
                >
                  進階篩選
                </Button>
            <Button
              type="primary"
              icon={<UserSwitchOutlined />}
              onClick={() => setBatchAssignModalVisible(true)}
              disabled={selectedRows.length === 0}
            >
              批量指派
            </Button>
                <Button
                  danger
                  icon={<RollbackOutlined />}
                  onClick={handleBatchUnassign}
                  disabled={selectedRows.length === 0}
                >
                  批量沒收
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={exportToExcel}
            >
              導出Excel
            </Button>
              </div>
            </div>
          </div>
        }
        bordered={false}
        className={styles.customerCard}
      >
        {filterVisible && (
          <div className={styles.filterPanel}>
            <Form
              form={filterForm}
              layout="horizontal"
              onFinish={handleFilter}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={isMobile ? 12 : 8} lg={isMobile ? 8 : 6}>
                  <Form.Item name="status" label="客戶狀態">
                    <Select mode="multiple" placeholder="選擇客戶狀態">
                      {Object.entries(statusMap).map(([value, { text }]) => (
                        <Option key={value} value={value}>{text}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={isMobile ? 12 : 8} lg={isMobile ? 8 : 6}>
                  <Form.Item name="source" label="客戶來源">
                    <Select mode="multiple" placeholder="選擇客戶來源">
                      {Object.entries(sourceMap).map(([value, text]) => (
                        <Option key={value} value={value}>{text}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={isMobile ? 12 : 8} lg={isMobile ? 8 : 6}>
                  <Form.Item name="sales_staff" label="負責業務">
                    <Select placeholder="選擇業務">
                      <Option value="">全部</Option>
                      {salesStaff.map(staff => (
                        <Option key={staff.id} value={staff.id}>
                          {staff.attributes.username}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={isMobile ? 12 : 8} lg={isMobile ? 8 : 6}>
                  <Form.Item name="hasContract" label="合約狀態">
                    <Select placeholder="選擇合約狀態">
                      <Option value="">全部</Option>
                      <Option value={true}>已簽約</Option>
                      <Option value={false}>未簽約</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={isMobile ? 12 : 8} lg={isMobile ? 8 : 6}>
                  <Form.Item name="project" label="相關建案">
                    <Select 
                      placeholder="選擇建案"
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
                </Col>
                <Col xs={24} sm={12} md={isMobile ? 12 : 8} lg={isMobile ? 8 : 6}>
                  <Form.Item name="dateRange" label="創建日期">
                    <RangePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={24} md={isMobile ? 24 : 8} lg={isMobile ? 24 : 6} className={styles.filterButtons}>
                  <Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit">
                        篩選
                      </Button>
                      <Button onClick={handleResetFilter} icon={<ReloadOutlined />}>
                        重置
                      </Button>
                    </Space>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </div>
        )}

        <Table
          columns={displayColumns}
          dataSource={filteredCustomers}
          rowKey={record => record.id}
          loading={loading}
          rowSelection={{
            onChange: (_, rows) => setSelectedRows(rows),
            selectedRowKeys: selectedRows.map(row => row.id),
            fixed: true,
          }}
          bordered={false}
          className={styles.customerTable}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 筆客戶資料`
          }}
          scroll={{ 
            x: 'max-content',
            scrollToFirstRowOnChange: true
          }}
          tableLayout="fixed"
          size={isMobile ? "small" : "middle"}
          rowClassName={() => isMobile ? styles.compactRow : ''}
          sticky={{ offsetHeader: 0 }}
        />
      </Card>

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
          <Tabs defaultActiveKey="basic">
            <Tabs.TabPane tab="基本資料" key="basic">
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
            name="source"
            label="來源"
            rules={[{ required: true, message: '請選擇來源' }]}
          >
            <Select>
              {Object.entries(sourceMap).map(([value, text]) => (
                <Select.Option key={value} value={value}>
                  {text}
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
            </Tabs.TabPane>
            
            <Tabs.TabPane tab="業務分配" key="staffAssignment">
          <Form.Item
            name="sales_staff"
                label="負責業務"
          >
                <Select placeholder="請選擇負責業務">
                  <Select.Option value={null}>未指派</Select.Option>
              {salesStaff.map(staff => (
                    <Select.Option key={staff.id} value={staff.id}>
                  {staff.attributes.username}
                    </Select.Option>
              ))}
            </Select>
          </Form.Item>
            </Tabs.TabPane>
            
            <Tabs.TabPane tab="合約信息" key="contract">
              <Form.Item
                name="hasContract"
                label="是否已簽約"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="已簽約" 
                  unCheckedChildren="未簽約" 
                />
              </Form.Item>
              <Form.Item
                name="contractInfo"
                label="合約信息"
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="contractDate"
                label="合約日期"
              >
                <Input type="date" />
              </Form.Item>
            </Tabs.TabPane>
            
            <Tabs.TabPane tab="相關建案" key="projects">
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
            </Tabs.TabPane>
          </Tabs>
        </Form>
      </Modal>

      <Modal
        title={`${currentCustomerName} 的備註`}
        open={notesModalVisible}
        onOk={() => setNotesModalVisible(false)}
        onCancel={() => setNotesModalVisible(false)}
        okText="關閉"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={600}
      >
        <div 
          style={{ 
            background: '#f9f9f9', 
            padding: '16px', 
            borderRadius: '6px',
            whiteSpace: 'pre-wrap',
            maxHeight: '400px',
            overflowY: 'auto',
            fontSize: '14px',
            lineHeight: '1.8',
            border: '1px solid #eee'
          }}
        >
          {currentNotes || '無備註資訊'}
        </div>
      </Modal>

      <Modal
        title="批量指派業務"
        open={batchAssignModalVisible}
        onOk={handleBatchAssign}
        onCancel={() => {
          setBatchAssignModalVisible(false);
          setSelectedStaff(null);
        }}
        okText="確認"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          已選擇 {selectedRows.length} 個客戶
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="選擇業務"
          onChange={value => setSelectedStaff(value)}
          value={selectedStaff}
        >
          {salesStaff.map(staff => (
            <Option key={staff.id} value={staff.id}>
              {staff.attributes.username}
            </Option>
          ))}
        </Select>
      </Modal>

      {/* 新增客戶模態框 */}
      <Modal
        title="新增客戶"
        open={addModalVisible}
        onOk={handleAdd}
        onCancel={() => setAddModalVisible(false)}
        okText="新增"
        cancelText="取消"
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Tabs defaultActiveKey="basic">
            <Tabs.TabPane tab="基本資料" key="basic">
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: '請輸入姓名' }]}
              >
                <Input placeholder="請輸入客戶姓名" />
              </Form.Item>
              <Form.Item
                name="phone"
                label="電話"
                rules={[{ required: true, message: '請輸入電話' }]}
              >
                <Input placeholder="請輸入客戶電話" />
              </Form.Item>
              <Form.Item
                name="email"
                label="電子郵件"
                rules={[{ type: 'email', message: '請輸入有效的電子郵件' }]}
              >
                <Input placeholder="請輸入客戶電子郵件" />
              </Form.Item>
              <Form.Item
                name="address"
                label="地址"
              >
                <Input placeholder="請輸入客戶地址" />
              </Form.Item>
              <Form.Item
                name="status"
                label="狀態"
                rules={[{ required: true, message: '請選擇狀態' }]}
                initialValue="potential"
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
                name="source"
                label="來源"
                rules={[{ required: true, message: '請選擇來源' }]}
                initialValue="website"
              >
                <Select>
                  {Object.entries(sourceMap).map(([value, text]) => (
                    <Select.Option key={value} value={value}>
                      {text}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="notes"
                label="備註"
              >
                <TextArea rows={4} placeholder="客戶備註資訊" />
              </Form.Item>
            </Tabs.TabPane>
            
            <Tabs.TabPane tab="業務分配" key="staffAssignment">
              <Form.Item
                name="sales_staff"
                label="負責業務"
              >
                <Select placeholder="請選擇負責業務">
                  <Select.Option value={null}>未指派</Select.Option>
                  {salesStaff.map(staff => (
                    <Select.Option key={staff.id} value={staff.id}>
                      {staff.attributes.username}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Tabs.TabPane>
            
            <Tabs.TabPane tab="合約信息" key="contract">
              <Form.Item
                name="hasContract"
                label="是否已簽約"
                valuePropName="checked"
                initialValue={false}
              >
                <Switch 
                  checkedChildren="已簽約" 
                  unCheckedChildren="未簽約" 
                />
              </Form.Item>
              <Form.Item
                name="contractInfo"
                label="合約信息"
              >
                <Input placeholder="請輸入合約資訊" />
              </Form.Item>
              <Form.Item
                name="contractDate"
                label="合約日期"
              >
                <Input type="date" />
              </Form.Item>
            </Tabs.TabPane>
            
            <Tabs.TabPane tab="相關建案" key="projects">
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
            </Tabs.TabPane>
          </Tabs>
        </Form>
      </Modal>

      {/* CSV匯入模態框 */}
      <Modal
        title="匯入客戶資料"
        open={importModalVisible}
        onOk={handleCsvImport}
        onCancel={() => {
          setImportModalVisible(false);
          setCsvFile(null);
          setImportPreview([]);
        }}
        okText="匯入"
        cancelText="取消"
        okButtonProps={{ loading: importLoading }}
        width={700}
      >
        <div className={styles.importContainer}>
          <div className={styles.importInstructions}>
            <h3>CSV匯入說明</h3>
            <p>1. 請確保CSV檔案包含姓名、電話等必要欄位</p>
            <p>2. 檔案第一行應為欄位標題，支援的欄位有：</p>
            <ul>
              <li>姓名 (必填)</li>
              <li>電話</li>
              <li>電子郵件</li>
              <li>地址</li>
              <li>狀態 (潛在客戶、已聯繫、洽談中、已成交、已流失)</li>
              <li>來源 (網站、活動、推薦、其他)</li>
              <li>備註</li>
              <li>合約 (是/否)</li>
            </ul>
          </div>
          
          <div className={styles.fileUpload}>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              id="csv-upload"
              style={{ display: 'none' }}
            />
            <label htmlFor="csv-upload">
              <Button icon={<FileAddOutlined />}>
                選擇CSV檔案
              </Button>
              <span style={{ marginLeft: 10 }}>
                {csvFile ? csvFile.name : '尚未選擇檔案'}
              </span>
            </label>
          </div>
          
          {importPreview.length > 0 && (
            <div className={styles.previewSection}>
              <h3>資料預覽</h3>
              <div className={styles.previewTable}>
                <table>
                  <thead>
                    <tr>
                      {Object.keys(importPreview[0]).map(key => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, i) => (
                          <td key={i}>{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.previewNote}>
                注意：此處僅顯示前 5 筆資料預覽
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title="添加聯絡記錄"
        open={contactRecordModalVisible}
        onOk={handleSaveContactRecord}
        onCancel={() => setContactRecordModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={700}
      >
        <Form
          form={contactForm}
          layout="vertical"
        >
          <Form.Item
            name="customer_id"
            hidden
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="customer_name"
            label="客戶"
            rules={[{ required: true, message: '請選擇客戶' }]}
          >
            <Select
              showSearch
              placeholder="請選擇客戶"
              disabled={!!currentCustomer}
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {customers.map(c => (
                <Option key={c.id} value={c.id}>{c.attributes.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="content"
            label="聯絡內容"
            rules={[{ required: true, message: '請輸入聯絡內容' }]}
          >
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item
            name="contact_type"
            label="聯絡類型"
            rules={[{ required: true, message: '請選擇聯絡類型' }]}
          >
            <Select>
              {Object.entries(contactTypeMap).map(([value, text]) => (
                <Option key={value} value={value}>{text}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="contact_result"
            label="聯絡結果"
            rules={[{ required: true, message: '請選擇聯絡結果' }]}
          >
            <Select>
              {Object.entries(contactResultMap).map(([value, text]) => (
                <Option key={value} value={value}>{text}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="contact_date"
            label="聯絡日期"
            rules={[{ required: true, message: '請選擇聯絡日期' }]}
            initialValue={moment()}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="next_follow_up_date"
            label="下次跟進日期"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="sales_staff"
            label="負責業務"
            rules={[{ required: true, message: '請選擇負責業務' }]}
          >
            <Select>
              {salesStaff.map(staff => (
                <Option key={staff.id} value={staff.id}>
                  {staff.attributes.username}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="待分配客戶列表"
        open={pendingCustomersVisible}
        onOk={() => setPendingCustomersVisible(false)}
        onCancel={() => setPendingCustomersVisible(false)}
        okText="確認"
        cancelText="取消"
        width={900}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => setPendingCustomersVisible(false)}
          >
            取消
          </Button>,
          <Button
            key="assign"
            type="primary"
            onClick={() => setBatchAssignModalVisible(true)}
            disabled={selectedRows.length === 0}
          >
            指派給業務
          </Button>
        ]}
      >
        <div className={styles.pendingCustomersInfo}>
          <Alert 
            message={`共有 ${filteredCustomers.length} 位待分配客戶`} 
            type="info" 
            showIcon 
            style={{ marginBottom: 16 }}
          />
          <Table
            columns={[
              {
                title: '姓名',
                dataIndex: ['attributes', 'name'],
                key: 'name',
                width: 120,
              },
              {
                title: '電話',
                dataIndex: ['attributes', 'phone'],
                key: 'phone',
                width: 120,
                render: (phone) => (
                  <Tooltip title={phone}>
                    {maskPhone(phone)}
                  </Tooltip>
                ),
              },
              {
                title: '電子郵件',
                dataIndex: ['attributes', 'email'],
                key: 'email',
                width: 180,
                render: (email) => (
                  <Tooltip title={email}>
                    {maskEmail(email)}
                  </Tooltip>
                ),
              },
              {
                title: '狀態',
                dataIndex: ['attributes', 'status'],
                key: 'status',
                width: 100,
                render: (status) => (
                  <CustomTag 
                    color={statusMap[status]?.color} 
                    text={statusMap[status]?.text}
                    round={true}
                    isMobile={isMobile}
                  />
                ),
              },
              {
                title: '來源',
                dataIndex: ['attributes', 'source'],
                key: 'source',
                width: 100,
                render: (source) => sourceMap[source],
              },
              {
                title: '備註',
                dataIndex: ['attributes', 'notes'],
                key: 'notes',
                width: 180,
                ellipsis: true,
                render: (notes) => {
                  if (!notes || notes.trim() === '') {
                    return <span style={{ color: '#c0c0c0' }}>無</span>;
                  }
                  
                  return (
                    <Tooltip title={notes}>
                      <div className={styles.noteText}>
                        {notes.length > 20 ? `${notes.substring(0, 20)}...` : notes}
                      </div>
                    </Tooltip>
                  );
                }
              }
            ]}
            dataSource={filteredCustomers}
            rowKey={record => record.id}
            size="small"
            pagination={{ pageSize: 5 }}
            scroll={{ x: 800 }}
            rowSelection={{
              onChange: (_, rows) => setSelectedRows(rows),
              selectedRowKeys: selectedRows.map(row => row.id),
            }}
          />
        </div>
      </Modal>

      <Modal
        title={`${currentCustomerName} 的聯絡記錄`}
        open={contactRecordsVisible}
        onOk={() => setContactRecordsVisible(false)}
        onCancel={() => setContactRecordsVisible(false)}
        okText="關閉"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={800}
        footer={[
          <Button 
            key="add" 
            type="primary" 
            onClick={() => handleAddCustomerContactRecord(currentCustomer)}
          >
            添加新記錄
          </Button>,
          <Button 
            key="close" 
            onClick={() => setContactRecordsVisible(false)}
          >
            關閉
          </Button>,
        ]}
      >
        {contactLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin tip="載入中..." />
          </div>
        ) : contactRecords.length === 0 ? (
          <Empty description="暫無聯絡記錄" />
        ) : (
          <div className={styles.contactRecordsList}>
            <Timeline>
              {contactRecords.map(record => {
                const data = record.attributes;
                return (
                  <Timeline.Item 
                    key={record.id}
                    color={getTimelineColor(data.contact_result)}
                  >
                    <div className={styles.contactRecord}>
                      <div className={styles.contactRecordHeader}>
                        <span className={styles.contactDate}>
                          {new Date(data.contact_date).toLocaleDateString()}
                        </span>
                        <Tag color={getContactTypeColor(data.contact_type)}>
                          {contactTypeMap[data.contact_type] || data.contact_type}
                        </Tag>
                        <Tag color={getContactResultColor(data.contact_result)}>
                          {contactResultMap[data.contact_result] || data.contact_result}
                        </Tag>
                      </div>
                      <div className={styles.contactContent}>
                        {data.content}
                      </div>
                      <div className={styles.contactRecordFooter}>
                        <span>業務：{data.sales_staff?.data?.attributes?.username || '未指派'}</span>
                        {data.next_follow_up_date && (
                          <span>
                            下次跟進：{new Date(data.next_follow_up_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </Timeline.Item>
                );
              })}
            </Timeline>
          </div>
        )}
      </Modal>
    </div>
  );
};

// 獲取聯絡類型顏色
const getContactTypeColor = (type) => {
  const colorMap = {
    phone: 'blue',
    email: 'cyan',
    meeting: 'green',
    video: 'purple',
    social: 'magenta',
    other: 'orange'
  };
  return colorMap[type] || 'default';
};

// 獲取聯絡結果顏色
const getContactResultColor = (result) => {
  const colorMap = {
    interested: 'green',
    considering: 'cyan',
    callback: 'blue',
    meeting: 'geekblue',
    no_answer: 'orange',
    not_interested: 'red',
    wrong_number: 'volcano',
    other: 'gray'
  };
  return colorMap[result] || 'default';
};

// 獲取時間軸顏色
const getTimelineColor = (result) => {
  const colorMap = {
    interested: 'green',
    considering: 'blue',
    callback: 'blue',
    meeting: 'green',
    no_answer: 'orange',
    not_interested: 'red',
    wrong_number: 'red',
    other: 'gray'
  };
  return colorMap[result] || 'blue';
};

export default CustomerManagement; 