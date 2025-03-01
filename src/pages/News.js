import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/News.css';
import { useNavigate } from 'react-router-dom';

const News = () => {
    const { language } = useLanguage();
    const [news, setNews] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const translations = {
        'zh-TW': {
            title: '市場新聞',
            loading: '載入中...',
            error: '載入失敗，請稍後再試',
            noNews: '目前沒有新聞',
            categories: {
                market_news: '市場新聞',
                company_news: '公司新聞',
                market_analysis: '市場分析'
            }
        },
        'en': {
            title: 'Market News',
            loading: 'Loading...',
            error: 'Failed to load news',
            noNews: 'No news available',
            categories: {
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
                const response = await fetch(`http://localhost:1339/api/news?populate=*`, {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();
                console.log('News category:', data.data[0]?.attributes?.category);
                if (data.data) {
                    setNews(data.data);
                } else {
                    setNews([]);
                }
                setLoading(false);
            } catch (error) {
                console.error('Error details:', error);
                setError(error);
                setLoading(false);
            }
        };

        fetchNews();
    }, []);

    const renderBlocks = (blocks) => {
        if (!blocks) return null;
        
        return blocks.map((block, index) => {
            switch (block.type) {
                case 'paragraph':
                    return <p key={index}>{block.children[0].text}</p>;
                case 'heading':
                    const HeadingTag = `h${block.level}`;
                    return <HeadingTag key={index}>{block.children[0].text}</HeadingTag>;
                case 'list':
                    const ListTag = block.format === 'ordered' ? 'ol' : 'ul';
                    return (
                        <ListTag key={index}>
                            {block.children.map((item, i) => (
                                <li key={i}>{item.children[0].text}</li>
                            ))}
                        </ListTag>
                    );
                default:
                    return null;
            }
        });
    };

    return (
        <div className="news-page">
            <div className="news-header">
                <h1>{t.title}</h1>
            </div>

            {loading ? (
                <div className="loading">{t.loading}</div>
            ) : error ? (
                <div className="error-message">{t.error}</div>
            ) : !news || news.length === 0 ? (
                <div className="no-news">{t.noNews}</div>
            ) : (
                <div className="news-grid">
                    {news.map((item) => (
                        <div key={item.id} className="news-card" onClick={() => navigate(`/news/${item.id}`)}>
                            <div className="news-image">
                                {item.attributes.coverImage?.data?.[0]?.attributes?.url ? (
                                    <img 
                                        src={`http://localhost:1339${item.attributes.coverImage.data[0].attributes.url}`}
                                        alt={item.attributes.title}
                                    />
                                ) : (
                                    <div className="no-image">No Image</div>
                                )}
                            </div>
                            <div className="news-content">
                                <span className="news-category">
                                    {t.categories[item.attributes.category] || item.attributes.category}
                                </span>
                                <h2>{item.attributes.title}</h2>
                                <p className="news-excerpt">{item.attributes.excerpt}</p>
                                <div className="news-meta">
                                    <span className="news-date">
                                        <i className="far fa-calendar-alt"></i>
                                        {new Date(item.attributes.publishDate).toLocaleDateString()}
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
            )}
        </div>
    );
};

export default News;
