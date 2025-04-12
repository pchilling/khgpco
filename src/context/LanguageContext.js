import React, { createContext, useContext, useState, useEffect } from 'react';

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

    // 当语言变化时，设置 HTML 元素的 lang 属性
    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'zh-TW' ? 'en' : 'zh-TW');
    };

    const setLanguageDirectly = (lang) => {
        if (lang === 'zh-TW' || lang === 'en') {
            setLanguage(lang);
        }
    };

    return (
        <LanguageContext.Provider value={{ 
            language, 
            toggleLanguage,
            setLanguage: setLanguageDirectly,
            t: languageContent[language] 
        }}>
            {children}
        </LanguageContext.Provider>
    );
}; 