import React from 'react';
import '../styles/Mission.css';
import { useLanguage } from '../context/LanguageContext';

const Mission = () => {
    const { language } = useLanguage();
    
    const translations = {
        'zh-TW': {
            title: '使命',
            text: '我們致力於成為全球房地產領域的信賴夥伴，\n為客戶提供專業、誠信良質的服務，幫助他們實現家園夢想與投資目標。'
        },
        'en': {
            title: 'Our Mission',
            text: 'We are committed to becoming a trusted partner in the global real estate field,\nproviding professional, honest, and quality services to help our clients achieve their home dreams and investment goals.'
        }
    };
    
    const t = translations[language];
    
    // 將文本中的換行符轉換為 <br /> 標籤
    const formattedText = t.text.split('\n').map((line, index) => (
        <React.Fragment key={index}>
            {line}
            {index < t.text.split('\n').length - 1 && <br />}
        </React.Fragment>
    ));
    
    return (
        <section className="mission-section">
            <div className="mission-top-decor"></div>
            <div className="mission-content">
                <h2 className="mission-title" style={{ color: '#C5A664' }}>{t.title}</h2>
                <p className="mission-text" style={{ color: '#142613' }}>
                    {formattedText}
                </p>
            </div>
            <div className="mission-bottom-decor"></div>
        </section>
    );
};

export default Mission; 