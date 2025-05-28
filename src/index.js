import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

if (process.env.NODE_ENV === 'development') {
  window.console = window._originalConsole || console;
}

// Google Tag Manager 頁面追蹤增強
// 處理 hash URL 的特殊情況 (#/events/4)
const sendPageViewToGTM = () => {
  try {
    if (window.dataLayer) {
      // 獲取完整的路徑（包括 hash 部分）
      const fullPath = window.location.pathname + 
                      (window.location.hash ? window.location.hash.replace('#', '') : '');
      
      // 發送虛擬頁面瀏覽事件到 GTM
      window.dataLayer.push({
        event: 'virtualPageview',
        virtualPagePath: fullPath,
        virtualPageTitle: document.title
      });
      
      console.log('GTM virtualPageview sent:', fullPath);
    }
  } catch (error) {
    console.error('Error sending pageview to GTM:', error);
  }
};

// 監聽 hash 變化
window.addEventListener('hashchange', sendPageViewToGTM);

// 初始頁面加載時也發送一次
window.addEventListener('load', sendPageViewToGTM);

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
