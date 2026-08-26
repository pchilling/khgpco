import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Tag, Tooltip, Checkbox, Row, Col, DatePicker, Tabs, Switch, Upload, Typography, Popconfirm, Alert, Timeline, Empty, Spin, InputNumber, Radio } from 'antd';
import { EditOutlined, DeleteOutlined, ExportOutlined, UserSwitchOutlined, FileAddOutlined, FilterOutlined, SearchOutlined, ReloadOutlined, FileTextOutlined, RollbackOutlined, FileExcelOutlined, CloudUploadOutlined, DownloadOutlined, UploadOutlined, PlusOutlined } from '@ant-design/icons';
import { SmileTwoTone, MehTwoTone, FrownTwoTone, QuestionCircleTwoTone } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import styles from './CustomerManagement.module.css';
import { API_BASE_URL } from '../../../utils/api';
import { fetchAllStrapi } from '../../../utils/strapiPaginate';
import dayjs from 'dayjs';

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
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
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
  const [duplicateCustomersVisible, setDuplicateCustomersVisible] = useState(false);
  const [duplicateCustomers, setDuplicateCustomers] = useState([]);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [duplicateAssignStaff, setDuplicateAssignStaff] = useState({});
  // 每組選定的「主記錄」客戶 id（保留其姓名/電話/Email，其餘併入）；預設第一筆
  const [duplicatePrimary, setDuplicatePrimary] = useState({});
  // 合併確認框：{ group, groupIndex }，null 為關閉
  const [mergeConfirm, setMergeConfirm] = useState(null);
  const [merging, setMerging] = useState(false);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const [events, setEvents] = useState([]);
  const [channelPeople, setChannelPeople] = useState([]);
  const [customerSources, setCustomerSources] = useState([]);
  const [participations, setParticipations] = useState({}); // customerId -> [{regId, title, sessionText, timeText, building}]
  // 參加活動補登(單一/批次)
  const [partModalOpen, setPartModalOpen] = useState(false);
  const [partCustomer, setPartCustomer] = useState(null); // 單一模式;null=批次
  const [partBatchRows, setPartBatchRows] = useState([]);
  const [partEventId, setPartEventId] = useState(null);
  const [partSessionIdx, setPartSessionIdx] = useState(null);
  const [partSaving, setPartSaving] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [displayColumns, setDisplayColumns] = useState([]);
  const isMobile = useIsMobile();
  const [contactForm] = Form.useForm();
  // Excel匯入相關狀態
  const [excelImportModalVisible, setExcelImportModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState([]);

  const statusMap = {
    potential: { text: '潛在客戶', color: 'blue' },
    contacted: { text: '已聯繫', color: 'cyan' },
    negotiating: { text: '洽談中', color: 'orange' },
    closed: { text: '已成交', color: 'green' },
    lost: { text: '已流失', color: 'red' },
    blacklist: { text: '黑名單', color: 'default' }
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
    phone_call: '電話聯絡',
    email: '電子郵件',
    meeting: '面對面會議',
    site_visit: '實地拜訪',
    other: '其他方式'
  };

  // 聯絡狀態映射
  const contactStatusMap = {
    initial_contact: '初次接觸',
    following_up: '跟進中',
    negotiating: '洽談中',
    contract_signed: '已簽約',
    payment_received: '已收款',
    completed: '已完成',
    pending: '待處理',
    cancelled: '已取消'
  };

  // 聯絡結果映射
  const contactOutcomeMap = {
    positive: '正面',
    neutral: '中性',
    negative: '負面'
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
          <Tag color={statusMap[status]?.color}>
            {statusMap[status]?.text}
          </Tag>
      ),
      filters: Object.entries(statusMap).map(([value, { text }]) => ({
        text,
        value,
      })),
      onFilter: (value, record) => record.attributes.status === value,
    },
    {
      title: '來源',
      key: 'source',
      width: 100,
      render: (_, record) => sourceName(record),
    },
    {
      title: '參加活動',
      key: 'events',
      width: 240,
      render: (_, record) => {
        const parts = participations[record.id] || [];
        let summary;
        if (!parts.length) {
          const evs = record.attributes?.events?.data || [];
          if (!evs.length) {
            summary = <span style={{ color: '#c0c0c0' }}>無</span>;
          } else {
            const names = evs.map(e => e.attributes?.title || `活動 ${e.id}`);
            summary = <Tooltip title={names.join('、')}><span>{names[0]}{names.length > 1 ? ` +${names.length - 1}` : ''}</span></Tooltip>;
          }
        } else {
          const detail = parts.map(p =>
            `${p.title}${p.sessionText ? `｜${p.sessionText}` : ''}${p.timeText ? `｜${p.timeText}` : ''}${p.building ? `｜${p.building}` : ''}`
          ).join('\n');
          const first = parts[0];
          summary = (
            <Tooltip title={<div style={{ whiteSpace: 'pre-line' }}>{detail}</div>}>
              <span>{first.title}{first.building ? `（${first.building}）` : ''}{parts.length > 1 ? ` +${parts.length - 1}` : ''}</span>
            </Tooltip>
          );
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>
            <Button type="link" size="small" style={{ padding: 0, flexShrink: 0 }} onClick={() => openPart(record)}>補登</Button>
          </div>
        );
      },
    },
    {
      title: '渠道',
      key: 'channel_person',
      width: 130,
      render: (_, record) => {
        const cp = record.attributes?.channel_person?.data;
        if (!cp) return <span style={{ color: '#c0c0c0' }}>—</span>;
        const company = cp.attributes?.channel_company?.data?.attributes?.name;
        return (
          <Tooltip title={company ? `${cp.attributes.name}（${company}）` : cp.attributes.name}>
            <Tag color="purple">{cp.attributes?.name}</Tag>
          </Tooltip>
        );
      },
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
    fetchEvents();
    fetchChannelPeople();
    fetchCustomerSources();
    loadParticipations();
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
        
        // 縮小業務欄寬度
        if (col.key === 'sales_staff') {
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
      
      // 並行抓取所有客戶數據
      const allCustomers = await fetchAllStrapi(API_BASE_URL, '/api/customers?populate=*&sort=updatedAt:desc,id:desc');
      
      
      // 檢查數據來源統計
      const sourceCounts = {};
      const statusCounts = {};
      allCustomers.forEach(customer => {
        const source = customer.attributes.source || 'unknown';
        const status = customer.attributes.status || 'unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      
      // 檢查是否有重複ID
      const customerIds = allCustomers.map(c => c.id);
      const uniqueIds = [...new Set(customerIds)];
      if (customerIds.length !== uniqueIds.length) {
        console.warn('⚠️ 發現重複的客戶ID!', {
          總數: customerIds.length,
          唯一ID數: uniqueIds.length,
          重複的ID: customerIds.filter((id, index) => customerIds.indexOf(id) !== index)
        });
      }
      
      
      // 依 updatedAt 降序（保險再排一次）
      allCustomers.sort((a, b) => new Date(b.attributes.updatedAt) - new Date(a.attributes.updatedAt));
      
      setCustomers(allCustomers);
      setFilteredCustomers(allCustomers);
      
      message.success(`✅ 成功載入 ${allCustomers.length} 位客戶資料`);
      
    } catch (error) {
      console.error('Error fetching customers:', error);
      message.error(`獲取客戶資料失敗: ${error.message}`);
      setCustomers([]);
      setFilteredCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // 新增：定期重新載入客戶資料的函數
  const refreshCustomers = () => {
    // 重置搜索關鍵字
    setSearchKeyword('');
    // 重置篩選表單
    filterForm.resetFields();
    setFilterVisible(false);
    // 重新獲取資料
    fetchCustomers();
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects?pagination[pageSize]=1000`);
      const data = await response.json();
      setProjects(data.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events?locale=zh-Hant-TW&populate[session]=*&pagination[pageSize]=1000&sort=createdAt:desc`);
      const data = await response.json();
      setEvents(data.data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchChannelPeople = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/channel-people?populate=channel_company&pagination[pageSize]=1000&sort=createdAt:desc`);
      const data = await response.json();
      setChannelPeople(data.data || []);
    } catch (error) {
      console.error('Error fetching channel people:', error);
    }
  };

  // 客戶來源(動態清單)
  const fetchCustomerSources = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/customer-sources`);
      const data = await res.json();
      setCustomerSources(data.data || []);
    } catch (error) {
      console.error('Error fetching customer sources:', error);
    }
  };

  // 參加活動(報名驅動):撈所有報名,解析活動/場次/時間/建案,依客戶分組
  const loadParticipations = async () => {
    try {
      const regs = await fetchAllStrapi(
        API_BASE_URL,
        '/api/registrations?populate[event][populate][0]=session&populate[event][populate][1]=related_project&populate[customer][fields][0]=name&sort=createdAt:desc'
      );
      const map = {};
      regs.forEach(r => {
        const custId = r.attributes?.customer?.data?.id;
        if (!custId) return;
        const ev = r.attributes?.event?.data;
        const title = ev?.attributes?.title || '未知活動';
        const building = ev?.attributes?.related_project?.data?.attributes?.name || null;
        const sessions = ev?.attributes?.session || [];
        const idx = r.attributes?.sessionIndex;
        const s = (idx !== null && idx !== undefined) ? sessions[idx] : null;
        const sessionText = s?.location || (idx !== null && idx !== undefined ? `場次 ${idx + 1}` : '');
        const timeText = s?.startDateTime
          ? new Date(s.startDateTime).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
          : '';
        if (!map[custId]) map[custId] = [];
        map[custId].push({ regId: r.id, title, building, sessionText, timeText });
      });
      setParticipations(map);
    } catch (error) {
      console.error('Error loading participations:', error);
    }
  };

  // 來源顯示名(優先新關聯,回退舊 enum)
  const sourceName = (record) =>
    record?.attributes?.customer_source?.data?.attributes?.name
    || sourceMap[record?.attributes?.source]
    || '其他';

  // ---------- 參加活動補登 ----------
  const openPart = (customer) => {
    setPartCustomer(customer); setPartBatchRows([]);
    setPartEventId(null); setPartSessionIdx(null);
    setPartModalOpen(true);
  };
  const openPartBatch = () => {
    if (!selectedRows.length) { message.warning('請先勾選客戶'); return; }
    setPartCustomer(null); setPartBatchRows(selectedRows);
    setPartEventId(null); setPartSessionIdx(null);
    setPartModalOpen(true);
  };
  // 補登=幫該客戶建一筆已確認的報名(綁活動+場次)
  const createParticipation = async (customer, eventId, sessionIdx) => {
    const payload = { data: {
      name: customer.attributes?.name,
      phone: customer.attributes?.phone ? String(customer.attributes.phone) : null,
      event: Number(eventId), sessionIndex: Number(sessionIdx), status: 'confirmed',
      customer: customer.id,
      ...(customer.attributes?.sales_staff?.data?.id ? { sales_staff: customer.attributes.sales_staff.data.id } : {}),
      publishedAt: new Date().toISOString(),
    } };
    const res = await fetch(`${API_BASE_URL}/api/registrations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`補登失敗 (${res.status})`);
  };
  const addPart = async () => {
    if (!partEventId || partSessionIdx === null || partSessionIdx === undefined) { message.warning('請選擇活動與場次'); return; }
    setPartSaving(true);
    try {
      const targets = partCustomer ? [partCustomer] : partBatchRows;
      for (const c of targets) { await createParticipation(c, partEventId, partSessionIdx); }
      message.success(`已補登 ${targets.length} 位客戶的參加活動`);
      setPartEventId(null); setPartSessionIdx(null);
      await loadParticipations();
      if (!partCustomer) setPartModalOpen(false); // 批次做完直接關
    } catch (e) {
      message.error(e.message);
    } finally { setPartSaving(false); }
  };
  const removePart = async (regId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/registrations/${regId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`移除失敗 (${res.status})`);
      message.success('已移除該筆參加活動');
      await loadParticipations();
    } catch (e) { message.error(e.message); }
  };
  // 活動(新到舊)與場次
  const eventsNewest = [...events].sort((a, b) => new Date(b.attributes?.createdAt || 0) - new Date(a.attributes?.createdAt || 0));
  const sessionsOfEvent = (eid) => events.find(e => e.id === eid)?.attributes?.session || [];

  const handleEdit = (record) => {
    setCurrentCustomer(record);
    form.setFieldsValue({
      name: record.attributes.name,
      phone: record.attributes.phone,
      email: record.attributes.email,
      address: record.attributes.address,
      notes: record.attributes.notes,
      status: record.attributes.status,
      customer_source: record.attributes.customer_source?.data?.id || null,
      channel_person: record.attributes.channel_person?.data?.id || null,
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
      
      // 簡化API數據
      const apiData = {
        data: {
          name: values.name,
          email: values.email || null,
          phone: values.phone || null,
          status: values.status,
          customer_source: values.customer_source || null,
          notes: values.notes || null,
          address: values.address || null,
          sales_staff: values.sales_staff || null,
          channel_person: values.channel_person || null,
        }
      };

      // 移除所有undefined和null值，但保留sales_staff的null值（用於取消指派）
      Object.keys(apiData.data).forEach(key => {
        if (apiData.data[key] === undefined || (apiData.data[key] === null && key !== 'sales_staff')) {
          delete apiData.data[key];
        }
      });
      
      
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

  // 先刪除該客戶的所有聯絡紀錄
  const deleteCustomerInteractions = async (customerId) => {
    try {
      const listResp = await fetch(`${API_BASE_URL}/api/interactions?filters[customer][id][$eq]=${customerId}&pagination[pageSize]=1000`);
      const listData = await listResp.json();
      const toDelete = (listData?.data || []).map(it => it.id);
      if (!toDelete.length) return;
      await Promise.all(
        toDelete.map(id => fetch(`${API_BASE_URL}/api/interactions/${id}`, { method: 'DELETE' }))
      );
    } catch (e) {
      console.error('刪除客戶聯絡紀錄失敗:', e);
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
          // 先刪聯絡紀錄
          await deleteCustomerInteractions(record.id);
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
      
      await Promise.all(selectedRows.map(record => {
        // 準備API數據 - 最簡化
        const apiData = {
          data: {
            sales_staff: selectedStaff
          }
        };
        
        
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
      
      // 重新獲取客戶資料後再檢查是否還有待分配客戶
      await fetchCustomers();
      
      // 檢查是否還有待分配客戶
      const updatedCustomers = await fetch(`${API_BASE_URL}/api/customers?populate=*`).then(res => res.json());
      const remainingPending = updatedCustomers.data.filter(customer => 
        !customer.attributes.sales_staff?.data
      );
      
      if (remainingPending.length > 0) {
        // 還有待分配客戶，重新打開modal並更新列表
        setFilteredCustomers(remainingPending);
        setPendingCustomersVisible(true);
      } else {
        // 沒有待分配客戶了，顯示完成訊息
        message.info('所有客戶都已分配完成！');
      }
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
          
          await Promise.all(selectedRows.map(record => {
            // 準備API數據 - 最簡化
            const apiData = {
              data: {
                sales_staff: null
              }
            };
            
            
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
    // 預設來源:優先「活動」,否則第一個來源
    const defaultSource = (customerSources.find(s => s.attributes.code === 'event')
      || customerSources[0])?.id || null;
    form.setFieldsValue({
      status: 'potential',
      customer_source: defaultSource,
      hasContract: false
    });
  };

  // 新增客戶處理函數
  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      
      // 先記錄選取的關聯（負責業務）
      const selectedSalesStaffId = values.sales_staff != null ? Number(values.sales_staff) : undefined;

      // 簡化API數據
      const apiData = {
            data: {
          name: values.name,
          email: values.email || null,
          phone: values.phone || null,
          status: values.status,
          customer_source: values.customer_source || null,
          notes: values.notes || null,
          address: values.address || null,
          // 關聯：負責業務（manyToOne 可直接在 Customer 上設定為 ID）
          ...(selectedSalesStaffId ? { sales_staff: selectedSalesStaffId } : {}),
          ...(values.channel_person ? { channel_person: values.channel_person } : {}),
        }
      };
      
      // 移除所有undefined和null值
      Object.keys(apiData.data).forEach(key => {
        if (apiData.data[key] === undefined || apiData.data[key] === null) {
          delete apiData.data[key];
        }
      });
      
      
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

      // 相關建案已隨客戶新增請求一併寫入(見上方 apiData.projects),
      // 不再另打 /api/projects,避免 401 登出。

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

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys, selectedRows) => {
      setSelectedRowKeys(selectedKeys);
      setSelectedRows(selectedRows);
    }
  };

  const exportToExcel = (selectedOnly = false) => {
    // 根據選擇模式決定要導出的數據
    let dataToExport = selectedOnly 
      ? filteredCustomers.filter(customer => selectedRowKeys.includes(customer.id))
      : filteredCustomers;
    const totalCount = dataToExport.length;
    
    // 如果是選中模式但沒有選擇任何客戶，顯示提示
    if (selectedOnly && totalCount === 0) {
      message.warning('請先選擇要導出的客戶');
      return;
    }

    // 顯示導出的記錄數量
    const confirmMessage = selectedOnly
      ? `確定要導出選中的 ${totalCount} 筆記錄嗎？`
      : filteredCustomers.length !== customers.length
        ? `確定要導出篩選後的 ${totalCount} 筆記錄嗎？`
        : `確定要導出全部 ${totalCount} 筆記錄嗎？`;
    
    Modal.confirm({
      title: '導出確認',
      content: confirmMessage,
      okText: '確定導出',
      cancelText: '取消',
      onOk: () => {
        message.loading('正在生成Excel文件...', 1);
        
        const exportData = dataToExport.map(customer => ({
          '姓名': customer.attributes.name || '',
          '電話': customer.attributes.phone ? `'${customer.attributes.phone}` : '',
          '電子郵件': customer.attributes.email || '',
          '地址': customer.attributes.address || '',
          '狀態': statusMap[customer.attributes.status]?.text || '潛在客戶',
          '來源': customer.attributes.customer_source?.data?.attributes?.name || sourceMap[customer.attributes.source] || '其他',
          '備註': customer.attributes.notes || '',
          '負責業務': customer.attributes.sales_staff?.data?.attributes?.name || customer.attributes.sales_staff?.data?.attributes?.username || '未指派'
        }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    if (!ws['!cols']) ws['!cols'] = [];
    ws['!cols'][1] = { wch: 15, t: 's' };
        ws['!cols'][2] = { wch: 15, t: 's' };
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '客戶資料');
        
        const fileName = selectedOnly
          ? `客戶資料_選中記錄_${new Date().toISOString().split('T')[0]}.xlsx`
          : filteredCustomers.length !== customers.length
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

  // 下載客戶資料範本
  const handleTemplateDownload = () => {
    const template = [{
      '姓名': '(必填)',
      '電話': '(必填，請直接輸入數字，例如：0912345678)',
      '電子郵件': '(選填)',
      '地址': '',
      '狀態': 'potential/contacted/negotiating/closed/lost',
      '來源': 'website/event/referral/other',
      '負責業務': '(選填，請填寫業務人員姓名)',
      '備註': ''
    }];

    const ws = XLSX.utils.json_to_sheet(template);
    
    // 設定欄位寬度
    if (!ws['!cols']) ws['!cols'] = [];
    ws['!cols'][1] = { wch: 20, t: 's' }; // 電話
    ws['!cols'][2] = { wch: 25, t: 's' }; // 電子郵件
    ws['!cols'][3] = { wch: 30, t: 's' }; // 地址

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "範本");
    XLSX.writeFile(wb, "客戶資料範本.xlsx");
  };

  // 處理 Excel 上傳
  const handleExcelUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 設定解析選項，將所有欄位都視為字串
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          raw: false,
          defval: ''
        });


        // 轉換數據格式 - 跳過第一行標題行
        const previewData = jsonData.slice(1).map((row, index) => {
          
          // 基本資料處理
          const name = String(row['姓名'] || '').trim();
          
          // 處理電話號碼
          const phoneValue = row['電話'] || '';
          let phone = String(phoneValue).trim();
          
          // 移除所有非數字字符
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          
          // 根據數字長度處理電話號碼
          if (cleanPhone.length === 9) {
            phone = '0' + cleanPhone;
          } else if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
            phone = cleanPhone;
          } else if (cleanPhone.length === 10) {
            phone = '0' + cleanPhone.substring(1);
          } else {
            phone = '';
          }
          
          // 電子郵件：清理可能的不可見空白與占位字
          let email = String(row['電子郵件'] || '');
          email = email
            .replace(/\u200B/g, '')   // 零寬空白
            .replace(/\u00A0/g, ' ')  // NBSP 改為一般空白
            .replace(/\u3000/g, ' ')  // 全形空白
            .trim();
          const emailPlaceholders = ['(選填)', '選填', 'n/a', 'na', '-', '—', '無', '沒有', '未提供', '未填'];
          if (emailPlaceholders.includes(email.toLowerCase())) {
            email = '';
          }

          const address = String(row['地址'] || '').trim();
          
          // 驗證必填欄位
          const missingFields = [];
          if (!name) missingFields.push('姓名');
          if (!phone) missingFields.push('電話');
          // 電子郵件改為非必填
          
          if (missingFields.length > 0) {
            throw new Error(`第 ${index + 2} 行缺少必填欄位: ${missingFields.join(', ')}`);
          }

          // 驗證電子郵件格式（只有當email不為空時才驗證）
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (email && !emailRegex.test(email)) {
            throw new Error(`第 ${index + 2} 行的電子郵件格式無效: ${email}`);
          }

          // 驗證電話格式
          if (phone.length !== 10 || !phone.startsWith('0')) {
            throw new Error(`第 ${index + 2} 行的電話格式無效: ${phoneValue}`);
          }

          // 處理狀態
          const statusValue = String(row['狀態'] || 'potential').trim();
          const statusMap = {
            'potential': 'potential',
            '潛在客戶': 'potential',
            'contacted': 'contacted', 
            '已聯繫': 'contacted',
            'negotiating': 'negotiating',
            '洽談中': 'negotiating',
            'closed': 'closed',
            '已成交': 'closed',
            'lost': 'lost',
            '已流失': 'lost'
          };
          const status = statusMap[statusValue] || 'potential';

          // 處理來源
          const sourceValue = String(row['來源'] || 'event').trim();
          const sourceMapLocal = {
            'website': 'website',
            '網站': 'website',
            'event': 'event',
            '活動': 'event', 
            'referral': 'referral',
            '推薦': 'referral',
            'other': 'other',
            '其他': 'other'
          };
          const source = sourceMapLocal[sourceValue] || 'event';

          // 保留：負責業務（姓名或帳號對應 ID）
          const salesStaffName = String(row['負責業務'] || '').trim();
          let sales_staff = null;
          if (salesStaffName) {
            const foundStaff = salesStaff.find(staff => 
              (staff.attributes.name && staff.attributes.name.toLowerCase() === salesStaffName.toLowerCase()) || 
              (staff.attributes.username && staff.attributes.username.toLowerCase() === salesStaffName.toLowerCase())
            );
            if (foundStaff) {
              sales_staff = foundStaff.id;
            } else {
            }
          }

          const notes = String(row['備註'] || '').trim();

          // 僅保留對應編輯頁面可見的欄位
          const result = {
            name,
            phone,
            email: (email && email.length > 0) ? email : null,
            address,
            status,
            source,
            sales_staff,
            notes
          };

          return result;
        });

        setPreviewData(previewData);
        setExcelImportModalVisible(true);
      } catch (error) {
        console.error('解析 Excel 文件錯誤:', error);
        message.error(error.message || '無法解析 Excel 文件，請確保文件格式正確');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  // 批量匯入客戶資料
  const handleBatchImport = async () => {
    setLoading(true);
    try {
      
      const results = await Promise.all(previewData.map(async data => {
        
        const response = await fetch(`${API_BASE_URL}/api/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: {
              ...data,
              publishedAt: new Date().toISOString() // 確保立即發布
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('匯入失敗:', errorData);
          throw new Error(`匯入客戶 ${data.name} 失敗: ${response.status} ${errorData?.error?.message || '未知錯誤'}`);
        }

        return await response.json();
      }));

      message.success(`成功匯入 ${results.length} 筆客戶資料`);
      setExcelImportModalVisible(false);
      setPreviewData([]);
      await fetchCustomers();
    } catch (error) {
      console.error('批量匯入失敗:', error);
      message.error(error.message || '批量匯入失敗，請檢查資料格式是否正確');
    } finally {
      setLoading(false);
    }
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
      let filterSteps = [];
      
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        const beforeSearch = filtered.length;
        filtered = filtered.filter(customer => 
          (customer.attributes.name && customer.attributes.name.toLowerCase().includes(keyword)) ||
          (customer.attributes.phone && customer.attributes.phone.toString().includes(keyword)) ||
          (customer.attributes.email && customer.attributes.email.toLowerCase().includes(keyword)) ||
          (customer.attributes.address && customer.attributes.address.toLowerCase().includes(keyword))
        );
        filterSteps.push(`搜索關鍵字"${keyword}": ${beforeSearch} → ${filtered.length}`);
      }
      
      if (formValues) {
        if (formValues.status && formValues.status.length > 0) {
          const beforeStatus = filtered.length;
          filtered = filtered.filter(customer => 
            customer.attributes.status && formValues.status.includes(customer.attributes.status)
          );
          filterSteps.push(`狀態篩選: ${beforeStatus} → ${filtered.length}`);
        }
        
        if (formValues.source && formValues.source.length > 0) {
          const beforeSource = filtered.length;
          filtered = filtered.filter(customer =>
            formValues.source.includes(customer.attributes.customer_source?.data?.id)
          );
          filterSteps.push(`來源篩選: ${beforeSource} → ${filtered.length}`);
        }
        
        if (formValues.sales_staff) {
          const beforeStaff = filtered.length;
          filtered = filtered.filter(customer => 
            customer.attributes.sales_staff?.data?.id === formValues.sales_staff
          );
          filterSteps.push(`業務篩選: ${beforeStaff} → ${filtered.length}`);
        }
        
        if (formValues.hasContract !== undefined && formValues.hasContract !== '') {
          const beforeContract = filtered.length;
          const hasContract = formValues.hasContract === true || formValues.hasContract === 'true';
          filtered = filtered.filter(customer => 
            customer.attributes.hasContract === hasContract
          );
          filterSteps.push(`合約篩選: ${beforeContract} → ${filtered.length}`);
        }
        
        if (formValues.channel_person) {
          const beforeChannel = filtered.length;
          filtered = filtered.filter(customer =>
            customer.attributes.channel_person?.data?.id === formValues.channel_person
          );
          filterSteps.push(`渠道篩選: ${beforeChannel} → ${filtered.length}`);
        }

        if (formValues.dateRange && formValues.dateRange[0] && formValues.dateRange[1]) {
          const beforeDate = filtered.length;
          const toDate = (v) => {
            if (!v) return null;
            if (typeof v.toDate === 'function') return v.toDate();
            return new Date(v);
          };
          const startDate = toDate(formValues.dateRange[0]);
          startDate.setHours(0, 0, 0, 0);
          const endDate = toDate(formValues.dateRange[1]);
          endDate.setHours(23, 59, 59, 999);
          
          filtered = filtered.filter(customer => {
            if (!customer.attributes.createdAt) return false;
            const createdAt = new Date(customer.attributes.createdAt);
            return createdAt >= startDate && createdAt <= endDate;
          });
          filterSteps.push(`日期篩選: ${beforeDate} → ${filtered.length}`);
        }
      }
      
      
      if (filtered.length !== customers.length) {
        message.info(`篩選結果：${filtered.length} / ${customers.length} 位客戶`);
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
                source: 'event',
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
    contactForm.setFieldsValue({
      contact_date: dayjs(),
      contact_status: 'initial_contact',
      contact_outcome: 'neutral'
    });
    setContactRecordModalVisible(true);
  };

  // 處理添加特定客戶的聯絡記錄
  const handleAddCustomerContactRecord = (customer) => {
    setCurrentCustomer(customer);
    contactForm.resetFields();
    contactForm.setFieldsValue({
      customer_id: customer.id,
      customer_name: customer.id,
      contact_date: dayjs(),
      contact_status: 'initial_contact',
      contact_outcome: 'neutral',
      is_deal: false,
    });
    setContactRecordModalVisible(true);
  };

  // 保存聯絡記錄
  const handleSaveContactRecord = async () => {
    try {
      setContactLoading(true);
      const values = await contactForm.validateFields();
      
      // 構建聯絡記錄資料（關聯一律使用數字 ID）
      const customerId = values.customer_name || values.customer_id;
      const normalizeDate = (val) => {
        if (!val) return null;
        try {
          if (typeof val.format === 'function') return val.format('YYYY-MM-DD');
          const d = new Date(val);
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        } catch {}
        return null;
      };
 
      const contactData = {
        customer: customerId ? Number(customerId) : undefined,
        sales_staff: values.sales_staff ? Number(values.sales_staff) : undefined,
        type: values.contact_type,
        status: values.contact_status,
        outcome: values.contact_outcome,
        date: normalizeDate(values.contact_date) || new Date().toISOString().split('T')[0],
        next_follow_up: normalizeDate(values.next_follow_up_date),
        notes: values.content,
        project: values.project ? Number(values.project) : null,
      };

      // 保存聯絡記錄
      const response = await fetch(`${API_BASE_URL}/api/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: contactData }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const serverMsg = errorData?.error?.message || '';
        const detailErrors = errorData?.error?.details?.errors || [];

        // 對應欄位錯誤
        const fieldMap = {
          customer: 'customer_name',
          sales_staff: 'sales_staff',
          type: 'contact_type',
          status: 'contact_status',
          outcome: 'contact_outcome',
          date: 'contact_date',
          next_follow_up: 'next_follow_up_date',
          project: 'project',
          deal_amount: 'deal_amount',
          payment_date: 'payment_date'
        };

        // 1) Strapi details 逐欄位顯示
        if (Array.isArray(detailErrors) && detailErrors.length > 0) {
          const fieldErrors = [];
          detailErrors.forEach(err => {
            const path = Array.isArray(err?.path) ? err.path[0] : err?.path;
            const name = fieldMap[path];
            if (name) {
              fieldErrors.push({ name, errors: [err?.message || '此欄位填寫有誤'] });
            }
          });
          if (fieldErrors.length > 0) {
            contactForm.setFields(fieldErrors);
          }
        } else if (serverMsg.toLowerCase().includes('invalid relations')) {
          // 2) 常見關聯錯誤：顯示對應欄位
          const relErrors = [];
          if (!contactData.customer) relErrors.push({ name: 'customer_name', errors: ['請選擇客戶'] });
          if (!contactData.sales_staff) relErrors.push({ name: 'sales_staff', errors: ['請選擇負責業務'] });
          if (relErrors.length > 0) contactForm.setFields(relErrors);
        }

        throw new Error(serverMsg || '保存聯絡記錄失敗');
      }

      message.success('聯絡記錄已保存');
      setContactRecordModalVisible(false);
      
      // 如果是在查看聯絡記錄時添加的，刷新列表
      if (contactRecordsVisible && currentCustomer) {
        fetchCustomerContactRecords(currentCustomer.id);
      }
    } catch (error) {
      // 若是前端驗證的錯誤，AntD 已在欄位上顯示，這裡僅提示
      console.error('Error saving contact record:', error);
      if (error?.errorFields) {
        message.error('請檢查表單紅框欄位');
      } else {
      message.error(error.message || '保存聯絡記錄失敗');
      }
    } finally {
      setContactLoading(false);
    }
  };

  // 獲取客戶的聯絡記錄
  const fetchCustomerContactRecords = async (customerId) => {
    try {
      setContactLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/interactions?populate=*&filters[customer][id][$eq]=${customerId}&sort=date:desc`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || '獲取聯絡記錄失敗');
      }
      
      const data = await response.json();
      setContactRecords(data.data || []);
      setContactRecordsVisible(true);
    } catch (error) {
      console.error('Error fetching contact records:', error);
      message.error(error.message || '獲取聯絡記錄失敗');
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

  // 查找重複客戶
  const handleFindDuplicates = () => {
    setDuplicateLoading(true);
    
    try {
      const duplicates = findDuplicateCustomers(customers);
      setDuplicateCustomers(duplicates);
      setDuplicateCustomersVisible(true);
      
      if (duplicates.length === 0) {
        message.success('沒有發現重複的客戶資料');
      } else {
        message.info(`發現 ${duplicates.length} 組重複客戶資料`);
      }
    } catch (error) {
      console.error('查找重複客戶失敗:', error);
      message.error('查找重複客戶失敗');
    } finally {
      setDuplicateLoading(false);
    }
  };

  // 查找重複客戶的邏輯
  const findDuplicateCustomers = (customerList) => {
    const duplicates = [];
    const processed = new Set();

    // 只以「電話」與「電子郵件」判定重複——兩者皆能唯一識別一個人。
    // 刻意不比對姓名:1500+ 筆客戶同名（陳先生、王小姐…）極多，純姓名比對
    // 會產生大量假重複、淹沒真正的重複，讓功能失去意義。

    // 按電話分組
    const phoneGroups = {};
    customerList.forEach(customer => {
      const phone = customer.attributes.phone?.toString().replace(/\D/g, '');
      if (phone && phone.length >= 8) {
        if (!phoneGroups[phone]) {
          phoneGroups[phone] = [];
        }
        phoneGroups[phone].push(customer);
      }
    });
    
    // 按電子郵件分組
    const emailGroups = {};
    customerList.forEach(customer => {
      const email = customer.attributes.email?.trim().toLowerCase();
      if (email) {
        if (!emailGroups[email]) {
          emailGroups[email] = [];
        }
        emailGroups[email].push(customer);
      }
    });
    
    // 註:不再以「純姓名」判定重複。1500+ 筆客戶裡同名（陳先生、王小姐…）
    // 極多，純姓名比對會產生大量假重複、淹沒真正的重複。改以電話為主鍵、
    // Email 為輔（皆能唯一識別一個人）；姓名僅在下方作為輔助條件。

    // 找出重複的電話組
    Object.entries(phoneGroups).forEach(([phone, group]) => {
      if (group.length > 1) {
        const key = `phone_${phone}`;
        if (!processed.has(key)) {
          duplicates.push({
            type: '電話重複',
            field: 'phone',
            value: phone,
            customers: group,
            count: group.length
          });
          processed.add(key);
        }
      }
    });
    
    // 找出重複的電子郵件組
    Object.entries(emailGroups).forEach(([email, group]) => {
      if (group.length > 1) {
        const key = `email_${email}`;
        if (!processed.has(key)) {
          duplicates.push({
            type: '電子郵件重複',
            field: 'email',
            value: email,
            customers: group,
            count: group.length
          });
          processed.add(key);
        }
      }
    });
    
    return duplicates;
  };

  // 預覽與合併資料計算（保留主記錄電話/Email，其他值追加到備註）
  const getMergedPreview = (duplicateGroup, selectedStaffId, primaryId) => {
    const all = duplicateGroup.customers;
    const chosen = all.find(c => c.id === primaryId) || all[0];
    // 把選定的主記錄排到第一位,其餘維持原順序;以下邏輯即以「第一筆為主」運作
    const customersToMerge = [chosen, ...all.filter(c => c.id !== chosen.id)];
    const primaryCustomer = customersToMerge[0];
    const merged = { ...primaryCustomer.attributes };

    const notesPartsSet = new Set();
    const otherPhones = [];
    const otherEmails = [];

    customersToMerge.forEach((c, idx) => {
      const attrs = c.attributes;
      if (attrs.notes && attrs.notes.trim() !== '') notesPartsSet.add(attrs.notes.trim());
      if (idx > 0) {
        if (attrs.phone && attrs.phone !== merged.phone && !otherPhones.includes(attrs.phone)) {
          otherPhones.push(attrs.phone);
        }
        if (attrs.email && attrs.email !== merged.email && !otherEmails.includes(attrs.email)) {
          otherEmails.push(attrs.email);
        }
      }
      if (attrs.address && !merged.address) merged.address = attrs.address;
      if (attrs.source_detail && !merged.source_detail) merged.source_detail = attrs.source_detail;
      if (attrs.status && attrs.status !== 'potential') merged.status = attrs.status;
    });

    const notesParts = Array.from(notesPartsSet);
    if (otherPhones.length > 0) notesParts.push(`其他電話: ${otherPhones.join('、')}`);
    if (otherEmails.length > 0) notesParts.push(`其他Email: ${otherEmails.join('、')}`);

    merged.notes = notesParts.length > 0
      ? (merged.notes ? `${merged.notes}\n\n${notesParts.join('\n\n')}` : notesParts.join('\n\n'))
      : (merged.notes || '');

    // 保留主記錄電話/Email，不覆蓋 merged.phone / merged.email
    merged.sales_staff = selectedStaffId || primaryCustomer.attributes.sales_staff?.data?.id || null;

    return merged;
  };

  // 合併重複客戶
  const handleMergeDuplicates = async (duplicateGroup, groupIndex) => {
    try {
      const all = duplicateGroup.customers;
      const primaryId = duplicatePrimary[groupIndex] ?? all[0]?.id;
      const primaryCustomer = all.find(c => c.id === primaryId) || all[0];
      const customersToDelete = all.filter(c => c.id !== primaryCustomer.id);

      const selectedStaffId = duplicateAssignStaff[groupIndex] ?? primaryCustomer.attributes.sales_staff?.data?.id ?? null;
      const mergedData = getMergedPreview(duplicateGroup, selectedStaffId, primaryId);

      // 1. 更新主客戶為合併後的資料
      await fetch(`${API_BASE_URL}/api/customers/${primaryCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: {
          ...mergedData,
          sales_staff: mergedData.sales_staff || null
        } }),
      });

      // 2. 把重複客戶的聯絡紀錄、活動報名改掛到主客戶名下。
      //    必須在刪除前做:後端刪客戶會連帶刪除其聯絡紀錄(cascade),
      //    先轉移才能保住跟進歷史,讓它們真正併入主客戶。
      let movedInteractions = 0;
      for (const dup of customersToDelete) {
        const [intRes, regRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/interactions?filters[customer][id][$eq]=${dup.id}&pagination[pageSize]=1000`),
          fetch(`${API_BASE_URL}/api/registrations?filters[customer][id][$eq]=${dup.id}&pagination[pageSize]=1000`),
        ]);
        const [intData, regData] = await Promise.all([intRes.json(), regRes.json()]);
        const interactions = intData.data || [];
        const registrations = regData.data || [];
        movedInteractions += interactions.length;
        await Promise.all([
          ...interactions.map(it =>
            fetch(`${API_BASE_URL}/api/interactions/${it.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: { customer: primaryCustomer.id } }),
            })
          ),
          ...registrations.map(r =>
            fetch(`${API_BASE_URL}/api/registrations/${r.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: { customer: primaryCustomer.id } }),
            })
          ),
        ]);
      }

      // 3. 轉移完成後才刪除重複客戶(此時其名下已無聯絡紀錄,cascade 不會誤刪)
      await Promise.all(
        customersToDelete.map(customer =>
          fetch(`${API_BASE_URL}/api/customers/${customer.id}`, {
            method: 'DELETE',
          })
        )
      );

      message.success(
        `成功合併 ${customersToDelete.length} 個重複客戶` +
        (movedInteractions ? `，並轉移 ${movedInteractions} 筆聯絡紀錄` : '')
      );

      // 重新載入客戶清單以同步最新資料
      await fetchCustomers();

      // 即時從重複列表移除該群組，無需重開/重查
      setDuplicateCustomers(prev => prev.filter((_, i) => i !== groupIndex));

    } catch (error) {
      console.error('合併重複客戶失敗:', error);
      message.error('合併重複客戶失敗');
    }
  };

  // 刪除重複客戶
  const handleDeleteDuplicates = async (duplicateGroup, groupIndex) => {
    try {
      const all = duplicateGroup.customers;
      const primaryId = duplicatePrimary[groupIndex] ?? all[0]?.id;
      const customersToDelete = all.filter(c => c.id !== primaryId);

      await Promise.all(
        customersToDelete.map(customer =>
          fetch(`${API_BASE_URL}/api/customers/${customer.id}`, {
            method: 'DELETE',
          })
        )
      );

      message.success(`成功刪除 ${customersToDelete.length} 個重複客戶`);

      // 同步最新客戶資料
      await fetchCustomers();

      // 即時從重複列表移除該群組
      setDuplicateCustomers(prev => prev.filter((_, i) => i !== groupIndex));

    } catch (error) {
      console.error('刪除重複客戶失敗:', error);
      message.error('刪除重複客戶失敗');
    }
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('請先選擇要刪除的客戶');
      return;
    }

    Modal.confirm({
      title: '批量刪除確認',
      content: `確定要刪除選中的 ${selectedRowKeys.length} 位客戶嗎？此操作不可恢復。`,
      okText: '確定刪除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const msgKey = 'batchDeleteCustomers';
        try {
          message.open({ type: 'loading', content: '正在刪除...', key: msgKey, duration: 0 });
          
          // 先刪各客戶的互動紀錄
          await Promise.all(
            selectedRowKeys.map(async (customerId) => {
              await deleteCustomerInteractions(customerId);
              const resp = await fetch(`${API_BASE_URL}/api/customers/${customerId}`, {
                method: 'DELETE',
              });
              if (!resp.ok) {
                throw new Error(`刪除失敗: ${resp.status}`);
              }
            })
          );

          message.open({ type: 'success', content: `成功刪除 ${selectedRowKeys.length} 位客戶`, key: msgKey, duration: 2 });
          setSelectedRowKeys([]);
          setSelectedRows([]);
          await fetchCustomers(); // 重新加載客戶列表
        } catch (error) {
          console.error('Error deleting customers:', error);
          message.open({ type: 'error', content: '刪除失敗，請重試', key: msgKey, duration: 2 });
        }
      },
    });
  };

  useEffect(() => {
    // ... existing code ...
    const loadProjects = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/projects?pagination[pageSize]=1000`);
        const data = await resp.json();
        setProjects(data?.data || []);
      } catch (e) {
        console.error('fetch projects failed', e);
      }
    };
    loadProjects();
  }, []);
  // ... existing code ...

  return (
    <div className={styles.customerManagement}>
      <Card
        className={styles.customerTable}
        title={
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>客戶管理</div>
            <div className={styles.headerActions}>
              <div className={styles.actionButtons}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    resetForm();
                    setAddModalVisible(true);
                  }}
                >
                  新增客戶
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={refreshCustomers}
                  title="重新載入客戶資料"
                >
                  刷新
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleTemplateDownload}
                >
                  下載範本
                </Button>
                <Upload
                  accept=".xlsx,.xls"
                  showUploadList={false}
                  beforeUpload={handleExcelUpload}
                >
                  <Button icon={<UploadOutlined />}>
                    匯入 Excel
                  </Button>
                </Upload>
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
                <Button
                  icon={<FilterOutlined />}
                  onClick={handleFindDuplicates}
                  loading={duplicateLoading}
                >
                  查找重複
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
              icon={<ExportOutlined />}
              onClick={() => exportToExcel(false)}
            >
              導出全部
            </Button>
            {selectedRows.length > 0 && (
              <>
            <Button
              type="primary"
              icon={<UserSwitchOutlined />}
              onClick={() => setBatchAssignModalVisible(true)}
            >
                  批量指派 ({selectedRows.length})
            </Button>
                <Button
                  onClick={openPartBatch}
                >
                  批次補登參加活動 ({selectedRows.length})
                </Button>
                <Button
                  danger
                  icon={<RollbackOutlined />}
                  onClick={handleBatchUnassign}
                >
                  批量沒收 ({selectedRows.length})
            </Button>
            <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleBatchDelete}
                >
                  批量刪除 ({selectedRows.length})
                </Button>
                <Button
                  onClick={() => exportToExcel(true)}
              icon={<ExportOutlined />}
                  type="primary"
            >
                  導出選中 ({selectedRows.length})
            </Button>
              </>
            )}
              </div>
            </div>
          </div>
        }
        bordered={false}
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
                    <Select mode="multiple" placeholder="選擇客戶來源" optionFilterProp="children">
                      {customerSources.map(s => (
                        <Option key={s.id} value={s.id}>{s.attributes.name}</Option>
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
                          {staff.attributes.name || staff.attributes.username}
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
                  <Form.Item name="channel_person" label="帶客渠道">
                    <Select
                      placeholder="選擇渠道人員"
                      allowClear
                      showSearch
                      filterOption={(input, option) =>
                        (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      optionFilterProp="children"
                    >
                      {channelPeople.map(cp => (
                        <Option key={cp.id} value={cp.id}>
                          {cp.attributes.name}
                          {cp.attributes.channel_company?.data?.attributes?.name
                            ? `（${cp.attributes.channel_company.data.attributes.name}）`
                            : ''}
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
              
              {/* 統計資訊 */}
              {customers.length > 0 && (
                <div style={{ 
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid #f0f0f0',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '20px',
                  alignItems: 'center',
                  fontSize: '14px',
                  color: '#666'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#1890ff', fontWeight: 'bold' }}>📊</span>
                    <span><strong>總客戶數：</strong>{customers.length}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#52c41a', fontWeight: 'bold' }}>🔍</span>
                    <span><strong>顯示中：</strong>{filteredCustomers.length}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>📍</span>
                    <span><strong>來源分佈：</strong>
                      {(() => {
                        const sources = {};
                        customers.forEach(customer => {
                          const source = customer.attributes.source || 'unknown';
                          sources[source] = (sources[source] || 0) + 1;
                        });
                        return Object.entries(sources).map(([key, value]) => 
                          `${key === 'event' ? '活動' : key === 'website' ? '網站' : key}(${value})`
                        ).join('、');
                      })()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#722ed1', fontWeight: 'bold' }}>📈</span>
                    <span><strong>狀態分佈：</strong>
                      {(() => {
                        const statuses = {};
                        customers.forEach(customer => {
                          const status = customer.attributes.status || 'unknown';
                          statuses[status] = (statuses[status] || 0) + 1;
                        });
                        return Object.entries(statuses).map(([key, value]) => 
                          `${key === 'potential' ? '潛在' : key === 'contacted' ? '已聯繫' : key}(${value})`
                        ).join('、');
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </Form>
          </div>
        )}

        <Table
          columns={displayColumns}
          dataSource={filteredCustomers}
          rowKey={record => record.id}
          loading={loading}
          rowSelection={rowSelection}
          bordered={false}
          className={styles.customerTable}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 筆，共 ${total} 筆客戶資料`,
            onChange: (page, pageSize) => {
            },
            onShowSizeChange: (current, size) => {
            }
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
            name="customer_source"
            label="來源"
            rules={[{ required: true, message: '請選擇來源' }]}
          >
            <Select placeholder="選擇來源" showSearch optionFilterProp="children">
              {customerSources.map(s => (
                <Select.Option key={s.id} value={s.id}>{s.attributes.name}</Select.Option>
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
                  {staff.attributes.name || staff.attributes.username}
                    </Select.Option>
              ))}
            </Select>
          </Form.Item>
            </Tabs.TabPane>
            
            {/* 已移除：合約信息分頁
            <Tabs.TabPane tab="合約信息" key="contract">
              <Form.Item name="hasContract" label="是否已簽約" valuePropName="checked">
                <Switch checkedChildren="已簽約" unCheckedChildren="未簽約" />
              </Form.Item>
              <Form.Item name="contractInfo" label="合約信息">
                <Input />
              </Form.Item>
              <Form.Item name="contractDate" label="合約日期">
                <Input type="date" />
              </Form.Item>
            </Tabs.TabPane>
            */}
            
            <Tabs.TabPane tab="帶客渠道" key="channel">
              <Form.Item
                name="channel_person"
                label="帶客渠道人員"
                extra="這位客戶是哪個渠道（仲介/介紹人）帶來的；個人自來可留空"
              >
                <Select
                  allowClear
                  showSearch
                  placeholder="選擇渠道人員（可留空）"
                  filterOption={(input, option) =>
                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  optionFilterProp="children"
                >
                  {channelPeople.map(cp => (
                    <Select.Option key={cp.id} value={cp.id}>
                      {cp.attributes.name}
                      {cp.attributes.channel_company?.data?.attributes?.name
                        ? `（${cp.attributes.channel_company.data.attributes.name}）`
                        : ''}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Tabs.TabPane>

            <Tabs.TabPane tab="參加活動" key="events">
              <div style={{ color: '#8c8c8c', lineHeight: 1.7 }}>
                參加活動由「活動報名」自動帶入——只要在「活動報名管理」為此客戶新增報名,
                客戶列表的「參加活動」欄就會顯示所報名的活動、場次、時間與建案,不需在此手動選擇。
              </div>
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
          setPendingCustomersVisible(true);
        }}
        okText="確認"
        cancelText="取消"
        zIndex={2000}
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
              {staff.attributes.name || staff.attributes.username}
            </Option>
          ))}
        </Select>
      </Modal>

      {/* 參加活動補登(單一 / 批次) */}
      <Modal
        title={partCustomer
          ? `${partCustomer.attributes?.name || '客戶'} 的參加活動`
          : `批次補登參加活動（${partBatchRows.length} 位客戶）`}
        open={partModalOpen}
        onCancel={() => setPartModalOpen(false)}
        footer={[<Button key="close" onClick={() => setPartModalOpen(false)}>關閉</Button>]}
        zIndex={2000}
        width={560}
        destroyOnClose
      >
        {partCustomer && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#8c8c8c', marginBottom: 6 }}>目前參加的活動</div>
            {(participations[partCustomer.id] || []).length === 0
              ? <div style={{ color: '#c0c0c0' }}>尚無</div>
              : (participations[partCustomer.id] || []).map(p => (
                  <div key={p.regId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', border: '1px solid #f0f0f0', borderRadius: 6, marginBottom: 6 }}>
                    <span>{p.title}{p.sessionText ? `｜${p.sessionText}` : ''}{p.timeText ? `｜${p.timeText}` : ''}</span>
                    <Popconfirm title="移除這筆參加活動？" onConfirm={() => removePart(p.regId)} okText="移除" cancelText="取消">
                      <Button type="text" danger size="small">移除</Button>
                    </Popconfirm>
                  </div>
                ))}
          </div>
        )}
        <div style={{ borderTop: '1px dashed #eee', paddingTop: 12 }}>
          <div style={{ color: '#8c8c8c', marginBottom: 8 }}>{partCustomer ? '新增一筆參加活動' : '為勾選的客戶補登同一場活動'}</div>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Select
              style={{ width: '100%' }} placeholder="選擇活動（最新在最上面）"
              showSearch optionFilterProp="children"
              value={partEventId} onChange={(v) => { setPartEventId(v); setPartSessionIdx(null); }}
            >
              {eventsNewest.map(e => (
                <Option key={e.id} value={e.id}>{e.attributes?.title || `活動 ${e.id}`}</Option>
              ))}
            </Select>
            <Select
              style={{ width: '100%' }} placeholder="選擇場次"
              disabled={!partEventId} value={partSessionIdx}
              onChange={(v) => setPartSessionIdx(v)}
            >
              {sessionsOfEvent(partEventId).map((s, idx) => (
                <Option key={idx} value={idx}>
                  {s.location || `場次 ${idx + 1}`}{s.startDateTime ? `（${new Date(s.startDateTime).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}）` : ''}
                </Option>
              ))}
            </Select>
            <Button type="primary" loading={partSaving} onClick={addPart} block>
              {partCustomer ? '新增' : `套用到 ${partBatchRows.length} 位客戶`}
            </Button>
          </Space>
        </div>
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
                name="customer_source"
                label="來源"
                rules={[{ required: true, message: '請選擇來源' }]}
              >
                <Select placeholder="選擇來源" showSearch optionFilterProp="children">
                  {customerSources.map(s => (
                    <Select.Option key={s.id} value={s.id}>{s.attributes.name}</Select.Option>
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
                      {staff.attributes.name || staff.attributes.username}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Tabs.TabPane>
            
            {/* 已移除：合約信息分頁
            <Tabs.TabPane tab="合約信息" key="contract">
              <Form.Item name="hasContract" label="是否已簽約" valuePropName="checked" initialValue={false}>
                <Switch checkedChildren="已簽約" unCheckedChildren="未簽約" />
              </Form.Item>
              <Form.Item name="contractInfo" label="合約信息">
                <Input placeholder="請輸入合約資訊" />
              </Form.Item>
              <Form.Item name="contractDate" label="合約日期">
                <Input type="date" />
              </Form.Item>
            </Tabs.TabPane>
            */}
            
            <Tabs.TabPane tab="帶客渠道" key="channel">
              <Form.Item
                name="channel_person"
                label="帶客渠道人員"
                extra="這位客戶是哪個渠道（仲介/介紹人）帶來的；個人自來可留空"
              >
                <Select
                  allowClear
                  showSearch
                  placeholder="選擇渠道人員（可留空）"
                  filterOption={(input, option) =>
                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  optionFilterProp="children"
                >
                  {channelPeople.map(cp => (
                    <Select.Option key={cp.id} value={cp.id}>
                      {cp.attributes.name}
                      {cp.attributes.channel_company?.data?.attributes?.name
                        ? `（${cp.attributes.channel_company.data.attributes.name}）`
                        : ''}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Tabs.TabPane>

            <Tabs.TabPane tab="參加活動" key="events">
              <div style={{ color: '#8c8c8c', lineHeight: 1.7 }}>
                參加活動由「活動報名」自動帶入——只要在「活動報名管理」為此客戶新增報名,
                客戶列表的「參加活動」欄就會顯示所報名的活動、場次、時間與建案,不需在此手動選擇。
              </div>
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
        width={760}
        zIndex={2000}
      >
        <Form form={contactForm} layout="vertical">
          <Form.Item name="customer_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="customer_name" label="客戶" rules={[{ required: true, message: '請選擇客戶' }]}>
            <Select showSearch placeholder="請選擇客戶" disabled={!!currentCustomer} filterOption={(input, option)=> option.children.toLowerCase().includes(input.toLowerCase())}>
              {customers.map(c => (<Option key={c.id} value={c.id}>{c.attributes.name}</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="content" label="聯絡內容" rules={[{ required: true, message: '請輸入聯絡內容' }]}>
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item name="contact_type" label="聯絡類型" rules={[{ required: true, message: '請選擇聯絡類型' }]}>
            <Select>
              {Object.entries(contactTypeMap).map(([value, text]) => (<Option key={value} value={value}>{text}</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="contact_status" label="聯絡狀態" rules={[{ required: true, message: '請選擇聯絡狀態' }]}>
            <Select>
              {Object.entries(contactStatusMap).map(([value, text]) => (<Option key={value} value={value}>{text}</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="contact_outcome" label="聯絡結果" rules={[{ required: true, message: '請選擇聯絡結果' }]}>
            <Select>
              {Object.entries(contactOutcomeMap).map(([value, text]) => (<Option key={value} value={value}>{text}</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="project" label="相關建案">
            <Select placeholder="選擇建案" allowClear showSearch filterOption={(i,o)=> (o?.children ?? '').toLowerCase().includes(i.toLowerCase())}>
              {projects.map(p => (<Option key={p.id} value={p.id}>{p.attributes?.name || `建案 ${p.id}`}</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="contact_date" label="聯絡日期" rules={[{ required: true, message: '請選擇聯絡日期' }]} initialValue={dayjs()}>
            <div className={styles.dateInputWrapper}>
              <div className={`${styles.dateAffix} ant-input-affix-wrapper`}>
                <input type="date" className={`ant-input ${styles.dateInput}`} placeholder="yyyy/MM/dd" onChange={(e)=> contactForm.setFieldsValue({ contact_date: e.target.value })} />
              </div>
            </div>
          </Form.Item>
          <Form.Item name="next_follow_up_date" label="下次跟進日期">
            <div className={styles.dateInputWrapper}>
              <div className={`${styles.dateAffix} ant-input-affix-wrapper`}>
                <input type="date" className={`ant-input ${styles.dateInput}`} placeholder="yyyy/MM/dd" onChange={(e)=> contactForm.setFieldsValue({ next_follow_up_date: e.target.value })} />
              </div>
            </div>
          </Form.Item>
          <Form.Item name="sales_staff" label="負責業務" rules={[{ required: true, message: '請選擇負責業務' }]}>
            <Select>
              {salesStaff.map(staff => (<Option key={staff.id} value={staff.id}>{staff.attributes.name || staff.attributes.username}</Option>))}
            </Select>
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* 成交已移至「成交管理」,聯絡紀錄不再記錄成交 */}
          </div>
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
            onClick={() => {
              setPendingCustomersVisible(false);
              setBatchAssignModalVisible(true);
            }}
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
                    color={getContactStatusColor(data.status)}
                  >
                    <div className={styles.contactRecord}>
                      <div className={styles.contactRecordHeader}>
                        <span className={styles.contactDate}>
                          {new Date(data.date).toLocaleDateString()}
                        </span>
                        <Tag color={getContactTypeColor(data.type)}>
                          {contactTypeMap[data.type] || data.type}
                        </Tag>
                        <Tag color={getContactOutcomeColor(data.outcome)}>
                          {contactOutcomeMap[data.outcome] || data.outcome}
                        </Tag>
                        <Tag color={getContactStatusColor(data.status)}>
                          {contactStatusMap[data.status] || data.status}
                        </Tag>
                      </div>
                      <div className={styles.contactContent}>
                        {data.notes}
                      </div>
                      <div className={styles.contactRecordFooter}>
                        <span>業務：{data.sales_staff?.data?.attributes?.username || '未指派'}</span>
                        {data.next_follow_up && (
                          <span>
                            下次跟進：{new Date(data.next_follow_up).toLocaleDateString()}
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

      {/* 重複客戶管理 Modal */}
      <Modal
        title="重複客戶管理"
        open={duplicateCustomersVisible}
        onOk={() => setDuplicateCustomersVisible(false)}
        onCancel={() => setDuplicateCustomersVisible(false)}
        okText="關閉"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={1000}
        footer={[
          <Button 
            key="close" 
            onClick={() => setDuplicateCustomersVisible(false)}
          >
            關閉
          </Button>
        ]}
      >
        {duplicateLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin tip="查找重複客戶中..." />
          </div>
        ) : duplicateCustomers.length === 0 ? (
          <Empty description="沒有發現重複的客戶資料" />
        ) : (
          <div>
            <Alert 
              message={`發現 ${duplicateCustomers.length} 組重複客戶資料`} 
              type="warning" 
              showIcon 
              style={{ marginBottom: 16 }}
              description="系統會根據姓名、電話或電子郵件來識別重複客戶。您可以選擇合併或刪除重複的客戶資料。"
            />
            
            {duplicateCustomers.map((group, index) => (
              <Card 
                key={index} 
                size="small" 
                style={{ marginBottom: 16 }}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      <Tag color="orange">{group.type}</Tag>
                      <span style={{ marginLeft: 8 }}>
                        {group.field === 'name' ? '姓名' : group.field === 'phone' ? '電話' : '電子郵件'}: {group.value}
                      </span>
                    </span>
                    <div>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => setMergeConfirm({ group, groupIndex: index })}
                        style={{ marginRight: 8 }}
                      >
                        合併 ({group.count - 1} 個)
                      </Button>
                      <Popconfirm
                        title="確定要刪除重複客戶嗎？"
                        description="此操作會保留第一個客戶，刪除其餘重複客戶。此操作無法撤銷！"
                        onConfirm={() => handleDeleteDuplicates(group, index)}
                        okText="確定"
                        cancelText="取消"
                      >
                        <Button 
                          danger 
                          size="small"
                        >
                          刪除重複
                        </Button>
                      </Popconfirm>
                    </div>
                  </div>
                }
              >
                <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ color: '#888' }}>負責業務：</span>
                  <Select
                    showSearch
                    allowClear
                    placeholder="選擇業務"
                    style={{ width: 220 }}
                    value={duplicateAssignStaff[index] ?? group.customers[0]?.attributes?.sales_staff?.data?.id ?? undefined}
                    onChange={(val) => setDuplicateAssignStaff(prev => ({ ...prev, [index]: val }))}
                    optionFilterProp="children"
                  >
                    {salesStaff.map(staff => (
                      <Option key={staff.id} value={staff.id}>
                        {staff.attributes.name || staff.attributes.username}
                      </Option>
                    ))}
                  </Select>
                </div>
                <Table
                  dataSource={group.customers}
                  columns={[
                    {
                      title: '主記錄',
                      key: 'primary',
                      width: 70,
                      align: 'center',
                      render: (_, customer) => {
                        const currentPrimary = duplicatePrimary[index] ?? group.customers[0]?.id;
                        return (
                          <Radio
                            checked={currentPrimary === customer.id}
                            onChange={() => setDuplicatePrimary(prev => ({ ...prev, [index]: customer.id }))}
                          />
                        );
                      },
                    },
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
                      title: '聯絡紀錄',
                      key: 'interactions',
                      width: 90,
                      align: 'center',
                      render: (_, customer) => {
                        const n = customer.attributes?.interactions?.data?.length || 0;
                        return n > 0
                          ? <Tag color="blue">{n} 筆</Tag>
                          : <span style={{ color: '#c0c0c0' }}>無</span>;
                      },
                    },
                    {
                      title: '備註',
                      dataIndex: ['attributes', 'notes'],
                      key: 'notes',
                      width: 150,
                      ellipsis: true,
                      render: (notes) => {
                        if (!notes || notes.trim() === '') {
                          return <span style={{ color: '#c0c0c0' }}>無</span>;
                        }
                        return (
                          <Tooltip title={notes}>
                            <div style={{ cursor: 'pointer' }}>
                              {notes.length > 15 ? `${notes.substring(0, 15)}...` : notes}
                            </div>
                          </Tooltip>
                        );
                      }
                    },
                    {
                      title: '創建時間',
                      dataIndex: ['attributes', 'createdAt'],
                      key: 'createdAt',
                      width: 120,
                      render: (date) => new Date(date).toLocaleDateString(),
                    }
                  ]}
                  rowKey={record => record.id}
                  size="small"
                  pagination={false}
                  scroll={{ x: 800 }}
                  expandable={{
                    rowExpandable: (customer) => (customer.attributes?.interactions?.data?.length || 0) > 0,
                    expandedRowRender: (customer) => {
                      const list = customer.attributes?.interactions?.data || [];
                      return (
                        <div style={{ paddingLeft: 8 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>此客戶的聯絡紀錄（{list.length} 筆）</div>
                          {list.map(it => {
                            const a = it.attributes || {};
                            return (
                              <div key={it.id} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                                <span style={{ color: '#888', marginRight: 8 }}>{a.date || (a.createdAt || '').slice(0, 10) || '—'}</span>
                                {a.is_deal && <Tag color="green">成交{a.deal_amount ? ` NT$${Number(a.deal_amount).toLocaleString()}` : ''}</Tag>}
                                <span>{a.notes || a.outcome || a.type || '（無內容）'}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    },
                  }}
                />
                <div style={{ marginTop: 12, padding: 12, background: '#fafafa', border: '1px dashed #e5e5e5', borderRadius: 6 }}>
                  <div style={{ marginBottom: 8, fontWeight: 600 }}>合併後預覽</div>
                  {(() => {
                    const primaryId = duplicatePrimary[index] ?? group.customers[0]?.id;
                    const preview = getMergedPreview(group, duplicateAssignStaff[index] ?? group.customers[0]?.attributes?.sales_staff?.data?.id ?? null, primaryId);
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                        <div><span style={{ color: '#888' }}>姓名：</span>{preview.name || group.customers[0]?.attributes?.name || ''}</div>
                        <div><span style={{ color: '#888' }}>狀態：</span>{statusMap[preview.status]?.text || preview.status || '—'}</div>
                        <div><span style={{ color: '#888' }}>電話：</span>{preview.phone || '—'}</div>
                        <div><span style={{ color: '#888' }}>電子郵件：</span>{preview.email || '—'}</div>
                        <div><span style={{ color: '#888' }}>來源：</span>{sourceMap[preview.source] || preview.source || '—'}</div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ color: '#888' }}>備註：</div>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{preview.notes || '—'}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Modal>

      {/* 合併確認 Modal:按合併後跳出,完整列出將發生什麼,確認才執行 */}
      <Modal
        title="確認合併客戶"
        open={!!mergeConfirm}
        onCancel={() => !merging && setMergeConfirm(null)}
        okText="確認合併"
        cancelText="取消"
        confirmLoading={merging}
        okButtonProps={{ danger: true }}
        onOk={async () => {
          if (!mergeConfirm) return;
          setMerging(true);
          await handleMergeDuplicates(mergeConfirm.group, mergeConfirm.groupIndex);
          setMerging(false);
          setMergeConfirm(null);
        }}
      >
        {mergeConfirm && (() => {
          const group = mergeConfirm.group;
          const gi = mergeConfirm.groupIndex;
          const all = group.customers;
          const primaryId = duplicatePrimary[gi] ?? all[0]?.id;
          const primary = all.find(c => c.id === primaryId) || all[0];
          const others = all.filter(c => c.id !== primary.id);
          const pa = primary.attributes;
          const extraPhones = others.map(c => c.attributes.phone).filter(p => p && p !== pa.phone);
          const extraEmails = others.map(c => c.attributes.email).filter(e => e && e !== pa.email);
          const countRel = (rel) => all.filter(c => c.id !== primary.id)
            .reduce((sum, c) => sum + (c.attributes?.[rel]?.data?.length || 0), 0);
          const movedInteractions = countRel('interactions');
          const movedRegistrations = countRel('registrations');
          const row = (label, value) => (
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span style={{ color: '#888', width: 96, flexShrink: 0 }}>{label}</span>
              <span style={{ fontWeight: 500 }}>{value}</span>
            </div>
          );
          return (
            <div>
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={<span>以 <b>{pa.name || '(無名)'}</b> 這筆為主記錄,其餘 {others.length} 筆的資料併入後刪除。</span>}
              />
              {row('保留姓名', pa.name || '—')}
              {row('保留電話', pa.phone || '—')}
              {row('保留 Email', pa.email || '—')}
              {extraPhones.length > 0 && row('其他電話', <span style={{ color: '#d48806' }}>{extraPhones.join('、')} → 併入備註</span>)}
              {extraEmails.length > 0 && row('其他 Email', <span style={{ color: '#d48806' }}>{extraEmails.join('、')} → 併入備註</span>)}
              <div style={{ borderTop: '1px dashed #e5e5e5', margin: '12px 0' }} />
              {row('轉移聯絡紀錄', <span style={{ color: '#1668dc' }}>{movedInteractions} 筆 → 併到主記錄</span>)}
              {movedRegistrations > 0 && row('轉移活動報名', <span style={{ color: '#1668dc' }}>{movedRegistrations} 筆 → 併到主記錄</span>)}
              {row('刪除重複客戶', <span style={{ color: '#d4380d' }}>{others.length} 筆</span>)}
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 12 }}
                message="此操作無法復原。要換主記錄請先取消,回上一頁用「主記錄」欄重選。"
              />
            </div>
          );
        })()}
      </Modal>

      {/* Excel匯入預覽 Modal */}
      <Modal
        title="匯入客戶資料"
        open={excelImportModalVisible}
        onOk={handleBatchImport}
        onCancel={() => {
          setExcelImportModalVisible(false);
          setPreviewData([]);
        }}
        okText="確認匯入"
        cancelText="取消"
        width={1000}
        bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
        okButtonProps={{ loading: loading }}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="Excel匯入預覽"
            description={`共找到 ${previewData.length} 筆客戶資料，請向下捲動檢視全部，確認無誤後點擊「確認匯入」。`}
            type="info"
            showIcon
          />
        </div>
        
        <Table
          dataSource={previewData}
          columns={[
            {
              title: '姓名',
              dataIndex: 'name',
              key: 'name',
              width: 100,
            },
            {
              title: '電話',
              dataIndex: 'phone',
              key: 'phone',
              width: 120,
            },
            {
              title: '電子郵件',
              dataIndex: 'email',
              key: 'email',
              width: 180,
              ellipsis: true,
            },
            {
              title: '地址',
              dataIndex: 'address',
              key: 'address',
              width: 150,
              ellipsis: true,
              render: (address) => address || <span style={{ color: '#ccc' }}>未填寫</span>
            },
            {
              title: '狀態',
              dataIndex: 'status',
              key: 'status',
              width: 100,
              render: (status) => (
                <Tag color={statusMap[status]?.color}>
                  {statusMap[status]?.text}
                </Tag>
              ),
            },
            {
              title: '來源',
              dataIndex: 'source',
              key: 'source',
              width: 100,
              render: (source) => sourceMap[source],
            },
            {
              title: '負責業務',
              dataIndex: 'sales_staff',
              key: 'sales_staff',
              width: 100,
              render: (sales_staff_id) => {
                if (!sales_staff_id) return <span style={{ color: '#ccc' }}>未指派</span>;
                const staff = salesStaff.find(s => s.id === sales_staff_id);
                return staff ? (staff.attributes.name || staff.attributes.username) : '未找到';
              },
            },
            {
              title: '備註',
              dataIndex: 'notes',
              key: 'notes',
              width: 150,
              ellipsis: true,
              render: (notes) => notes || <span style={{ color: '#ccc' }}>無</span>
            }
          ]}
          rowKey={(record, index) => index}
          size="small"
          pagination={false}
          scroll={{ x: 1100, y: 420 }}
          sticky
        />
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
const getContactOutcomeColor = (outcome) => {
  const colorMap = {
    positive: 'green',
    neutral: 'cyan',
    negative: 'red'
  };
  return colorMap[outcome] || 'default';
};

// 獲取聯絡狀態顏色
const getContactStatusColor = (status) => {
  const colorMap = {
    initial_contact: 'blue',
    following_up: 'cyan',
    negotiating: 'orange',
    contract_signed: 'green',
    payment_received: 'geekblue',
    completed: 'purple',
    pending: 'volcano',
    cancelled: 'red'
  };
  return colorMap[status] || 'default';
};

export default CustomerManagement; 