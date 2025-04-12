import React, { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useLocation } from 'react-router-dom';
import '../styles/Home.css';  // We'll create this next
import ContactSection from '../components/ContactSection';
import Partners from '../components/Partners';
import Mission from '../components/Mission';
import LatestProjects from '../components/LatestProjects';
import Testimonials from '../components/Testimonials';

const Home = () => {
    const { language } = useLanguage();
    const location = useLocation();

    const translations = {
        'zh-TW': {
            dream: '夢想',
            home: '家園',
            reality: '成為現實',
            mission: '使命',
            missionText: '我們致力於成為全球房地產領域的信賴夥伴，為客戶提供專業、誠信良質的服務，幫助他們實現家園夢想與投資目標。'
        },
        'en': {
            dream: 'MAKING',
            home: 'DREAMS',
            reality: 'COME TRUE',
            mission: 'MISSION',
            missionText: 'We are committed to becoming a trusted partner in global real estate, providing professional and reliable services to help our clients achieve their dreams of home ownership and investment goals.'
        }
    };

    const t = translations[language];

    // 滾動到聯繫我們部分的函數
    const scrollToContact = () => {
        console.log("執行滾動到聯繫我們部分的函數");
        
        // 立即檢查一次
        const attemptScroll = () => {
            const contactSection = document.getElementById('contact-section');
            if (contactSection) {
                console.log("找到聯繫我們部分，滾動到該元素");
                
                // 滾動到元素
                contactSection.scrollIntoView({ behavior: 'smooth' });
                return true;
            }
            return false;
        };
        
        // 立即嘗試滾動
        if (attemptScroll()) return;
        
        // 如果立即滾動失敗，嘗試多次滾動（可能元素尚未渲染）
        let attempts = 0;
        const maxAttempts = 5;
        const intervalId = setInterval(() => {
            console.log(`嘗試滾動到聯繫我們部分，嘗試次數: ${attempts + 1}`);
            
            if (attemptScroll() || ++attempts >= maxAttempts) {
                clearInterval(intervalId);
            }
        }, 300);
    };

    useEffect(() => {
        console.log("Home 組件加載，當前 URL hash:", window.location.hash);
        document.body.classList.add('no-padding');
        
        // 檢查是否需要滾動到聯繫部分
        const shouldScrollToContact = () => {
            // 檢查 URL hash
            if (window.location.hash === '#contact-section') {
                return true;
            }
            
            // 檢查導航狀態
            if (location.state && location.state.scrollToContact) {
                return true;
            }
            
            return false;
        };
        
        if (shouldScrollToContact()) {
            console.log("需要滾動到聯繫我們部分");
            // 延遲執行滾動，確保頁面完全加載
            setTimeout(scrollToContact, 500);
        } else {
            // 如果不需要滾動到聯繫部分，則滾動到頂部
            setTimeout(() => {
                window.scrollTo({
                    top: 0,
                    behavior: 'instant'
                });
            }, 0);
        }
        
        // 監聽 hashchange 事件
        const handleHashChange = () => {
            console.log("URL hash 變化:", window.location.hash);
            if (window.location.hash === '#contact-section') {
                scrollToContact();
            }
        };
        
        window.addEventListener('hashchange', handleHashChange);
        
        return () => {
            document.body.classList.remove('no-padding');
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, [location]);  // 添加 location 作為依賴項

    return (
        <div className="page-container home-page">
            {/* Hero Section */}
            <section className="home-hero">
                <div className="hero-content">
                    <div className="hero-text-group">
                        <span className="hero-text-large">{t.dream}</span>
                        <div className="hero-text-right">
                            <span className="hero-text-small">{t.home}</span>
                            <span className="hero-subtitle">{t.reality}</span>
                        </div>
                    </div>
                </div>
            </section>
            
            <div className="content-container"> {/* 確保所有內容在同一個容器中 */}
                <Mission />
                <LatestProjects />
                <Testimonials />
                <Partners />
                <ContactSection />
            </div>
        </div>
    );
};

export default Home;
