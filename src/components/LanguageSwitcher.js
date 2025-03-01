import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  return (
    <div className="language-switcher">
      <select 
        value={i18n.language} 
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid #d9d9d9',
          cursor: 'pointer'
        }}
      >
        <option value="zh-TW">中文</option>
        <option value="en">English</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher; 