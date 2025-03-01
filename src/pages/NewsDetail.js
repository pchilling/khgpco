import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import '../styles/NewsDetail.css';
import KHGreen from '../assets/KHGreen.png';  // 導入 logo

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
            },
            companyInfo: {
                name: '寬鑫國際置業有限公司',
                phone: '04-3702-1316',
                address: '台中市西區台灣大道二段489號31F3106'
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
            },
            companyInfo: {
                name: 'KH Global International Property Ltd.',
                phone: '04-3702-1316',
                address: '31F-3106, No.489, Sec. 2, Taiwan Blvd., West Dist., Taichung City'
            }
        }
    };

    const t = translations[language];

    useEffect(() => {
        const fetchNewsDetail = async () => {
            try {
                const response = await fetch(`http://localhost:1339/api/news/${id}?populate=*`);
                const data = await response.json();
                console.log('News detail data:', data.data);
                setNews(data.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching news:', error);
                setError(error);
                setLoading(false);
            }
        };

        fetchNewsDetail();
    }, [id]);

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
                        {t.publishedOn} {new Date(news.attributes.publishDate).toLocaleDateString()}
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
                        src={`http://localhost:1339${news.attributes.coverImage.data[0].attributes.url}`}
                        alt={news.attributes.title}
                    />
                </div>
            )}

            <div className="news-detail-content">
                <div className="news-content">
                    {renderBlocks(news.attributes.content)}
                </div>
            </div>
            <div className="company-info">
                <img src={KHGreen} alt="Company Logo" className="company-info-logo" />
                <div className="company-info-content">
                    <p><i className="fas fa-building"></i>{t.companyInfo.name}</p>
                    <p><i className="fas fa-phone"></i>Tel: {t.companyInfo.phone}</p>
                    <p><i className="fas fa-map-marker-alt"></i>{t.companyInfo.address}</p>
                </div>
            </div>
        </div>
    );
};

export default NewsDetail; 