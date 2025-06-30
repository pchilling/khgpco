import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import RegistrationModal from '../components/RegistrationModal';
import ImageSlider from '../components/ImageSlider';
import '../styles/EventDetail.css';
import { getImageUrl, getAllImageUrls } from '../utils/imageUtils';
import { API_BASE_URL } from '../utils/api';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

// 將文本配置抽離
const text = {
    'zh-TW': {
        loading: '載入中...',
        register: '立即報名',
        backToEvents: '返回活動列表',
        maxParticipants: '名額上限',
        remainingSpots: '剩餘名額',
        eventDate: '活動日期',
        location: '活動地點',
        sessions: '場次資訊',
        error: '載入失敗，請稍後再試',
        status: {
            upcoming: '即將舉行',
            ongoing: '進行中',
            ended: '已結束'
        },
        details: '專案細節'
    },
    'en': {
        loading: 'Loading...',
        register: 'Register Now',
        backToEvents: 'Back to Events',
        maxParticipants: 'Max Participants',
        remainingSpots: 'Remaining Spots',
        eventDate: 'Event Date',
        location: 'Location',
        sessions: 'Sessions',
        error: 'Failed to load, please try again later',
        status: {
            upcoming: 'Upcoming',
            ongoing: 'Ongoing',
            ended: 'Ended'
        },
        details: 'Project Details'
    }
};

const EventDetail = () => {
    const { id } = useParams();
    const { language } = useLanguage();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSessionIndex, setSelectedSessionIndex] = useState(null);
    const [eventImages, setEventImages] = useState([]);

    const currentText = useMemo(() => text[language], [language]);

    const formatDateTime = useCallback((dateTime) => {
        if (!dateTime) {
            console.error('Invalid date provided to formatDateTime:', dateTime);
            return { formattedDate: '日期未設定', formattedTime: '時間未設定' };
        }
        
        try {
            const date = new Date(dateTime);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date');
            }
            
            // 格式化日期部分
            const dateOptions = { 
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
            };
            
            // 格式化時間部分
            const timeOptions = {
                hour: '2-digit',
                minute: '2-digit',
                hour12: language !== 'zh-TW' // 英文使用 12 小時制，中文使用 24 小時制
            };
            
            const formattedDate = date.toLocaleDateString(
                language === 'zh-TW' ? 'zh-TW' : 'en-US',
                dateOptions
            );
            
            const formattedTime = date.toLocaleTimeString(
                language === 'zh-TW' ? 'zh-TW' : 'en-US',
                timeOptions
            );
            
            return { formattedDate, formattedTime };
        } catch (error) {
            console.error('Error formatting date:', error, dateTime);
            return { formattedDate: '日期格式錯誤', formattedTime: '時間格式錯誤' };
        }
    }, [language]);

    const getRegistrationsForSession = useCallback((sessionIndex) => {
        return event?.attributes?.registrations?.data?.filter(reg => 
            reg.attributes.sessionIndex === sessionIndex
        )?.length || 0;
    }, [event]);

    const handleRegistrationClick = (sessionIndex) => {
        console.log(`Opening registration modal for session index: ${sessionIndex}`);
        setSelectedSessionIndex(sessionIndex);
        setIsModalOpen(true);
    };

    const handleRegistrationSuccess = () => {
        // 延遲 2 秒後再重新獲取活動資料
        setTimeout(() => {
            fetchEvent();
        }, 2000);
    };

    const fetchEvent = useCallback(async () => {
        setLoading(true);
        try {
            const locale = language === 'zh-TW' ? 'zh-Hant-TW' : language;
            console.log(`Fetching event with ID: ${id} and language: ${locale}`);
            console.log(`API URL: ${API_BASE_URL}/api/events/${id}?populate=*&locale=${locale}`);
            
            const response = await fetch(
                `${API_BASE_URL}/api/events/${id}?populate=*&locale=${locale}`,
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
            console.log('Event data received:', data);
            
            if (data && data.data) {
                setEvent(data.data);
                
                // 獲取活動的所有圖片
                if (data.data.attributes.coverImage?.data) {
                    const imageUrls = getAllImageUrls(data.data.attributes.coverImage);
                    setEventImages(imageUrls);
                    console.log('All image URLs:', imageUrls);
                }
            } else {
                setError('No event data found');
            }
        } catch (error) {
            console.error('Error fetching event:', error);
            setError(error.message || 'Failed to load event');
        } finally {
            setLoading(false);
        }
    }, [id, language]);

    useEffect(() => {
        fetchEvent();
    }, [fetchEvent]);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>{currentText.loading}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <p className="error-message">{currentText.error}</p>
                <button onClick={() => window.location.reload()} className="retry-button">
                    重試
                </button>
            </div>
        );
    }

    if (!event) {
        console.error('Event data is null or undefined');
        return (
            <div className="error-container">
                <p className="error-message">無法載入活動資訊</p>
                <button onClick={() => window.location.reload()} className="retry-button">
                    重試
                </button>
            </div>
        );
    }

    // 添加數據驗證和調試
    console.log('Rendering event:', event);
    console.log('Event attributes:', event.attributes);
    
    // 檢查所有可能的場次欄位名稱
    const sessionData = event.attributes.session || event.attributes.sessions || event.attributes.sessionInfo || [];
    console.log('Event sessions:', sessionData);
    console.log('Event coverImage:', event.attributes.coverImage);

    // 假設 accompaniedCount 取值為 accompanied0 ~ accompanied5
    const options = [
        { value: 'accompanied0', label: '0人' },
        { value: 'accompanied1', label: '1人' },
        { value: 'accompanied2', label: '2人' },
        { value: 'accompanied3', label: '3人' },
        { value: 'accompanied4', label: '4人' },
        { value: 'accompanied5', label: '5人' },
    ];

    return (
        <div className="event-detail-page">
            {/* 圖片區域移至最頂部並簡化結構 */}
            <div className="event-image-area">
                {eventImages.length > 0 ? (
                    <ImageSlider 
                        images={eventImages} 
                        fullWidth={true} 
                    />
                ) : event.attributes.coverImage?.data && (
                    <img 
                        src={getImageUrl(event.attributes.coverImage)}
                        alt={event.attributes.title}
                        loading="lazy"
                        className="full-width-image"
                        onError={(e) => {
                            console.error('Image failed to load:', e);
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/380x380?text=No+Image';
                        }}
                    />
                )}
            </div>

            {/* 內容區域 */}
            <div className="event-content-area">
                <div className="header-content-container">
                    <div className="header-content">
                        <span className={`event-status ${event.attributes.status}`}>
                            {currentText.status[event.attributes.status]}
                        </span>
                        <h1>{event.attributes.title}</h1>
                        <p className="event-description">{event.attributes.description}</p>
                    </div>
                </div>

                {/* 場次資訊 */}
                {sessionData && sessionData.length > 0 ? (
                    <div className="event-sessions">
                        <h2>{currentText.sessions}</h2>
                        <div className="sessions-grid">
                            {sessionData.map((session, index) => {
                                const registrations = getRegistrationsForSession(index);
                                const maxParticipants = session.maxParticipants || 0;
                                const remainingSpots = Math.max(0, maxParticipants - registrations);
                                const isDisabled = remainingSpots === 0 || event.attributes.status === 'ended';
                                
                                // 確保日期時間存在並格式化
                                let formattedDate = '日期未設定';
                                let formattedTime = '時間未設定';
                                
                                // 檢查所有可能的日期時間欄位
                                const dateTimeField = session.datetime || session.startDateTime || session.date || session.eventDate;
                                
                                if (dateTimeField) {
                                    const dateTimeResult = formatDateTime(dateTimeField);
                                    formattedDate = dateTimeResult.formattedDate;
                                    formattedTime = dateTimeResult.formattedTime;
                                }
                                
                                // 檢查所有可能的地點欄位
                                const locationField = session.location || session.venue || session.place || '';
                                
                                return (
                                    <div key={index} className="session-card">
                                        <div>
                                            <div className="session-time">
                                                <div className="session-datetime">
                                                    <div className="session-date">{formattedDate}</div>
                                                    <div className="session-time-value">{formattedTime}</div>
                                                </div>
                                            </div>
                                            <div className="session-location">
                                                <div>{locationField}</div>
                                            </div>
                                            <div className="capacity-info">
                                                <div className="max-participants">
                                                    <i className="fas fa-users"></i>
                                                    {currentText.maxParticipants}: {maxParticipants}
                                                </div>
                                                <div className="remaining">
                                                    {currentText.remainingSpots}: {remainingSpots}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="event-actions">
                                            <button 
                                                className={`register-button ${isDisabled ? 'disabled' : ''}`}
                                                disabled={isDisabled}
                                                onClick={() => handleRegistrationClick(index)}
                                            >
                                                {currentText.register}
                                            </button>
                                            
                                            {event.attributes.eventlink && (
                                                <a 
                                                    href={event.attributes.eventlink}
                                                    className="details-button"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {currentText.details}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="no-sessions">
                        <p>此活動尚未設置場次資訊</p>
                    </div>
                )}
            </div>

            <RegistrationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                eventId={id}
                sessionIndex={selectedSessionIndex}
                onSuccess={handleRegistrationSuccess}
            />
        </div>
    );
};

export default EventDetail; 