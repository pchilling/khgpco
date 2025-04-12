import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/News.css';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';
import { getImageUrl, PLACEHOLDER_IMAGE } from '../utils/imageUtils';

const News = () => {
    const { language } = useLanguage();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeCategory, setActiveCategory] = useState('all');
    const [filteredNews, setFilteredNews] = useState([]);
    const newsPerPage = 9;
    const navigate = useNavigate();

    const translations = {
        'zh-TW': {
            title: '市場新聞',
            subtitle: '探索最新的市場動態和公司資訊',
            loading: '載入中...',
            error: '載入失敗，請稍後再試',
            noNews: '目前沒有新聞',
            all: '全部',
            pagination: {
                prev: '上一頁',
                next: '下一頁',
                page: '頁'
            },
            categories: {
                all: '全部',
                market_news: '市場新聞',
                company_news: '公司新聞',
                market_analysis: '市場分析'
            }
        },
        'en': {
            title: 'Market News',
            subtitle: 'Explore the latest market trends and company information',
            loading: 'Loading...',
            error: 'Failed to load news',
            noNews: 'No news available',
            all: 'All',
            pagination: {
                prev: 'Previous',
                next: 'Next',
                page: 'Page'
            },
            categories: {
                all: 'All',
                market_news: 'Market News',
                company_news: 'Company News',
                market_analysis: 'Market Analysis'
            }
        }
    };

    const t = translations[language];

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const locale = language === 'zh-TW' ? 'zh-Hant-TW' : language;
                const response = await fetch(`${API_BASE_URL}/api/news?populate=*&sort[0]=publishDate:desc&locale=${locale}`, {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();
                console.log('News data:', data.data);
                console.log('Current language:', language);
                console.log('API URL:', `${API_BASE_URL}/api/news?populate=*&sort[0]=publishDate:desc&locale=${locale}`);
                
                if (data.data) {
                    setNews(data.data);
                    setFilteredNews(data.data);
                } else {
                    setNews([]);
                    setFilteredNews([]);
                }
                setLoading(false);
            } catch (error) {
                console.error('Error details:', error);
                setError(error);
                setLoading(false);
            }
        };

        fetchNews();
    }, [language]);

    // 過濾新聞
    const filterNews = (category) => {
        setActiveCategory(category);
        setCurrentPage(1); // 重置到第一頁
        
        if (category === 'all') {
            setFilteredNews(news);
        } else {
            const filtered = news.filter(item => item.attributes.category === category);
            setFilteredNews(filtered);
        }
    };

    // 計算總頁數
    const totalPages = Math.ceil(filteredNews.length / newsPerPage);

    // 獲取當前頁的新聞
    const getCurrentPageNews = () => {
        const indexOfLastNews = currentPage * newsPerPage;
        const indexOfFirstNews = indexOfLastNews - newsPerPage;
        return filteredNews.slice(indexOfFirstNews, indexOfLastNews);
    };

    // 頁碼變更
    const paginate = (pageNumber) => {
        if (pageNumber > 0 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
            window.scrollTo(0, 0);
        }
    };

    // 生成頁碼
    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxPageNumbersToShow = 5;
        
        if (totalPages <= maxPageNumbersToShow) {
            // 如果總頁數小於等於要顯示的最大頁碼數，則顯示所有頁碼
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            // 否則，顯示當前頁附近的頁碼
            let startPage = Math.max(1, currentPage - Math.floor(maxPageNumbersToShow / 2));
            let endPage = startPage + maxPageNumbersToShow - 1;
            
            if (endPage > totalPages) {
                endPage = totalPages;
                startPage = Math.max(1, endPage - maxPageNumbersToShow + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(i);
            }
        }
        
        return pageNumbers;
    };

    // 添加日期格式化函數
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(
            language === 'zh-TW' ? 'zh-TW' : 'en-US',
            { 
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }
        );
    };

    return (
        <div className="news-page">
            <div className="news-header">
                <h1>{t.title}</h1>
                <p>{t.subtitle}</p>
            </div>

            {loading ? (
                <div className="loading">{t.loading}</div>
            ) : error ? (
                <div className="error-message">{t.error}</div>
            ) : !news || news.length === 0 ? (
                <div className="no-news">{t.noNews}</div>
            ) : (
                <div className="news-container">
                    {/* 分類標籤 */}
                    <div className="news-categories">
                        <button 
                            className={`category-tag ${activeCategory === 'all' ? 'active' : ''}`}
                            onClick={() => filterNews('all')}
                        >
                            {t.categories.all}
                        </button>
                        <button 
                            className={`category-tag ${activeCategory === 'market_news' ? 'active' : ''}`}
                            onClick={() => filterNews('market_news')}
                        >
                            {t.categories.market_news}
                        </button>
                        <button 
                            className={`category-tag ${activeCategory === 'company_news' ? 'active' : ''}`}
                            onClick={() => filterNews('company_news')}
                        >
                            {t.categories.company_news}
                        </button>
                        <button 
                            className={`category-tag ${activeCategory === 'market_analysis' ? 'active' : ''}`}
                            onClick={() => filterNews('market_analysis')}
                        >
                            {t.categories.market_analysis}
                        </button>
                    </div>

                    <div className="news-grid">
                        {getCurrentPageNews().map((item) => (
                            <div key={item.id} className="news-card" onClick={() => navigate(`/news/${item.id}`)}>
                                <span className="news-category">
                                    {t.categories[item.attributes.category] || item.attributes.category}
                                </span>
                                <div className="news-image">
                                    {item.attributes.coverImage?.data?.[0]?.attributes?.url ? (
                                        <img 
                                            src={getImageUrl(item.attributes.coverImage)}
                                            alt={item.attributes.title}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = PLACEHOLDER_IMAGE;
                                            }}
                                        />
                                    ) : (
                                        <div className="no-image">No Image</div>
                                    )}
                                </div>
                                <div className="news-content">
                                    <h2>{item.attributes.title}</h2>
                                    <p className="news-excerpt">{item.attributes.excerpt}</p>
                                    <div className="news-meta">
                                        <span className="news-date">
                                            <i className="far fa-calendar-alt"></i>
                                            {formatDate(item.attributes.publishDate)}
                                        </span>
                                        <span className="news-author">
                                            <i className="far fa-user"></i>
                                            {item.attributes.author}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 分頁 */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button 
                                className="pagination-button prev"
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                {t.pagination.prev}
                            </button>
                            
                            {getPageNumbers().map(number => (
                                <button
                                    key={number}
                                    className={`pagination-button ${currentPage === number ? 'active' : ''}`}
                                    onClick={() => paginate(number)}
                                >
                                    {number}
                                </button>
                            ))}
                            
                            <button 
                                className="pagination-button next"
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                {t.pagination.next}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default News;
