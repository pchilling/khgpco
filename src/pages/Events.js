import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Events.css';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../utils/api';
import { getImageUrl } from '../utils/imageUtils';

const Events = () => {
    const { language } = useLanguage();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleEvents, setVisibleEvents] = useState(3); // 初始顯示3個活動
    const [hasMore, setHasMore] = useState(true); // 是否還有更多活動可以加載

    // 设置 HTML 元素的 lang 属性
    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    const text = {
        'zh-TW': {
            header: '活動資訊',
            subtitle: '探索我們的活動！這裡有過去的精彩回顧和即將到來的活動資訊。',
            loading: '載入中...',
            register: '立即報名',
            maxParticipants: '名額上限',
            showMore: '顯示更多',
            noMoreEvents: '沒有更多活動了',
            status: {
                upcoming: '即將舉行',
                ongoing: '進行中',
                ended: '已結束'
            }
        },
        'en': {
            header: 'Events',
            subtitle: 'Explore our events! Here are past highlights and upcoming events.',
            loading: 'Loading...',
            register: 'Register Now',
            maxParticipants: 'Max Participants',
            showMore: 'Show More',
            noMoreEvents: 'No more events',
            status: {
                upcoming: 'Upcoming',
                ongoing: 'Ongoing',
                ended: 'Ended'
            }
        }
    };

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const locale = language === 'zh-TW' ? 'zh-Hant-TW' : language;
                console.log(`Fetching events from ${API_BASE_URL}/api/events?populate=*&sort[0]=createdAt:desc&locale=${locale}`);
                
                const response = await fetch(
                    `${API_BASE_URL}/api/events?populate=*&sort[0]=createdAt:desc&locale=${locale}`,
                    {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Events data received:', data);
                
                if (data && data.data) {
                    setEvents(data.data);
                    setHasMore(data.data.length > visibleEvents);
                } else {
                    console.error('Invalid response format:', data);
                }
            } catch (error) {
                console.error('Error fetching events:', error);
                if (error.response) {
                    console.error('Server error details:', {
                        status: error.response.status,
                        data: error.response.data
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, [language, visibleEvents]);

    const currentText = text[language];

    // 格式化日期時間
    const formatDateTime = (dateTime) => {
        return new Date(dateTime).toLocaleString(
            language === 'zh-TW' ? 'zh-TW' : 'en-US',
            { 
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: language !== 'zh-TW' // 英文使用 12 小時制，中文使用 24 小時制
            }
        );
    };

    // 格式化所有場次信息
    const getAllSessionsInfo = (sessions) => {
        if (!sessions || sessions.length === 0) return [];
        
        return sessions.map(session => {
            const date = new Date(session.startDateTime);
            
            // 格式化日期
            const formattedDate = date.toLocaleDateString(
                language === 'zh-TW' ? 'zh-TW' : 'en-US',
                { 
                    month: 'short', 
                    day: 'numeric', 
                    weekday: 'short',
                    year: 'numeric' // 添加年份顯示
                }
            );
            
            return {
                date: formattedDate,
                location: session.location
            };
        });
    };

    // 處理「顯示更多」按鈕點擊
    const handleShowMore = () => {
        // 每次增加3個活動
        const newVisibleEvents = visibleEvents + 3;
        setVisibleEvents(newVisibleEvents);
        
        // 檢查是否還有更多活動可以加載
        setHasMore(events.length > newVisibleEvents);
    };

    return (
        <div className="events-page">
            <div className="events-header">
                <h1>{currentText.header}</h1>
                <p>{currentText.subtitle}</p>
            </div>
            <div className="events-list">
                {loading ? (
                    <div className="loading">{currentText.loading}</div>
                ) : (
                    <div className="events-container">
                        <div className="events-grid">
                            {events?.slice(0, visibleEvents).map((event) => (
                                <div key={event.id} className="event-card" onClick={() => navigate(`/events/${event.id}`)}>
                                    {event.attributes.coverImage?.data && (
                                        <div className="event-image">
                                            <img 
                                                src={getImageUrl(event.attributes.coverImage)}
                                                alt={event.attributes.title}
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = 'https://placehold.co/400x300?text=No+Image';
                                                }}
                                            />
                                        </div>
                                    )}
                                    <div className="event-content">
                                        <span className={`event-status ${event.attributes.status}`}>
                                            {currentText.status[event.attributes.status]}
                                        </span>
                                        <h2>{event.attributes.title}</h2>
                                        <p className="event-description">
                                            {event.attributes.description}
                                        </p>
                                        {event.attributes.session && event.attributes.session.length > 0 && (
                                            <div className="event-brief-info">
                                                <div className="sessions-list">
                                                    {getAllSessionsInfo(event.attributes.session).map((session, index) => (
                                                        <div key={index} className="session-item">
                                                            <div className="brief-item">
                                                                <i className="far fa-calendar-alt"></i>
                                                                <span>{session.date}</span>
                                                            </div>
                                                            <div className="brief-item">
                                                                <i className="fas fa-map-marker-alt"></i>
                                                                <span>{session.location}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="event-footer">
                                            <button 
                                                className="register-button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/events/${event.id}`);
                                                }}
                                            >
                                                {currentText.register}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* 顯示更多按鈕 */}
                        {events.length > 0 && (
                            <div className="show-more-container">
                                {hasMore ? (
                                    <button className="show-more-button" onClick={handleShowMore}>
                                        {currentText.showMore}
                                    </button>
                                ) : (
                                    <p className="no-more-events">{currentText.noMoreEvents}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Events; 