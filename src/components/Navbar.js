import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import logo from '../assets/KH_Logo.png';
import '../styles/navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // 檢查當前路徑是否為詳情頁面
  // 處理 hash 路由和普通路由
  const path = location.pathname;
  const hash = location.hash;
  
  // 如果使用 hash 路由，則從 hash 中提取路徑
  const effectivePath = hash ? hash.substring(1) : path;
  
  const isDetailPage = 
    effectivePath.includes('/project/') || 
    effectivePath.includes('/event/') || 
    effectivePath.includes('/events/') || 
    effectivePath.includes('/news/');

  // 添加更詳細的調試日誌
  console.log('Current language:', language);
  console.log('Current path:', path);
  console.log('Current hash:', hash);
  console.log('Effective path:', effectivePath);
  console.log('Is detail page:', isDetailPage);

  // 監聽窗口大小變化
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 監聽路由變化，確保每次頁面變化時都滾動到頂部
  useEffect(() => {
    // 只有在路徑變化，且不是跳轉到包含 'contact-section' 的路徑時才滾動到頂部
    if (!location.hash.includes('contact-section')) {
      // 使用 setTimeout 確保在頁面渲染後執行滾動
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'instant' // 使用 'instant' 而不是 'smooth'，避免用戶看到滾動過程
        });
      }, 0);
    }
  }, [location.pathname, location.hash]);

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

  // 處理導航點擊，確保總是回到頁面頂部
  const handleNavClick = () => {
    // 延遲執行滾動，確保在頁面切換後執行
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'instant'
      });
    }, 0);
    
    // 如果是移動端，點擊後關閉菜單
    if (windowWidth <= 768) {
      setMobileMenuOpen(false);
    }
  };

  // 處理聯繫我們點擊
  const handleContactClick = (e) => {
    e.preventDefault();
    
    console.log("點擊了聯繫我們鏈接");
    
    // 檢查當前是否在首頁
    if (location.pathname === '/') {
      // 如果已經在首頁，直接滾動到聯繫我們部分
      const contactSection = document.getElementById('contact-section');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // 如果不在首頁，先導航到首頁，然後設置一個標記
      console.log("不在首頁，將導航到首頁的聯繫我們部分");
      navigate('/', { state: { scrollToContact: true } });
    }
    
    // 如果在移動設備上，關閉菜單
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="navbar-container">
      <div className="navbar-wrapper">
        <nav className="navbar">
          <div className="logo-container">
            <Link to="/" onClick={handleNavClick}>
              <img src={logo} alt="KH Global Property" className="logo" />
            </Link>
          </div>
          
          {/* 桌面端導航菜單 */}
          <div className="nav-menu desktop-only">
            <Link 
              to="/" 
              className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              {t('home')}
            </Link>
            <Link 
              to="/about" 
              className={`nav-item ${location.pathname === '/about' ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              {t('about')}
            </Link>
            <Link 
              to="/projects" 
              className={`nav-item ${location.pathname === '/projects' ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              {t('projects')}
            </Link>
            <Link 
              to="/events" 
              className={`nav-item ${location.pathname === '/events' ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              {t('events')}
            </Link>
            <Link 
              to="/news" 
              className={`nav-item ${location.pathname === '/news' ? 'active' : ''}`}
              onClick={handleNavClick}
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
            {!isDetailPage ? (
              <button 
                onClick={() => {
                  console.log('Before toggle:', language);
                  toggleLanguage();
                  console.log('After toggle:', language);
                }} 
                className="language-toggle"
              >
                {language === 'zh-TW' ? 'EN' : 'TW'}
              </button>
            ) : (
              <button 
                className="language-toggle disabled"
                disabled
                title="Language cannot be changed on detail pages"
              >
                {language === 'zh-TW' ? 'EN' : 'TW'}
              </button>
            )}
          </div>
          
          {/* 移動端控制按鈕 */}
          <div className="mobile-controls">
            {!isDetailPage ? (
              <button 
                onClick={toggleLanguage} 
                className="language-toggle-mobile"
              >
                {language === 'zh-TW' ? 'EN' : 'TW'}
              </button>
            ) : (
              <button 
                className="language-toggle-mobile disabled"
                disabled
                title="Language cannot be changed on detail pages"
              >
                {language === 'zh-TW' ? 'EN' : 'TW'}
              </button>
            )}
            <button 
              className="hamburger-menu" 
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <span className={`hamburger-icon ${mobileMenuOpen ? 'open' : ''}`}></span>
            </button>
          </div>
        </nav>
        
        {/* 移動端導航菜單 */}
        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <Link 
            to="/" 
            className={`mobile-nav-link ${location.pathname === '/' ? 'active' : ''}`}
            onClick={handleNavClick}
          >
            {t('home')}
          </Link>
          <Link 
            to="/about" 
            className={`mobile-nav-link ${location.pathname === '/about' ? 'active' : ''}`}
            onClick={handleNavClick}
          >
            {t('about')}
          </Link>
          <Link 
            to="/projects" 
            className={`mobile-nav-link ${location.pathname === '/projects' ? 'active' : ''}`}
            onClick={handleNavClick}
          >
            {t('projects')}
          </Link>
          <Link 
            to="/events" 
            className={`mobile-nav-link ${location.pathname === '/events' ? 'active' : ''}`}
            onClick={handleNavClick}
          >
            {t('events')}
          </Link>
          <Link 
            to="/news" 
            className={`mobile-nav-link ${location.pathname === '/news' ? 'active' : ''}`}
            onClick={handleNavClick}
          >
            {t('news')}
          </Link>
          <a 
            href="#contact-section"
            onClick={handleContactClick}
            className="mobile-nav-link"
          >
            {t('contact')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
