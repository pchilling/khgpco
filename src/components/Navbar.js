import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import logo from '../assets/KH_Logo.png';
import '../styles/navbar.css';

const Navbar = () => {
  const location = useLocation();
  const { language, toggleLanguage } = useLanguage();

  // 添加調試日誌
  console.log('Current language:', language);

  // 導航項目的翻譯
  const navItems = {
    'zh-TW': {
      home: '首頁',
      about: '關於我們',
      projects: '項目',
      events: '活動',
      news: '市場新聞',
      contact: '聯繫我們'
    },
    'en': {
      home: 'Home',
      about: 'About Us',
      projects: 'Projects',
      events: 'Events',
      news: 'News',
      contact: 'Contact'
    }
  };

  // 獲取當前語言的文字
  const t = (key) => navItems[language]?.[key] || navItems['zh-TW'][key];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleNavClick = (e, path) => {
    if (location.pathname === path) {
      e.preventDefault();
      scrollToTop();
    } else {
      scrollToTop();
    }
  };

  const handleContactClick = (e) => {
    e.preventDefault();
    const contactSection = document.getElementById('contact-section');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      // 如果不在首頁，先導航到首頁然後滾動到 contact section
      window.location.href = '/#contact-section';
    }
  };

  return (
    <div className="navbar-container">
      <div className="navbar-wrapper">
        <nav className="navbar">
          <div className="logo-container">
            <Link to="/" onClick={(e) => handleNavClick(e, '/')}>
              <img src={logo} alt="KH Global Property" className="logo" />
            </Link>
          </div>
          <div className="nav-menu">
            <Link 
              to="/" 
              className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, '/')}
            >
              {t('home')}
            </Link>
            <Link 
              to="/about" 
              className={`nav-item ${location.pathname === '/about' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, '/about')}
            >
              {t('about')}
            </Link>
            <Link 
              to="/projects" 
              className={`nav-item ${location.pathname === '/projects' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, '/projects')}
            >
              {t('projects')}
            </Link>
            <Link 
              to="/events" 
              className={`nav-item ${location.pathname === '/events' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, '/events')}
            >
              {t('events')}
            </Link>
            <Link 
              to="/news" 
              className={`nav-item ${location.pathname === '/news' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, '/news')}
            >
              {t('news')}
            </Link>
            <a 
              href="#contact-section"
              onClick={handleContactClick}
              className="nav-item"
            >
              {t('contact')}
            </a>
            <button 
              onClick={() => {
                console.log('Before toggle:', language);
                toggleLanguage();
                console.log('After toggle:', language);
              }} 
              className="language-toggle"
            >
              {language === 'zh-TW' ? 'EN' : '中'}
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Navbar;
