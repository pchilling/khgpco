import React, { createContext, useContext, useState } from 'react';

const languageContent = {
    'zh-TW': {
        // Navbar
        home: '首頁',
        about: '關於我們',
        projects: '建案實績',
        activities: '最新消息',
        contact: '聯絡我們',
        // ... 其他翻譯
    },
    'en': {
        // Navbar
        home: 'Home',
        about: 'About',
        projects: 'Projects',
        activities: 'News',
        contact: 'Contact',
        // ... 其他翻譯
    }
};

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('zh-TW');

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'zh-TW' ? 'en' : 'zh-TW');
    };

    return (
        <LanguageContext.Provider value={{ 
            language, 
            toggleLanguage, 
            t: languageContent[language] 
        }}>
            {children}
        </LanguageContext.Provider>
    );
}; 