import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Select, message, Popconfirm, Tooltip, Form, Input, DatePicker, Row, Col, Switch, Alert, Empty, Spin } from 'antd';
import { UserAddOutlined, UserSwitchOutlined, DownloadOutlined, DeleteOutlined, DownOutlined, PlusOutlined, SearchOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../../utils/api';
import { fetchAllStrapi } from '../../../utils/strapiPaginate';
import styles from './RegistrationManagement.module.css';
import * as XLSX from 'xlsx';

const { Option } = Select;
const { RangePicker } = DatePicker;

const SalesRegistrationManagement = () => {
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [events, setEvents] = useState({});
  const [groupedData, setGroupedData] = useState([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventSessions, setSelectedEventSessions] = useState([]);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [selectedEventForImport, setSelectedEventForImport] = useState(null);
  const [selectedSessionForImport, setSelectedSessionForImport] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterForm] = Form.useForm();

  const statusMap = {
    pending: { text: '未處理', color: 'blue' },
    confirmed: { text: '已轉換', color: 'green' }
  };

  const budgetMap = {
    budget_unknown: '未知',
    budget_under_ten: '一千萬以下',
    budget_ten_to_twenty: '一千萬到兩千萬',
    budget_twenty_to_thirty: '兩千萬到三千萬',
    budget_above_thirty: '三千萬以上'
  };

  // 獲取當前登入用戶資訊 - 與 MyCustomers 保持一致
  const getCurrentUser = () => {
    try {
      // 優先使用 user，如果沒有則使用 salesStaff
      let userStr = localStorage.getItem('user');
      if (!userStr) {
        userStr = localStorage.getItem('salesStaff');
      }
      
      if (userStr) {
        const user = JSON.parse(userStr);
        console.log('Sales Registration 當前用戶:', user);
        return user;
      }
      
      console.log('localStorage 中沒有用戶資訊');
      return null;
    } catch (error) {
      console.error('解析用戶資訊失敗:', error);
      return null;
    }
  };

  // 獲取報名資料後的處理函數
  const processRegistrations = (data) => {
    // 按活動和場次分組
    const grouped = {};
    data.forEach(registration => {
      const eventId = registration.attributes.event?.data?.id;
      const sessionIndex = registration.attributes.sessionIndex;
      const eventTitle = registration.attributes.event?.data?.attributes?.title || '未知活動';
      const eventSessions = registration.attributes.event?.data?.attributes?.session || [];
      const sessionObj = eventSessions[sessionIndex];
      
      // 根據session數據結構確定場次名稱
      let sessionName;
      if (typeof sessionObj === 'object' && sessionObj?.location) {
        sessionName = sessionObj.location;
      } else if (typeof sessionObj === 'string') {
        sessionName = sessionObj;
      } else {
        sessionName = `場次 ${sessionIndex + 1}`;
      }
      
      console.log('Sales processRegistrations 場次處理:', { 
        eventId, 
        sessionIndex, 
        sessionObj, 
        sessionName 
      });
      const key = `${eventId}-${sessionIndex}`;

      // 場次日期（用於排序）
      const sessionDateRaw = (typeof sessionObj === 'object' && sessionObj)
        ? (sessionObj.datetime || sessionObj.startDateTime || sessionObj.date || sessionObj.eventDate)
        : null;
      const sessionDate = sessionDateRaw ? new Date(sessionDateRaw) : null;

      if (!grouped[key]) {
        grouped[key] = {
          key,
          eventId,
          sessionIndex,
          eventTitle,
          sessionName,
          sessionDate,
          registrations: [],
          totalCount: 0,
          confirmedCount: 0
        };
      }

      grouped[key].registrations.push(registration);
      grouped[key].totalCount++;
      if (registration.attributes.status === 'confirmed') {
        grouped[key].confirmedCount++;
      }
    });

    // 依場次日期排序，最新在最上面（沒日期的群組排到最後）
    const groupedArray = Object.values(grouped).sort((a, b) => {
      const at = a.sessionDate ? a.sessionDate.getTime() : null;
      const bt = b.sessionDate ? b.sessionDate.getTime() : null;
      if (at === null && bt === null) {
        const titleCompare = a.eventTitle.localeCompare(b.eventTitle);
        if (titleCompare !== 0) return titleCompare;
        return a.sessionIndex - b.sessionIndex;
      }
      if (at === null) return 1;
      if (bt === null) return -1;
      return bt - at;
    });
    
    setGroupedData(groupedArray);
  };

  // 獲取報名資料（只獲取當前業務負責的）- 模仿 MyCustomers 的簡潔方式
  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      // 獲取當前登錄的銷售人員信息 - 使用統一的獲取方式
      const user = getCurrentUser();
      console.log('當前用戶:', user);
      
      if (!user) {
        console.error('無法獲取用戶資訊');
        message.error('無法獲取用戶資訊，請重新登錄');
        return;
      }
      
      // 獲取當前業務負責的報名資料
      const userId = user.id || user.attributes?.id;
      console.log('使用的用戶ID:', userId);
      
      const allData = await fetchAllStrapi(
        API_BASE_URL,
        `/api/registrations?populate[event][populate][0]=session&populate[sales_staff]=*&filters[sales_staff][id][$eq]=${userId}&sort=createdAt:desc`
      );
      console.log('報名資料總數:', allData.length);
      setRegistrations(allData);
      setFilteredRegistrations(allData);
      processRegistrations(allData);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      message.error('獲取報名資料失敗');
    } finally {
      setLoading(false);
    }
  };

  // 獲取活動資料
  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events?populate=*`);
      const data = await response.json();
      
      if (response.ok) {
        const eventsMap = {};
        (data.data || []).forEach(event => {
          eventsMap[event.id] = {
            ...event.attributes,
            sessions: Array.isArray(event.attributes.session) 
              ? event.attributes.session 
              : event.attributes.session?.data?.map(s => s.attributes.name) || []
          };
        });
        setEvents(eventsMap);
      } else {
        console.error('獲取活動資料失敗:', data);
      }
    } catch (error) {
      console.error('獲取活動資料錯誤:', error);
    }
  };

  useEffect(() => {
    // 設置當前用戶
    const user = getCurrentUser();
    setCurrentUser(user);
    
    // 模仿 MyCustomers 的簡潔方式
    fetchRegistrations();
    fetchEvents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [registrations, searchKeyword]);

  // 根據sessionIndex獲取場次名稱
  const getSessionName = (eventId, sessionIndex) => {
    console.log('Sales getSessionName 調用:', { eventId, sessionIndex, events });
    
    if (!eventId || sessionIndex === undefined || sessionIndex === null) {
      console.log('eventId或sessionIndex無效:', { eventId, sessionIndex });
      return '未指定場次';
    }

    const event = events[eventId];
    if (!event) {
      console.log('找不到活動:', eventId, '可用活動:', Object.keys(events));
      return '未知活動';
    }

    const sessions = event.sessions || [];
    console.log('活動場次數據:', { eventId, sessions, sessionIndex });
    
    if (!sessions || !sessions.length) {
      console.log('沒有場次數據，返回默認名稱');
      return `場次 ${sessionIndex + 1}`;
    }

    if (sessionIndex < 0 || sessionIndex >= sessions.length) {
      console.log('sessionIndex超出範圍:', { sessionIndex, sessionsLength: sessions.length });
      return `場次 ${sessionIndex + 1}`;
    }

    const sessionName = sessions[sessionIndex];
    console.log('獲取到的場次名稱:', sessionName);
    
    // 如果session是對象，取location屬性
    if (typeof sessionName === 'object' && sessionName?.location) {
      return sessionName.location;
    }
    
    // 如果session是字符串，直接返回
    if (typeof sessionName === 'string') {
      return sessionName;
    }
    
    return sessionName || `場次 ${sessionIndex + 1}`;
  };

  // 轉換為客戶
  const convertToCustomer = async (record) => {
    try {
      console.log('業務轉換客戶，報名資料:', record);
      
      // 準備詳細的客戶備註資訊
      const eventInfo = record.attributes.event?.data?.attributes;
      const eventTitle = eventInfo?.title || '未知活動';
      const sessionName = getSessionName(record.attributes.event?.data?.id, record.attributes.sessionIndex);
      
      // 組織備註內容
      const notesContent = [
        `活動報名資訊：`,
        `• 活動名稱：${eventTitle}`,
        `• 參與場次：${sessionName}`,
        record.attributes.attendanceCount && `• 出席人數：${record.attributes.attendanceCount}`,
        (record.attributes.notes || record.attributes.message) && `• 原始備註：${record.attributes.notes || record.attributes.message}`,
        `• 報名時間：${new Date(record.attributes.createdAt).toLocaleString()}`
      ].filter(Boolean).join('\n');

      // 獲取當前用戶 - 使用統一的獲取方式
      const user = getCurrentUser();
      const userId = user.id || user.attributes?.id;
      
      // 準備客戶資料 - 移除不存在的 source_detail 欄位
      const customerData = {
        data: {
          name: record.attributes.name,
          phone: record.attributes.phone,
          email: record.attributes.email,
          has_overseas_investment: record.attributes.has_overseas_investment || false,
          budget_range: record.attributes.budget_range || 'budget_unknown',
          overseas_investment_notes: record.attributes.overseas_investment_notes || '',
          notes: notesContent,
          source: 'event',
          status: 'potential',
          publishedAt: new Date().toISOString(), // 添加發布狀態以符合 draftAndPublish: true
          sales_staff: userId
        }
      };

      console.log('客戶資料準備完成:', customerData);

      // 檢查認證 token
      const token = localStorage.getItem('token');
      console.log('Token:', token ? '存在' : '不存在');

      // 創建客戶 - 嘗試多種認證方式
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // 如果有 token，添加認證
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('請求標頭:', headers);
      console.log('請求 URL:', `${API_BASE_URL}/api/customers`);
      console.log('請求方法: POST');
      console.log('請求 Body:', JSON.stringify(customerData, null, 2));

      let customerResponse = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(customerData)
      });

      // 如果第一次請求失敗 (401)，嘗試不帶認證的請求
      if (customerResponse.status === 401) {
        console.log('🔄 嘗試不帶認證的請求...');
        customerResponse = await fetch(`${API_BASE_URL}/api/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(customerData)
        });
      }

      const customerResult = await customerResponse.json();
      console.log('客戶創建回應:', customerResult);

      if (!customerResponse.ok) {
        console.error('創建客戶失敗:', customerResult);
        throw new Error(`創建客戶失敗: ${customerResult.error?.message || '未知錯誤'}`);
      }

      // 更新報名狀態並關聯到新創建的客戶
      const updateData = {
        data: {
          status: 'confirmed',
          customer: customerResult.data.id
        }
      };

      console.log('準備更新報名:', updateData);

      const updateResponse = await fetch(`${API_BASE_URL}/api/registrations/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const updateResult = await updateResponse.json();
      console.log('報名更新回應:', updateResult);

      if (!updateResponse.ok) {
        console.error('更新報名狀態失敗:', updateResult);
        throw new Error(`更新報名狀態失敗: ${updateResult.error?.message || '未知錯誤'}`);
      }

      message.success(`成功轉換 ${record.attributes.name} 為客戶！`);
      fetchRegistrations();
    } catch (error) {
      console.error('轉換客戶失敗:', error);
      message.error(`轉換失敗: ${error.message}`);
    }
  };

  // 批量轉換為客戶
  const handleBatchConvert = async () => {
    if (!selectedRows.length) {
      message.warning('請選擇要轉換的報名資料');
      return;
    }

    try {
      // 獲取當前用戶 - 使用統一的獲取方式
      const user = getCurrentUser();
      const userId = user.id || user.attributes?.id;
      
      const unconfirmedRegistrations = selectedRows.filter(
        record => record.attributes.status !== 'confirmed'
      );
    
      if (!unconfirmedRegistrations.length) {
        message.warning('選擇的報名資料都已經轉換過了');
        return;
      }

      console.log(`業務批量轉換 ${unconfirmedRegistrations.length} 筆報名資料`);

      const results = await Promise.allSettled(
        unconfirmedRegistrations.map(async (record) => {
          console.log('轉換報名:', record.attributes.name);
          
          // 準備詳細的客戶備註資訊
          const eventInfo = record.attributes.event?.data?.attributes;
          const eventTitle = eventInfo?.title || '未知活動';
          const sessionName = getSessionName(record.attributes.event?.data?.id, record.attributes.sessionIndex);
          
          // 組織備註內容
          const notesContent = [
            `活動報名資訊：`,
            `• 活動名稱：${eventTitle}`,
            `• 參與場次：${sessionName}`,
            record.attributes.attendanceCount && `• 出席人數：${record.attributes.attendanceCount}`,
            (record.attributes.notes || record.attributes.message) && `• 原始備註：${record.attributes.notes || record.attributes.message}`,
            `• 報名時間：${new Date(record.attributes.createdAt).toLocaleString()}`
          ].filter(Boolean).join('\n');
          
          const customerData = {
            data: {
              name: record.attributes.name,
              phone: record.attributes.phone,
              email: record.attributes.email,
              has_overseas_investment: record.attributes.has_overseas_investment || false,
              budget_range: record.attributes.budget_range || 'budget_unknown',
              overseas_investment_notes: record.attributes.overseas_investment_notes || '',
              notes: notesContent,
              source: 'event',
              status: 'potential',
              publishedAt: new Date().toISOString(), // 添加發布狀態以符合 draftAndPublish: true
              sales_staff: userId
            }
          };

          // 創建客戶
          const customerResponse = await fetch(`${API_BASE_URL}/api/customers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerData)
          });

          const customerResult = await customerResponse.json();
          
          if (!customerResponse.ok) {
            console.error(`創建客戶 ${record.attributes.name} 失敗:`, customerResult);
            throw new Error(`創建客戶 ${record.attributes.name} 失敗: ${customerResult.error?.message || '未知錯誤'}`);
          }

          // 更新報名狀態並關聯到客戶
          const updateData = {
            data: {
              status: 'confirmed',
              customer: customerResult.data.id
            }
          };

          const updateResponse = await fetch(`${API_BASE_URL}/api/registrations/${record.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
          });

          if (!updateResponse.ok) {
            const updateResult = await updateResponse.json();
            console.error(`更新報名 ${record.attributes.name} 失敗:`, updateResult);
            throw new Error(`更新報名 ${record.attributes.name} 失敗`);
          }

          return { success: true, name: record.attributes.name };
        })
      );

      // 統計成功和失敗的數量
      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      if (successful.length > 0) {
        message.success(`成功轉換 ${successful.length} 筆報名資料為客戶！`);
      }
      
      if (failed.length > 0) {
        console.error('失敗的轉換:', failed);
        message.error(`${failed.length} 筆轉換失敗，請檢查控制台了解詳情`);
      }

      setSelectedRows([]);
      fetchRegistrations();
    } catch (error) {
      console.error('批量轉換失敗:', error);
      message.error(`批量轉換失敗: ${error.message}`);
    }
  };

  // 導出 Excel
  const handleExport = () => {
    const exportData = filteredRegistrations.map(({ attributes }) => {
      return {
        '活動名稱': attributes.event?.data?.attributes?.title || '未知活動',
        '場次': getSessionName(attributes.event?.data?.id, attributes.sessionIndex),
        '姓名': attributes.name,
        '電話': attributes.phone,
        '電子郵件': attributes.email,
        '海外投資經驗': attributes.has_overseas_investment ? '有' : '無',
        '投資預算': budgetMap[attributes.budget_range] || '未知',
        '投資說明': attributes.overseas_investment_notes || '',
        '出席人數': `${attributes.attendanceCount || 1}人`,
        '備註': attributes.notes || '',
        '報名時間': new Date(attributes.createdAt).toLocaleString(),
        '狀態': attributes.status === 'confirmed' ? '已轉換' : '未處理'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "報名資料");
    XLSX.writeFile(wb, `我的報名資料_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 搜索和篩選
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
    setFilteredRegistrations(registrations);
    setFilterVisible(false);
  };

  const applyFilters = (formValues = null) => {
    try {
      let filtered = [...registrations];
      
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        filtered = filtered.filter(registration => 
          (registration.attributes.name && registration.attributes.name.toLowerCase().includes(keyword)) ||
          (registration.attributes.phone && registration.attributes.phone.toString().includes(keyword)) ||
          (registration.attributes.email && registration.attributes.email.toLowerCase().includes(keyword))
        );
      }
      
      if (formValues) {
        if (formValues.status && formValues.status.length > 0) {
          filtered = filtered.filter(registration => 
            formValues.status.includes(registration.attributes.status)
          );
        }
        
        if (formValues.event) {
          filtered = filtered.filter(registration => 
            registration.attributes.event?.data?.id === formValues.event
          );
        }
        
        if (formValues.dateRange && formValues.dateRange[0] && formValues.dateRange[1]) {
          const startDate = new Date(formValues.dateRange[0].format('YYYY-MM-DD'));
          const endDate = new Date(formValues.dateRange[1].format('YYYY-MM-DD'));
          endDate.setHours(23, 59, 59, 999);
          
          filtered = filtered.filter(registration => {
            if (!registration.attributes.createdAt) return false;
            const createdAt = new Date(registration.attributes.createdAt);
            return createdAt >= startDate && createdAt <= endDate;
          });
        }
      }
      
      setFilteredRegistrations(filtered);
    } catch (error) {
      console.error('Error applying filters:', error);
      message.error('過濾出錯，請重試');
      setFilteredRegistrations(registrations);
    }
  };

  // 主表格列定義
  const columns = [
    {
      title: '活動名稱',
      dataIndex: 'eventTitle',
      key: 'eventTitle',
      render: (text) => (
        <Tooltip title={text}>
          <div style={{ 
            cursor: 'pointer', 
            color: '#1890ff'
          }}>
            {text.length > 30 ? `${text.substring(0, 30)}...` : text}
          </div>
        </Tooltip>
      ),
    },
    {
      title: '場次',
      dataIndex: 'sessionName',
      key: 'sessionName',
      render: (text) => {
        const sessionText = typeof text === 'string' ? text : '';
        if (sessionText.trim() === '') {
          return <span style={{ color: '#c0c0c0' }}>未指定場次</span>;
        }
        const displayText = sessionText.length > 15 ? `${sessionText.substring(0, 15)}...` : sessionText;
        return (
          <Tooltip title={sessionText}>
            <div style={{ cursor: 'pointer', color: '#666' }}>
              {displayText}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: '報名總數',
      dataIndex: 'totalCount',
      key: 'totalCount',
      render: (text) => (
        <div style={{ 
          fontSize: '16px',
          color: '#52c41a'
        }}>
          {text}
        </div>
      ),
    },
    {
      title: '已轉換數',
      dataIndex: 'confirmedCount',
      key: 'confirmedCount',
      render: (text, record) => (
        <Tag color="green" style={{ padding: '4px 8px', fontSize: '14px' }}>
          {`${text}/${record.totalCount}`}
        </Tag>
      ),
    },
  ];

  // 展開行的渲染函數
  const expandedRowRender = (record) => {
    const columns = [
      {
        title: '姓名',
        dataIndex: ['attributes', 'name'],
        key: 'name',
        render: (text) => (
          <div style={{ fontWeight: 'bold' }}>{text}</div>
        ),
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
        title: '海外投資',
        dataIndex: ['attributes', 'has_overseas_investment'],
        key: 'has_overseas_investment',
        render: (value) => (
          <Tag color={value ? 'green' : 'default'}>
            {value ? '有' : '無'}
          </Tag>
        ),
      },
      {
        title: '投資預算',
        dataIndex: ['attributes', 'budget_range'],
        key: 'budget_range',
        render: (value) => budgetMap[value] || '未知',
      },
      {
        title: '投資說明',
        dataIndex: ['attributes', 'overseas_investment_notes'],
        key: 'overseas_investment_notes',
        ellipsis: true,
        render: (text) => {
          if (!text || text.trim() === '') {
            return <span style={{ color: '#c0c0c0' }}>無</span>;
          }
          return (
            <Tooltip title={text}>
              <div style={{ cursor: 'pointer', color: '#666' }}>
                {text.length > 20 ? `${text.substring(0, 20)}...` : text}
              </div>
            </Tooltip>
          );
        },
      },
      {
        title: '出席人數',
        dataIndex: ['attributes', 'attendanceCount'],
        key: 'attendanceCount',
        render: (value) => {
          const match = value?.match(/\d+/);
          const count = match ? parseInt(match[0]) : 1;
          return `${count}人`;
        }
      },
      {
        title: '備註',
        key: 'notes',
        ellipsis: true,
        render: (_, record) => {
          const notes = typeof record.attributes.notes === 'string' ? record.attributes.notes : '';
          if (notes.trim() === '') {
            return <span style={{ color: '#c0c0c0' }}>無</span>;
          }
          return (
            <Tooltip title={notes}>
              <div style={{ cursor: 'pointer', color: '#666' }}>
                {notes.length > 20 ? `${notes.substring(0, 20)}...` : notes}
              </div>
            </Tooltip>
          );
        }
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
          <Tag color={status === 'confirmed' ? 'green' : 'blue'} style={{ padding: '4px 8px' }}>
            {status === 'confirmed' ? '已轉換' : '未處理'}
          </Tag>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        render: (_, record) => (
          <Space size="small" wrap>
            <Button 
              size="small"
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => convertToCustomer(record)}
              disabled={record.attributes.status === 'confirmed'}
            >
              轉換
            </Button>
          </Space>
        ),
      },
    ];

    return (
      <div style={{ margin: '0 -32px' }}>
        <Table
          columns={columns}
          dataSource={record.registrations}
          pagination={false}
          rowKey={record => record.id}
          size="small"
          style={{ 
            background: '#fafafa',
            margin: '0 32px'
          }}
        />
      </div>
    );
  };

  if (!currentUser) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: '20px' }}>載入中...</p>
      </div>
    );
  }

  return (
    <div className={styles.registrationManagement}>
      <Card 
        title={
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            我的報名管理
          </div>
        }
        extra={
          <Space>
            <Button
              icon={<SearchOutlined />}
              onClick={() => setFilterVisible(!filterVisible)}
            >
              篩選
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={!filteredRegistrations.length}
            >
              匯出 Excel
            </Button>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={handleBatchConvert}
              disabled={selectedRows.length === 0}
            >
              批量轉換
            </Button>
          </Space>
        }
      >
        <Alert
          message={`歡迎，${currentUser?.attributes?.name || currentUser?.attributes?.username || currentUser?.name || currentUser?.username || '業務人員'}`}
          description={`您目前負責 ${filteredRegistrations.length} 筆報名資料，其中 ${filteredRegistrations.filter(r => r.attributes.status === 'confirmed').length} 筆已轉換為客戶`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {filterVisible && (
          <div style={{ 
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
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="status" label="狀態">
                    <Select mode="multiple" placeholder="選擇狀態">
                      {Object.entries(statusMap).map(([value, { text }]) => (
                        <Option key={value} value={value}>{text}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="event" label="活動">
                    <Select placeholder="選擇活動">
                      <Option value="">全部</Option>
                      {Object.entries(events).map(([id, event]) => (
                        <Option key={id} value={id}>
                          {event.title}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="dateRange" label="報名日期">
                    <RangePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={24} md={8}>
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

        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索報名者姓名、電話或電子郵件"
            value={searchKeyword}
            onChange={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={groupedData}
          expandable={{
            expandedRowRender,
            expandRowByClick: true,
            expandIcon: ({ expanded, onExpand, record }) =>
              expanded ? (
                <Button 
                  type="text" 
                  icon={<DownOutlined />} 
                  onClick={e => onExpand(record, e)}
                  style={{ transform: 'rotate(180deg)' }}
                />
              ) : (
                <Button 
                  type="text" 
                  icon={<DownOutlined />} 
                  onClick={e => onExpand(record, e)}
                />
              ),
          }}
          rowKey="key"
          loading={loading}
          rowSelection={{
            onChange: (_, rows) => setSelectedRows(rows.flatMap(group => group.registrations)),
            selectedRowKeys: selectedRows.map(row => row.id),
          }}
        />
      </Card>
    </div>
  );
};

export default SalesRegistrationManagement; 