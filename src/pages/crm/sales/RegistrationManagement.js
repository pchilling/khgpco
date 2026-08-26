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
  // 父表的 rowKey 是 "key"（group key），不是 registration id；
  // 兩個分開存才能讓 checkbox 跟 batch 動作都對位
  const [selectedGroupKeys, setSelectedGroupKeys] = useState([]);
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
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [editingRegistration, setEditingRegistration] = useState(null);
  const [channelPeople, setChannelPeople] = useState([]);
  const [customerSources, setCustomerSources] = useState([]);

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
        return user;
      }
      
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
      
      const key = `${eventId}-${sessionIndex}`;

      // 場次日期（用於排序：最新活動在最上面）
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
      const user = getCurrentUser();
      
      if (!user) {
        console.error('無法獲取用戶資訊');
        message.error('無法獲取用戶資訊，請重新登錄');
        return;
      }
      
      const userId = user.id || user.attributes?.id;
      const all = await fetchAllStrapi(
        API_BASE_URL,
        `/api/registrations?populate[event][populate][0]=session&populate[sales_staff]=*&populate[channel_person]=*&populate[customer_source]=*&filters[sales_staff][id][$eq]=${userId}&sort=createdAt:desc`
      );
      setRegistrations(all);
      setFilteredRegistrations(all);
      processRegistrations(all);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      message.error('獲取報名資料失敗');
    } finally {
      setLoading(false);
    }
  };

  // 獲取渠道人員(補登用)
  const fetchChannelPeople = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/channel-people?populate[channel_company][fields][0]=name&pagination[pageSize]=1000&sort=name:asc`);
      const data = await response.json();
      if (response.ok) setChannelPeople(data.data || []);
    } catch (error) {
      console.error('獲取渠道人員資料錯誤:', error);
    }
  };

  // 獲取客戶來源(報名可選)
  const fetchCustomerSources = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customer-sources`);
      const data = await response.json();
      if (response.ok) setCustomerSources(data.data || []);
    } catch (error) {
      console.error('獲取客戶來源資料錯誤:', error);
    }
  };

  // 報名補登／變更客戶來源
  const setRegistrationSource = async (record, sourceId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/registrations/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { customer_source: sourceId || null } }),
      });
      if (!response.ok) throw new Error(`更新失敗 (${response.status})`);
      const src = customerSources.find(s => s.id === sourceId);
      const patch = (list) => list.map(r => r.id === record.id
        ? { ...r, attributes: { ...r.attributes, customer_source: { data: sourceId ? { id: sourceId, attributes: { name: src?.attributes?.name } } : null } } }
        : r);
      setRegistrations(prev => { const next = patch(prev); processRegistrations(next); return next; });
      setFilteredRegistrations(prev => patch(prev));
      message.success(sourceId ? '已標記來源' : '已移除來源');
    } catch (error) {
      console.error('更新報名來源失敗:', error);
      message.error(`更新來源失敗：${error.message}`);
    }
  };

  // 報名補登／變更渠道人員
  const setRegistrationChannel = async (record, channelPersonId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/registrations/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { channel_person: channelPersonId || null } }),
      });
      if (!response.ok) throw new Error(`更新失敗 (${response.status})`);
      const cp = channelPeople.find(p => p.id === channelPersonId);
      const patch = (list) => list.map(r => r.id === record.id
        ? { ...r, attributes: { ...r.attributes, channel_person: { data: channelPersonId ? { id: channelPersonId, attributes: { name: cp?.attributes?.name } } : null } } }
        : r);
      setRegistrations(prev => { const next = patch(prev); processRegistrations(next); return next; });
      setFilteredRegistrations(prev => patch(prev));
      message.success(channelPersonId ? '已標記渠道' : '已移除渠道');
    } catch (error) {
      console.error('更新報名渠道失敗:', error);
      message.error(`更新渠道失敗：${error.message}`);
    }
  };

  // 獲取活動資料
  const fetchEvents = async () => {
    try {
      const all = await fetchAllStrapi(API_BASE_URL, '/api/events?locale=zh-Hant-TW&populate[session]=*&fields[0]=title&sort=createdAt:desc');
      
      const eventsMap = {};
      (all || []).forEach(event => {
        eventsMap[event.id] = {
          ...event.attributes,
          sessions: Array.isArray(event.attributes.session) 
            ? event.attributes.session 
            : []
        };
      });
      setEvents(eventsMap);
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
    fetchChannelPeople();
    fetchCustomerSources();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [registrations, searchKeyword]);

  // 根據sessionIndex獲取場次名稱
  const getSessionName = (eventId, sessionIndex) => {
    
    if (!eventId || sessionIndex === undefined || sessionIndex === null) {
      return '未指定場次';
    }

    const event = events[eventId];
    if (!event) {
      return '未知活動';
    }

    const sessions = event.sessions || [];
    
    if (!sessions || !sessions.length) {
      return `場次 ${sessionIndex + 1}`;
    }

    if (sessionIndex < 0 || sessionIndex >= sessions.length) {
      return `場次 ${sessionIndex + 1}`;
    }

    const sessionName = sessions[sessionIndex];
    
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
          sales_staff: userId,
          // 自動綁定來源活動（多對多）
          ...(record.attributes.event?.data?.id && {
            events: [record.attributes.event.data.id]
          }),
          // 報名已標記渠道 → 轉客戶時自動帶入
          ...(record.attributes.channel_person?.data?.id && {
            channel_person: record.attributes.channel_person.data.id
          }),
          // 客戶來源:報名有選就帶入,否則預設「活動」
          ...((() => {
            const srcId = record.attributes.customer_source?.data?.id
              || customerSources.find(s => s.attributes.code === 'event')?.id;
            return srcId ? { customer_source: srcId } : {};
          })())
        }
      };


      // 檢查認證 token
      const token = localStorage.getItem('token');

      // 創建客戶 - 嘗試多種認證方式
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // 如果有 token，添加認證
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }


      let customerResponse = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(customerData)
      });

      // 如果第一次請求失敗 (401)，嘗試不帶認證的請求
      if (customerResponse.status === 401) {
        customerResponse = await fetch(`${API_BASE_URL}/api/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(customerData)
        });
      }

      const customerResult = await customerResponse.json();

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


      const updateResponse = await fetch(`${API_BASE_URL}/api/registrations/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const updateResult = await updateResponse.json();

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


      const results = await Promise.allSettled(
        unconfirmedRegistrations.map(async (record) => {
          
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
              sales_staff: userId,
              // 自動綁定來源活動（多對多）
              ...(record.attributes.event?.data?.id && {
                events: [record.attributes.event.data.id]
              })
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
          // dayjs / moment 都有 .format()，但用 .toDate()/.startOf 更安全
          const startDate = formValues.dateRange[0].toDate
            ? formValues.dateRange[0].toDate()
            : new Date(formValues.dateRange[0]);
          startDate.setHours(0, 0, 0, 0);
          const endDate = formValues.dateRange[1].toDate
            ? formValues.dateRange[1].toDate()
            : new Date(formValues.dateRange[1]);
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
          const rawNotes = record?.attributes?.notes || record?.attributes?.message || '';
          const notes = typeof rawNotes === 'string' ? rawNotes : '';
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
        title: '渠道',
        key: 'channel_person',
        width: 160,
        render: (_, record) => {
          const converted = record.attributes.status === 'confirmed';
          const sel = (
            <Select
              size="small"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: 148 }}
              placeholder="補登渠道"
              disabled={converted}
              value={record.attributes.channel_person?.data?.id || undefined}
              onChange={(val) => setRegistrationChannel(record, val)}
              options={channelPeople.map(p => ({
                value: p.id,
                label: p.attributes?.name + (p.attributes?.channel_company?.data?.attributes?.name ? `（${p.attributes.channel_company.data.attributes.name}）` : ''),
              }))}
            />
          );
          return converted ? <Tooltip title="已轉客戶,渠道請至客戶那邊調整">{sel}</Tooltip> : sel;
        },
      },
      {
        title: '來源',
        key: 'customer_source',
        width: 130,
        render: (_, record) => {
          const converted = record.attributes.status === 'confirmed';
          const sel = (
            <Select
              size="small"
              allowClear
              style={{ width: 118 }}
              placeholder="選來源"
              disabled={converted}
              value={record.attributes.customer_source?.data?.id || undefined}
              onChange={(val) => setRegistrationSource(record, val)}
              options={customerSources.map(s => ({ value: s.id, label: s.attributes.name }))}
            />
          );
          return converted ? <Tooltip title="已轉客戶,來源請至客戶那邊調整">{sel}</Tooltip> : sel;
        },
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
              onClick={() => {
                setEditingRegistration(record);
                const attMatch = (record.attributes.attendanceCount || '').toString().match(/\d+/);
                const attNum = attMatch ? parseInt(attMatch[0]) : 1;
                editForm.setFieldsValue({
                  name: record.attributes.name || '',
                  phone: record.attributes.phone || '',
                  email: record.attributes.email || '',
                  attendance: attNum,
                  notes: record.attributes.notes || record.attributes.message || ''
                });
                setEditModalVisible(true);
              }}
            >
              編輯
            </Button>
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
            onChange: (keys, rows) => {
              setSelectedGroupKeys(keys);
              setSelectedRows(rows.flatMap(group => group.registrations || []));
            },
            selectedRowKeys: selectedGroupKeys,
          }}
        />
      </Card>
      <Modal
        title="編輯報名資料"
        open={editModalVisible}
        onCancel={() => { setEditModalVisible(false); setEditingRegistration(null); }}
        onOk={async () => {
          try {
            const vals = await editForm.validateFields();
            if (!editingRegistration) return;
            const attNum = Number(vals.attendance || 1);
            const payload = {
              data: {
                name: vals.name?.trim(),
                phone: vals.phone?.toString().trim(),
                ...(vals.email ? { email: vals.email.trim() } : { email: undefined }),
                attendanceCount: `attendance${isNaN(attNum) ? 1 : attNum}`,
                notes: vals.notes || '',
                message: vals.notes || ''
              }
            };

            const tokenRaw = localStorage.getItem('jwt') || localStorage.getItem('token') || '';
            const bearer = tokenRaw && tokenRaw.includes('.') ? `Bearer ${tokenRaw}` : undefined;

            const resp = await fetch(`${API_BASE_URL}/api/registrations/${editingRegistration.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: bearer } : {}) },
              body: JSON.stringify(payload)
            });
            const json = await resp.json().catch(() => ({}));
            if (!resp.ok) {
              console.error('更新報名失敗:', json);
              throw new Error(json?.error?.message || '更新失敗');
            }
            message.success('更新成功');
            setEditModalVisible(false);
            setEditingRegistration(null);
            fetchRegistrations();
          } catch (e) {
            if (e?.errorFields) return; // 表單驗證錯誤由 AntD 顯示
            console.error('保存報名失敗:', e);
            message.error(e.message || '保存失敗');
          }
        }}
        okText="保存"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '請輸入姓名' }]}>
            <Input placeholder="姓名" />
          </Form.Item>
          <Form.Item name="phone" label="電話" rules={[{ required: true, message: '請輸入電話' }]}>
            <Input placeholder="電話" />
          </Form.Item>
          <Form.Item name="email" label="電子郵件" rules={[{ type: 'email', message: 'Email 格式不正確' }]}>
            <Input placeholder="電子郵件（選填）" />
          </Form.Item>
          <Form.Item name="attendance" label="出席人數" rules={[{ required: true, message: '請輸入出席人數' }]}>
            <Select placeholder="選擇人數">
              {[1,2,3,4,5].map(n => (<Option key={n} value={n}>{n} 人</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="備註">
            <Input.TextArea rows={3} placeholder="備註" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SalesRegistrationManagement; 