import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import '../styles/NewsDetail.css';
import KHGreen from '../assets/KHGreen.png';  // 導入 logo
import { API_BASE_URL } from '../utils/api';
import { getImageUrl, PLACEHOLDER_IMAGE } from '../utils/imageUtils';  // 添加 PLACEHOLDER_IMAGE 導入
import CompanyInfo from '../components/CompanyInfo';

const NewsDetail = () => {
    const { id } = useParams();
    const { language } = useLanguage();
    const [news, setNews] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const translations = {
        'zh-TW': {
            loading: '載入中...',
            error: '載入失敗，請稍後再試',
            publishedOn: '發布於',
            author: '作者',
            category: {
                market_news: '市場新聞',
                company_news: '公司新聞',
                market_analysis: '市場分析'
            }
        },
        'en': {
            loading: 'Loading...',
            error: 'Failed to load news',
            publishedOn: 'Published on',
            author: 'Author',
            category: {
                market_news: 'Market News',
                company_news: 'Company News',
                market_analysis: 'Market Analysis'
            }
        }
    };

    const t = translations[language];

    useEffect(() => {
        const fetchNewsDetail = async () => {
            setLoading(true);
            try {
                const locale = language === 'zh-TW' ? 'zh-Hant-TW' : language;
                console.log(`Fetching news with ID: ${id} and language: ${locale}`);
                console.log(`API URL: ${API_BASE_URL}/api/news/${id}?populate=*&locale=${locale}`);
                
                const response = await fetch(`${API_BASE_URL}/api/news/${id}?populate=*&locale=${locale}`);
                const data = await response.json();
                console.log('News detail data:', data.data);
                console.log('Current language:', language);
                
                setNews(data.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching news:', error);
                setError(error);
                setLoading(false);
            }
        };

        fetchNewsDetail();
    }, [id, language]);

    const renderBlocks = (blocks) => {
        if (!blocks) return null;
        
        return blocks.map((block, index) => {
            switch (block.type) {
                case 'paragraph':
                    return <p key={index}>{block.children.map((child, i) => {
                        if (child.bold) {
                            return <strong key={i}>{child.text}</strong>;
                        }
                        if (child.italic) {
                            return <em key={i}>{child.text}</em>;
                        }
                        return child.text;
                    })}</p>;
                    
                case 'heading':
                    // 支持所有標題層級 (h1 到 h6)
                    const level = Math.min(Math.max(block.level, 1), 6);
                    const HeadingTag = `h${level}`;
                    return <HeadingTag key={index} className={`heading-${level}`}>
                        {block.children.map((child, i) => child.text).join('')}
                    </HeadingTag>;
                    
                case 'list':
                    const ListTag = block.format === 'ordered' ? 'ol' : 'ul';
                    return (
                        <ListTag key={index}>
                            {block.children.map((item, i) => (
                                <li key={i}>
                                    {item.children.map((child, j) => {
                                        if (child.bold) {
                                            return <strong key={j}>{child.text}</strong>;
                                        }
                                        if (child.italic) {
                                            return <em key={j}>{child.text}</em>;
                                        }
                                        return child.text;
                                    })}
                                </li>
                            ))}
                        </ListTag>
                    );
                    
                default:
                    console.log('Unhandled block type:', block.type);
                    return null;
            }
        });
    };

    // 添加日期格式化函數
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(
            language === 'zh-TW' ? 'zh-TW' : 'en-US',
            { 
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: language === 'zh-TW' ? undefined : 'long' // 英文顯示星期
            }
        );
    };

    if (loading) return <div className="loading">{t.loading}</div>;
    if (error) return <div className="error">{t.error}</div>;
    if (!news) return null;

    return (
        <div className="news-detail-page">
            <div className="news-detail-header">
                <h1>{news.attributes.title}</h1>
                <div className="news-meta">
                    <div className="news-category">
                        {t.category[news.attributes.category]}
                    </div>
                    <span className="news-date">
                        <i className="far fa-calendar-alt"></i>
                        {t.publishedOn} {formatDate(news.attributes.publishDate)}
                    </span>
                    <span className="news-author">
                        <i className="far fa-user"></i>
                        {t.author}: {news.attributes.author}
                    </span>
                </div>
            </div>

            {news.attributes.coverImage?.data?.[0]?.attributes?.url && (
                <div className="news-detail-image">
                    <img 
                        src={getImageUrl(news.attributes.coverImage)}
                        alt={news.attributes.title}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = PLACEHOLDER_IMAGE;
                        }}
                    />
                </div>
            )}

            <div className="news-detail-content">
                <div className="news-content">
                    {renderBlocks(news.attributes.content)}
                </div>
            </div>
            
            <div className="news-detail-container">
                <CompanyInfo />
            </div>
        </div>
    );
};

export default NewsDetail; 