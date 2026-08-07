import React, { useState, useEffect, useRef } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Select, message, Popconfirm, Tooltip, Form, Input, DatePicker, Upload, Row, Col, Switch } from 'antd';
import { UserAddOutlined, UserSwitchOutlined, DownloadOutlined, DeleteOutlined, DownOutlined, PlusOutlined, UploadOutlined, RollbackOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../../utils/api';
import { fetchAllStrapi } from '../../../utils/strapiPaginate';
import styles from './RegistrationManagement.module.css';
import * as XLSX from 'xlsx';

const { Option } = Select;

const RegistrationManagement = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [batchDeleteModalVisible, setBatchDeleteModalVisible] = useState(false);
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
  const [isImporting, setIsImporting] = useState(false);
  const importingRef = useRef(false);
  const [fileDigestHex, setFileDigestHex] = useState('');

  // 指派業務相關狀態
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [currentRegistration, setCurrentRegistration] = useState(null);
  const [salesStaff, setSalesStaff] = useState([]);
  const [channelPeople, setChannelPeople] = useState([]);
  const [customerSources, setCustomerSources] = useState([]);
  const [selectedSourceForImport, setSelectedSourceForImport] = useState(null);
  const [isBatchAssign, setIsBatchAssign] = useState(false);

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

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const all = await fetchAllStrapi(
        API_BASE_URL,
        '/api/registrations?populate[event][populate][0]=session&populate[sales_staff]=*&populate[customer]=*&populate[channel_person]=*&populate[customer_source]=*&sort=createdAt:desc'
      );
      setRegistrations(all);
      processRegistrations(all);
    } catch (error) {
      console.error('獲取報名資料錯誤:', error);
      setRegistrations([]);
      setGroupedData([]);
    } finally {
      setLoading(false);
    }
  };

  // 獲取業務人員資料
  const fetchSalesStaff = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sales-staffs?pagination[pageSize]=1000`);
      const data = await response.json();
      
      if (response.ok) {
        setSalesStaff(data.data || []);
      } else {
        console.error('獲取業務人員資料失敗:', data);
      }
    } catch (error) {
      console.error('獲取業務人員資料錯誤:', error);
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

  // 報名補登／變更渠道人員(退訂沖回無關,單純標記帶客渠道)
  const setRegistrationChannel = async (record, channelPersonId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/registrations/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { channel_person: channelPersonId || null } }),
      });
      if (!response.ok) throw new Error(`更新失敗 (${response.status})`);
      const cp = channelPeople.find(p => p.id === channelPersonId);
      // 就地更新,避免整頁重載
      const patch = (list) => list.map(r => r.id === record.id
        ? { ...r, attributes: { ...r.attributes, channel_person: { data: channelPersonId ? { id: channelPersonId, attributes: { name: cp?.attributes?.name } } : null } } }
        : r);
      setRegistrations(prev => { const next = patch(prev); processRegistrations(next); return next; });
      message.success(channelPersonId ? '已標記渠道' : '已移除渠道');
    } catch (error) {
      console.error('更新報名渠道失敗:', error);
      message.error(`更新渠道失敗：${error.message}`);
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
      message.success(sourceId ? '已標記來源' : '已移除來源');
    } catch (error) {
      console.error('更新報名來源失敗:', error);
      message.error(`更新來源失敗：${error.message}`);
    }
  };

  // 獲取活動資料
  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events?populate=*&pagination[pageSize]=1000`);
      const data = await response.json();
      
      
      if (response.ok) {
        // 將活動資料轉為 Map 結構，方便查詢
        const eventsMap = {};
        (data.data || []).forEach(event => {
          eventsMap[event.id] = {
            ...event.attributes,
            // 正確處理 session 資料 - session是直接的陣列
            sessions: event.attributes.session || []
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
    fetchRegistrations();
    fetchEvents();
    fetchSalesStaff();
    fetchChannelPeople();
    fetchCustomerSources();
  }, []);

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

    // 確保 sessionIndex 在有效範圍內
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

  // 刪除報名資料
  const handleDelete = async (record) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/registrations/${record.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('刪除失敗');
      }

      message.success('成功刪除報名資料');
      await fetchRegistrations();
    } catch (error) {
      console.error('刪除失敗:', error);
      message.error('刪除失敗');
    }
  };

  // 導出 Excel
  const handleExport = () => {
    // 準備導出數據
    const exportData = registrations.map(({ attributes }) => {
      return {
        '活動名稱': attributes.event?.data?.attributes?.title || '未知活動',
        '場次': getSessionName(attributes.event?.data?.id, attributes.sessionIndex),
        '姓名': attributes.name,
        '電話': attributes.phone,
        '電子郵件': attributes.email,
        '海外投資經驗': attributes.has_overseas_investment ? '有' : '無',
        '投資預算': (() => {
          const budgetMap = {
            budget_unknown: '未知',
            budget_under_ten: '一千萬以下',
            budget_ten_to_twenty: '一千萬到兩千萬',
            budget_twenty_to_thirty: '兩千萬到三千萬',
            budget_above_thirty: '三千萬以上'
          };
          return budgetMap[attributes.budget_range] || '未知';
        })(),
        '投資說明': attributes.overseas_investment_notes || '',
        '出席人數': `${attributes.attendanceCount || 1}人`,
        '備註': attributes.notes || '',
        '報名時間': new Date(attributes.createdAt).toLocaleString(),
        '狀態': attributes.status === 'confirmed' ? '已轉換' : '未處理'
      };
    });

      // 創建工作表
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "報名資料");

    // 導出文件
    XLSX.writeFile(wb, `活動報名資料_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 下載範本
  const handleTemplateDownload = () => {
    const template = [{
      '姓名': '(必填)',
      '電話號碼': '(必填，請直接輸入數字，系統會自動處理格式)',
      '電子郵件': '(選填)',
      '負責業務': '(選填，請填寫業務人員姓名)',
      '海外投資經驗': '有/無',
      '投資預算': '未知/一千萬以下/一千萬到兩千萬/兩千萬到三千萬/三千萬以上',
      '投資說明': '',
      '出席人數': '請填寫 1-5 之間的數字，例如：2人',
      '備註': ''
    }];

    const ws = XLSX.utils.json_to_sheet(template);
    
    // 設定欄位寬度
    if (!ws['!cols']) ws['!cols'] = [];
    ws['!cols'][1] = { wch: 20, t: 's' }; // 電話號碼
    ws['!cols'][6] = { wch: 15, t: 's' }; // 出席人數

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "範本");
    XLSX.writeFile(wb, "活動報名範本.xlsx");
  };

  // 處理 Excel 上傳
  const handleExcelUpload = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // 計算檔案雜湊，提供批次冪等鍵使用
        try {
          const buf = e.target.result;
          const digest = await crypto.subtle.digest('SHA-256', buf);
          const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
          setFileDigestHex(hex);
        } catch (_) {}

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
          
          // 特殊處理電話號碼 - 嘗試多個可能的欄位名稱
          const phoneValue = row['電話號碼'] || row['電話'] || row['(必填，請在電話號碼前加上單引號 \' 以保留前導零，例如: \'0912345678)'] || '';
          let phone = String(phoneValue).trim();
          
          // 移除所有非數字字符
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          
          // 根據數字長度處理電話號碼
          if (cleanPhone.length === 9) {
            // 9位數字，自動加0
            phone = '0' + cleanPhone;
          } else if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
            // 已經是正確格式
            phone = cleanPhone;
          } else if (cleanPhone.length === 10) {
            // 10位數字但不是以0開頭，加上0
            phone = '0' + cleanPhone.substring(1);
            } else {
            // 其他情況視為無效
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
          
          // 驗證必填欄位
          const missingFields = [];
          if (!name) missingFields.push('姓名');
          if (!phone) missingFields.push('電話號碼');
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
            throw new Error(`第 ${index + 2} 行的電話格式無效（應為10位數字且以0開頭）: ${phoneValue}`);
          }

          // 處理選填欄位
          const attendanceCount = (() => {
            // 從字串中提取數字
            const attendanceStr = String(row['出席人數'] || '').trim();
            
            // 提取數字
            const match = attendanceStr.match(/\d+/);
            const count = match ? parseInt(match[0]) : 1;

            // 確保數字在 1-5 的範圍內
            const validCount = Math.min(Math.max(count, 1), 5);

            // 轉換為對應的枚舉值
            const attendanceMap = {
              1: 'attendance1',
              2: 'attendance2',
              3: 'attendance3',
              4: 'attendance4',
              5: 'attendance5'
            };

            const result = attendanceMap[validCount];
            return result;
          })();

          const budgetRange = (() => {
            const budget = String(row['投資預算'] || '').trim();
            const map = {
              '未知': 'budget_unknown',
              '一千萬以下': 'budget_under_ten',
              '一千萬到兩千萬': 'budget_ten_to_twenty',
              '兩千萬到三千萬': 'budget_twenty_to_thirty',
              '三千萬以上': 'budget_above_thirty'
            };
            return map[budget] || 'budget_unknown';
          })();

          // 處理業務指派
          const salesStaffName = String(row['負責業務'] || '').trim();
          let sales_staff = null;
          if (salesStaffName) {
            
            // 根據姓名查找業務ID (不區分大小寫)
            const foundStaff = salesStaff.find(staff => 
              (staff.attributes.name && staff.attributes.name.toLowerCase() === salesStaffName.toLowerCase()) || 
              (staff.attributes.username && staff.attributes.username.toLowerCase() === salesStaffName.toLowerCase())
            );
            if (foundStaff) {
              sales_staff = foundStaff.id;
            } else {
            }
          }

          // 檢查備註欄位的原始值
          
          const notes = String(row['備註'] || '').trim();

          const result = {
            name,
            phone,
            email: email || undefined, // 空字串時省略此欄位
            sales_staff,
            has_overseas_investment: String(row['海外投資經驗'] || '').includes('有'),
            budget_range: budgetRange,
            overseas_investment_notes: String(row['投資說明'] || '').trim(),
            attendanceCount,
            notes: notes
          };
          
          // 打印備註欄位的值

          return result;
        });

        setPreviewData(previewData);
        setImportModalVisible(true);
    } catch (error) {
        console.error('解析 Excel 文件錯誤:', error);
        message.error(error.message || '無法解析 Excel 文件，請確保文件格式正確');
    }
    };
    reader.readAsArrayBuffer(file);
    return false;
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
          // 自動綁定來源活動（多對多），讓「參加活動」成為結構化欄位而非只在備註
          ...(record.attributes.event?.data?.id && {
            events: [record.attributes.event.data.id]
          }),
          // 如果報名已有指派業務，同時指派給客戶
          ...(record.attributes.sales_staff?.data?.id && {
            sales_staff: record.attributes.sales_staff.data.id
          }),
          // 報名已標記渠道 → 轉客戶時自動帶入(合約:報名轉客戶渠道自動帶入)
          ...(record.attributes.channel_person?.data?.id && {
            channel_person: record.attributes.channel_person.data.id
          }),
          // 客戶來源:報名有選就帶入,否則預設「活動」(他從活動報名來的)
          ...((() => {
            const srcId = record.attributes.customer_source?.data?.id
              || customerSources.find(s => s.attributes.code === 'event')?.id;
            return srcId ? { customer_source: srcId } : {};
          })())
        }
      };


      // 檢查認證 token
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      
      if (!token) {
        throw new Error('未找到認證 Token，請重新登入');
      }

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
      
      // 特別檢查常見錯誤
      if (customerResponse.status === 401) {
        console.error('❌ 401 認證錯誤 - 需要登入或 Token 無效');
      } else if (customerResponse.status === 403) {
        console.error('❌ 403 權限錯誤 - 沒有創建客戶的權限');
      } else if (customerResponse.status === 400) {
        console.error('❌ 400 請求錯誤 - 資料格式問題');
        console.error('錯誤詳情:', customerResult);
      } else if (customerResponse.status === 500) {
        console.error('❌ 500 伺服器錯誤 - Strapi 內部錯誤');
      }


      if (!customerResponse.ok) {
        console.error('創建客戶失敗:', customerResult);
        throw new Error(`創建客戶失敗: ${customerResult.error?.message || '未知錯誤'}`);
    }


      // 更新報名狀態並關聯到新創建的客戶
      const updateData = {
        data: {
          status: 'confirmed',
          customer: customerResult.data.id // 關聯到新創建的客戶
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

      
      message.success(`成功轉換 ${record.attributes.name} 為客戶！客戶ID: ${customerResult.data?.id}`);
      fetchRegistrations(); // 重新載入報名資料
    } catch (error) {
      console.error('轉換客戶失敗:', error);
      message.error(`轉換失敗: ${error.message}`);
    }
  };

  // 取消轉換：還原報名狀態並刪除當初自動建立的客戶
  const unconvertCustomer = async (record) => {
    try {
      const linkedCustomerId = record.attributes.customer?.data?.id;

      // 1. 先還原報名（清掉客戶連結、狀態改回未處理），避免刪客戶時外鍵卡住
      const regResp = await fetch(`${API_BASE_URL}/api/registrations/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { status: 'pending', customer: null } }),
      });
      if (!regResp.ok) {
        throw new Error(`還原報名狀態失敗 (${regResp.status})`);
      }

      // 2. 刪除當初自動建立的客戶（若已被手動刪除則略過）
      if (linkedCustomerId) {
        const delResp = await fetch(`${API_BASE_URL}/api/customers/${linkedCustomerId}`, {
          method: 'DELETE',
        });
        if (!delResp.ok && delResp.status !== 404) {
          message.warning('報名已還原，但關聯客戶刪除失敗，請至客戶管理手動確認');
          fetchRegistrations();
          return;
        }
      }

      message.success(`已取消轉換：${record.attributes.name}（報名已還原為未處理）`);
      fetchRegistrations();
    } catch (error) {
      console.error('取消轉換失敗:', error);
      message.error(`取消轉換失敗: ${error.message}`);
    }
  };

  // 指派業務相關函數
  const handleAssignSalesStaff = (record) => {
    setCurrentRegistration(record);
    setIsBatchAssign(false);
    setAssignModalVisible(true);
  };

  // 批量指派業務
  const handleBatchAssignSalesStaff = () => {
    if (!selectedRows.length) {
      message.warning('請選擇要指派的報名資料');
      return;
    }
    setCurrentRegistration(null);
    setIsBatchAssign(true);
    setAssignModalVisible(true);
  };

  // 確認指派業務
  const confirmAssignSalesStaff = async (salesStaffId) => {
    try {
      if (isBatchAssign) {
        // 批量指派
        const updatePromises = selectedRows.map(recordId => 
          fetch(`${API_BASE_URL}/api/registrations/${recordId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: {
                sales_staff: salesStaffId
              }
            })
          })
        );

        await Promise.all(updatePromises);
        message.success(`成功為 ${selectedRows.length} 筆報名指派業務！`);
        setSelectedRows([]);
      } else {
        // 單個指派
        const response = await fetch(`${API_BASE_URL}/api/registrations/${currentRegistration.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: {
              sales_staff: salesStaffId
            }
          })
      });

        if (!response.ok) {
          throw new Error('指派失敗');
      }

        message.success('成功指派業務！');
      }

      setAssignModalVisible(false);
      fetchRegistrations(); // 重新載入資料
    } catch (error) {
      console.error('指派業務失敗:', error);
      message.error('指派失敗');
    }
  };

  // 批量轉換為客戶
  const handleBatchConvert = async () => {
    if (!selectedRows.length) {
      message.warning('請選擇要轉換的報名資料');
      return;
    }

    try {
      // 根據選中的ID找到完整的記錄
      const selectedRecords = registrations.filter(reg => 
        selectedRows.includes(reg.id)
      );

      // 過濾已轉換的報名
      const unconfirmedRegistrations = selectedRecords.filter(
        record => record.attributes.status !== 'confirmed'
      );
    
      if (!unconfirmedRegistrations.length) {
        message.warning('選擇的報名資料都已經轉換過了');
      return;
    }


      // 批量轉換
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
              // 自動綁定來源活動（多對多）
              ...(record.attributes.event?.data?.id && {
                events: [record.attributes.event.data.id]
              }),
              // 如果報名已有指派業務，同時指派給客戶
              ...(record.attributes.sales_staff?.data?.id && {
                sales_staff: record.attributes.sales_staff.data.id
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

      setSelectedRows([]); // 清空選擇
      fetchRegistrations(); // 重新載入報名資料
    } catch (error) {
      console.error('批量轉換失敗:', error);
      message.error(`批量轉換失敗: ${error.message}`);
    }
  };

  // 批量刪除報名資料
  const handleBatchDelete = async () => {
    if (selectedRows.length === 0) {
      message.warning('請先選擇要刪除的報名資料');
      return;
    }

    setBatchDeleteModalVisible(true);
  };

  // 確認批量刪除
  const confirmBatchDelete = async () => {
    try {
      setLoading(true);
      
      // 批量刪除所選記錄
      await Promise.all(selectedRows.map(recordId => 
        fetch(`${API_BASE_URL}/api/registrations/${recordId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      ));

      message.success(`成功刪除 ${selectedRows.length} 筆報名資料`);
      setSelectedRows([]);
      setBatchDeleteModalVisible(false);
      await fetchRegistrations();
    } catch (error) {
      console.error('批量刪除失敗:', error);
      message.error('批量刪除失敗');
    } finally {
      setLoading(false);
    }
  };

  // 監聽選擇的活動變化
  const handleEventChange = (eventId) => {
    setSelectedEvent(eventId);
    const event = events[eventId];
    if (event && event.sessions) {
      setSelectedEventSessions(event.sessions);
    } else {
      setSelectedEventSessions([]);
    }
    // 切換活動時，前一個活動的場次選擇就無效，避免 sessionIndex
    // 仍指向不存在的場次而帶入錯誤值
    addForm.setFieldValue('sessionIndex', undefined);
  };

  // 處理新增報名
  const handleAdd = async () => {
    try {
      const values = await addForm.validateFields();
      
      // 數據驗證 - 確保事件和場次存在
      const eventId = Number(values.event);
      const sessionIndex = Number(values.sessionIndex);
      
      // 檢查事件是否存在
      const selectedEvent = events[eventId];
      if (!selectedEvent) {
        message.error('選擇的活動不存在，請重新選擇');
        return;
      }
      
      // 檢查場次是否有效
      const sessions = selectedEvent.sessions || [];
      if (sessionIndex < 0 || sessionIndex >= sessions.length) {
        message.error(`選擇的場次無效，該活動只有 ${sessions.length} 個場次`);
        return;
      }
      
      const registrationData = {
        data: {
          name: values.name,
          phone: values.phone,
          email: values.email || null,
          has_overseas_investment: !!values.has_overseas_investment,
          budget_range: values.budget_range || 'budget_unknown',
          overseas_investment_notes: values.overseas_investment_notes || '',
          message: values.notes || '',
          attendanceCount: values.attendanceCount || 'attendance1',
          event: eventId,
          sessionIndex: sessionIndex,
          status: 'pending',
          ...(values.customer_source ? { customer_source: values.customer_source } : {}),
          publishedAt: new Date().toISOString()
        }
      };

      const response = await fetch(`${API_BASE_URL}/api/registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData)
      });

      if (!response.ok) {
        let errorDetail;
        try {
          errorDetail = await response.json();
        } catch (_) {
          try { errorDetail = await response.text(); } catch (_) { errorDetail = null; }
        }
        
        // 提供更詳細的錯誤信息
        let errorMessage = '新增報名失敗';
        if (errorDetail?.error?.message) {
          errorMessage = `新增失敗: ${errorDetail.error.message}`;
        } else if (response.status === 400) {
          errorMessage = '數據格式錯誤，請檢查填寫的資料';
        } else if (response.status === 404) {
          errorMessage = '找不到相關的活動或場次，請重新選擇';
        } else if (response.status === 500) {
          errorMessage = '伺服器錯誤，請稍後再試';
        }
        
        console.error('新增報名失敗 - 狀態碼:', response.status, '詳細:', errorDetail);
        console.error('完整錯誤對象:', JSON.stringify(errorDetail, null, 2));
        console.error('發送的數據:', JSON.stringify(registrationData, null, 2));
        message.error(errorMessage);
        return;
      }

      message.success('成功新增報名！');
      setAddModalVisible(false);
      addForm.resetFields();
      fetchRegistrations();
    } catch (error) {
      console.error('新增報名失敗:', error);
      if (error.name === 'ValidationError') {
        message.error('請填寫必要欄位');
      } else if (error.message.includes('活動不存在')) {
        message.error('選擇的活動不存在，請重新選擇');
      } else if (error.message.includes('場次無效')) {
        message.error('選擇的場次無效，請重新選擇');
      } else {
        message.error(`新增失敗: ${error.message}`);
      }
    }
  };

  // 批量匯入報名資料
  const handleBatchImport = async () => {
    if (!selectedEventForImport || selectedSessionForImport === null) {
      message.error('請選擇活動和場次');
      return;
    }
    if (isImporting || importingRef.current) {
      message.info('正在匯入，請稍候完成再操作');
      return;
    }

    setLoading(true);
    setIsImporting(true);
    importingRef.current = true;
    try {
      // 批量創建報名資料

      const batchKey = fileDigestHex ? `${fileDigestHex}:${selectedEventForImport}:${selectedSessionForImport}` : undefined;

      const results = await Promise.all(previewData.map(async data => {
        // 打印每筆資料的詳細資訊
        
        // 打印每筆資料的備註
        
        const payload = {
          data: {
            name: data.name,
            phone: data.phone,
            email: data.email,
            has_overseas_investment: data.has_overseas_investment,
            budget_range: data.budget_range,
            overseas_investment_notes: data.overseas_investment_notes,
            message: data.notes, // 兼容後端使用 message 儲存備註
            attendanceCount: data.attendanceCount,
            event: Number(selectedEventForImport),
            sessionIndex: Number(selectedSessionForImport),
            status: 'pending',
            publishedAt: new Date().toISOString(),
            ...(selectedSourceForImport ? { customer_source: selectedSourceForImport } : {}),
            ...(data.sales_staff ? { sales_staff: data.sales_staff } : {}),
            ...(batchKey ? { _batchKey: batchKey } : {})
          }
        };
        if (data.email) payload.data.email = data.email;

        const response = await fetch(`${API_BASE_URL}/api/registrations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('匯入失敗:', errorData);
          throw new Error(`匯入失敗: ${response.status} ${errorData?.error?.message || '未知錯誤'}`);
        }

        return await response.json();
      }));

      message.success(`成功匯入 ${results.length} 筆報名資料`);
      setImportModalVisible(false);
      setPreviewData([]);
      setSelectedEventForImport(null);
      setSelectedSessionForImport(null);
      setFileDigestHex('');
      await fetchRegistrations();
    } catch (error) {
      console.error('批量匯入失敗:', error);
      message.error(error.message || '批量匯入失敗，請檢查資料格式是否正確');
    } finally {
      importingRef.current = false;
      setIsImporting(false);
      setLoading(false);
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
        render: (value) => {
          const budgetMap = {
            budget_unknown: '未知',
            budget_under_ten: '一千萬以下',
            budget_ten_to_twenty: '一千萬到兩千萬',
            budget_twenty_to_thirty: '兩千萬到三千萬',
            budget_above_thirty: '三千萬以上'
          };
          return budgetMap[value] || '未知';
        },
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
          // 從枚舉值中提取數字（例如：'attendance2' -> 2）
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
          const notes = (typeof record.attributes.notes === 'string' && record.attributes.notes.trim() !== '')
            ? record.attributes.notes
            : (typeof record.attributes.message === 'string' ? record.attributes.message : '');
          if ((notes || '').trim() === '') {
            return <span style={{ color: '#c0c0c0' }}>無</span>;
          }
          return (
            <Tooltip title={notes}>
              <div style={{ cursor: 'pointer', color: '#666' }}>
                {notes.length > 20 ? `${notes.substring(0, 20)}...` : notes}
              </div>
            </Tooltip>
          );
        },
      },
    {
      title: '報名時間',
      dataIndex: ['attributes', 'createdAt'],
      key: 'createdAt',
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: '負責業務',
      dataIndex: ['attributes', 'sales_staff'],
      key: 'sales_staff',
      render: (salesStaff) => {
        if (!salesStaff?.data) {
          return <Tag color="default">未指派</Tag>;
        }
        return (
          <Tag color="blue">
            {salesStaff.data.attributes.name || salesStaff.data.attributes.username}
          </Tag>
        );
      },
    },
    {
      title: '渠道',
      key: 'channel_person',
      width: 160,
      render: (_, record) => (
        <Select
          size="small"
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: 148 }}
          placeholder="補登渠道"
          value={record.attributes.channel_person?.data?.id || undefined}
          onChange={(val) => setRegistrationChannel(record, val)}
          options={channelPeople.map(p => ({
            value: p.id,
            label: p.attributes?.name + (p.attributes?.channel_company?.data?.attributes?.name ? `（${p.attributes.channel_company.data.attributes.name}）` : ''),
          }))}
        />
      ),
    },
    {
      title: '來源',
      key: 'customer_source',
      width: 130,
      render: (_, record) => (
        <Select
          size="small"
          allowClear
          style={{ width: 118 }}
          placeholder="選來源"
          value={record.attributes.customer_source?.data?.id || undefined}
          onChange={(val) => setRegistrationSource(record, val)}
          options={customerSources.map(s => ({ value: s.id, label: s.attributes.name }))}
        />
      ),
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
        width: 170,
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
          {record.attributes.status === 'confirmed' && (
            <Popconfirm
              title="取消轉換"
              description={
                <div style={{ maxWidth: 260 }}>
                  將把此報名還原為「未處理」，並刪除當初自動建立的客戶。
                  <br />
                  <span style={{ color: '#d4380d' }}>
                    若該客戶已被跟進、加了聯絡紀錄，將一併刪除，請確認。
                  </span>
                </div>
              }
              onConfirm={() => unconvertCustomer(record)}
              okText="確定取消轉換"
              cancelText="不要"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" icon={<RollbackOutlined />}>
                取消轉換
              </Button>
            </Popconfirm>
          )}
          <Button
            size="small"
            icon={<UserSwitchOutlined />}
            onClick={() => handleAssignSalesStaff(record)}
          >
            指派
          </Button>
          <Popconfirm
            title="確定要刪除此報名資料嗎？"
            description="此操作無法撤銷"
            onConfirm={() => handleDelete(record)}
            okText="確定"
            cancelText="取消"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

    return (
      <div style={{ margin: '0 -32px' }}>
        <Table
          columns={columns}
          dataSource={record.registrations}
          rowSelection={{
            selectedRowKeys: selectedRows,
            onChange: (selectedKeys, selectedRecords) => {
              setSelectedRows(selectedKeys);
            },
            getCheckboxProps: (record) => ({
              disabled: false,
            }),
          }}
          pagination={{ pageSize: 20, pageSizeOptions: ['10', '20', '50', '100'], showSizeChanger: true, showTotal: (t) => `共 ${t} 筆` }}
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

  return (
    <div className={styles.registrationManagement}>
      <Card 
        title={
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            活動報名管理
          </div>
        }
        extra={
          <Space>
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
              <Button icon={<UploadOutlined />} disabled={isImporting}>
                匯入 Excel
              </Button>
            </Upload>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddModalVisible(true)}
            >
              新增報名
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={!registrations.length}
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
            <Button
              icon={<UserSwitchOutlined />}
              onClick={handleBatchAssignSalesStaff}
              disabled={selectedRows.length === 0}
            >
              指派業務
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
              disabled={selectedRows.length === 0}
            >
              批量刪除
            </Button>
          </Space>
        }
      >
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
        />
      </Card>

      {/* 批量刪除確認 Modal */}
      <Modal
        title="批量刪除報名資料"
        open={batchDeleteModalVisible}
        onOk={confirmBatchDelete}
        onCancel={() => setBatchDeleteModalVisible(false)}
        okText="確認刪除"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: loading }}
      >
        <p>您確定要刪除所選的 {selectedRows.length} 筆報名資料嗎？</p>
        <p style={{ color: 'red' }}>警告：此操作無法撤銷！</p>
      </Modal>

      {/* Excel 匯入預覽 Modal */}
      <Modal
        title="匯入報名資料"
        open={importModalVisible}
        onOk={handleBatchImport}
        onCancel={() => {
          if (isImporting) return; // 匯入中禁止關閉
          setImportModalVisible(false);
          setPreviewData([]);
          setSelectedEventForImport(null);
          setSelectedSessionForImport(null);
          setFileDigestHex('');
        }}
        width={800}
        maskClosable={!isImporting}
        keyboard={!isImporting}
        closable={!isImporting}
        okButtonProps={{ loading: isImporting, disabled: isImporting || !previewData.length || !selectedEventForImport || selectedSessionForImport === null }}
        cancelButtonProps={{ disabled: isImporting }}
      >
        <Form layout="vertical">
          <Form.Item
            label="選擇活動"
            required
          >
            <Select
              placeholder="請選擇活動"
              onChange={(value) => {
                setSelectedEventForImport(value);
                setSelectedSessionForImport(null);
              }}
              value={selectedEventForImport}
            >
              {Object.entries(events).map(([id, event]) => (
                <Option key={id} value={id}>
                  {event.title}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="選擇場次"
            required
          >
            <Select
              placeholder="請選擇場次"
              disabled={!selectedEventForImport}
              onChange={(value) => setSelectedSessionForImport(value)}
              value={selectedSessionForImport}
            >
              {selectedEventForImport && events[selectedEventForImport]?.sessions.map((session, index) => (
                <Option key={index} value={index}>
                  {session.location || `場次 ${index + 1}`}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="客戶來源（此批一起套用）">
            <Select
              allowClear showSearch optionFilterProp="children"
              placeholder="請選擇來源(選填,如 FB／官網／渠道)"
              value={selectedSourceForImport}
              onChange={(value) => setSelectedSourceForImport(value)}
            >
              {customerSources.map(s => (
                <Option key={s.id} value={s.id}>{s.attributes.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            預覽資料（共 {previewData.length} 筆）：
          </div>

          <Table
            dataSource={previewData}
            columns={[
              {
                title: '姓名',
                dataIndex: 'name',
                key: 'name',
              },
              {
                title: '電話',
                dataIndex: 'phone',
                key: 'phone',
              },
              {
                title: '電子郵件',
                dataIndex: 'email',
                key: 'email',
              },
              {
                title: '負責業務',
                dataIndex: 'sales_staff',
                key: 'sales_staff',
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
              }
            ]}
            size="small"
            pagination={{ pageSize: 5 }}
            scroll={{ y: 200 }}
          />
        </Form>
      </Modal>

      {/* 指派業務 Modal */}
      <Modal
        title={isBatchAssign ? `批量指派業務 (${selectedRows.length} 筆)` : "指派業務"}
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        footer={null}
        width={400}
      >
        <div style={{ padding: '20px 0' }}>
          {!isBatchAssign && currentRegistration && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
              <div><strong>姓名：</strong>{currentRegistration.attributes.name}</div>
              <div><strong>電話：</strong>{currentRegistration.attributes.phone}</div>
              <div><strong>電子郵件：</strong>{currentRegistration.attributes.email}</div>
            </div>
          )}
          
          <div style={{ marginBottom: 16 }}>
            <strong>選擇業務人員：</strong>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {salesStaff.map(staff => (
              <Button
                key={staff.id}
                style={{ textAlign: 'left', height: 'auto', padding: '12px 16px' }}
                onClick={() => confirmAssignSalesStaff(staff.id)}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    {staff.attributes.name || staff.attributes.username}
                  </div>
                  {staff.attributes.email && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {staff.attributes.email}
                    </div>
                  )}
                </div>
              </Button>
            ))}
            
            {salesStaff.length === 0 && (
              <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
                暫無業務人員資料
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* 新增報名資料 Modal */}
      <Modal
        title="新增報名"
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false);
          addForm.resetFields();
        }}
        onOk={handleAdd}
        width={800}
      >
        <Form
          form={addForm}
          layout="vertical"
          initialValues={{
            has_overseas_investment: false,
            budget_range: 'budget_unknown',
            attendanceCount: 'attendance1'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="event"
                label="活動"
                rules={[{ required: true, message: '請選擇活動' }]}
              >
                <Select
                  placeholder="請選擇活動"
                  onChange={handleEventChange}
                >
                  {Object.entries(events).map(([id, event]) => (
                    <Option key={id} value={id}>
                      {event.title}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sessionIndex"
                label="場次"
                rules={[{ required: true, message: '請選擇場次' }]}
              >
                <Select placeholder="請選擇場次">
                  {selectedEventSessions.map((session, index) => (
                    <Option key={index} value={index}>
                      {session.location || `場次 ${index + 1}`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customer_source" label="客戶來源">
                <Select allowClear showSearch optionFilterProp="children" placeholder="請選擇來源(選填,如 FB／官網／渠道)">
                  {customerSources.map(s => (
                    <Option key={s.id} value={s.id}>{s.attributes.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: '請輸入姓名' }]}
              >
                <Input placeholder="請輸入姓名" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="phone"
                label="電話"
                rules={[
                  { required: true, message: '請輸入電話' },
                  { pattern: /^[0-9]{8,}$/, message: '請輸入有效的電話號碼' }
                ]}
              >
                <Input placeholder="請輸入電話" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="email"
                label="電子郵件"
                rules={[
                  { required: true, message: '請輸入電子郵件' },
                  { type: 'email', message: '請輸入有效的電子郵件' }
                ]}
              >
                <Input placeholder="請輸入電子郵件" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="has_overseas_investment"
                label="海外投資經驗"
                valuePropName="checked"
              >
                <Switch checkedChildren="有" unCheckedChildren="無" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="budget_range"
                label="投資預算"
              >
                <Select>
                  <Option value="budget_unknown">未知</Option>
                  <Option value="budget_under_ten">一千萬以下</Option>
                  <Option value="budget_ten_to_twenty">一千萬到兩千萬</Option>
                  <Option value="budget_twenty_to_thirty">兩千萬到三千萬</Option>
                  <Option value="budget_above_thirty">三千萬以上</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="attendanceCount"
                label="出席人數"
                rules={[
                  { required: true, message: '請選擇出席人數' }
                ]}
              >
                <Select>
                  <Option value="attendance1">1人</Option>
                  <Option value="attendance2">2人</Option>
                  <Option value="attendance3">3人</Option>
                  <Option value="attendance4">4人</Option>
                  <Option value="attendance5">5人</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="overseas_investment_notes"
            label="投資說明"
          >
            <Input.TextArea
              placeholder="請輸入投資相關說明"
              rows={4}
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="備註"
          >
            <Input.TextArea
              placeholder="請輸入備註"
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RegistrationManagement; 