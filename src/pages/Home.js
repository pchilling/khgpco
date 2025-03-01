import React, { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Home.css';  // We'll create this next
import Banner from '../components/Banner';
import Footer from '../components/Footer';
import ContactSection from '../components/ContactSection';
import Partners from '../components/Partners';
import Mission from '../components/Mission';
import { Link } from 'react-router-dom';

const Home = () => {
    const { language } = useLanguage();

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

    useEffect(() => {
        document.body.classList.add('no-padding');
        
        // 處理 URL hash 跳轉
        const hash = window.location.hash;
        if (hash === '#contact-section') {
            const contactSection = document.getElementById('contact-section');
            if (contactSection) {
                setTimeout(() => {
                    contactSection.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        }
        
        window.scrollTo({ top: 0, behavior: 'instant' });
        
        return () => {
            document.body.classList.remove('no-padding');
        };
    }, []);

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
            <Mission />
            <Partners />
            <ContactSection />
            
        </div>
    );
};

export default Home;
