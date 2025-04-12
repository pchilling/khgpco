import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import RegistrationModal from '../components/RegistrationModal';
import '../styles/EventDetail.css';
import { getImageUrl } from '../utils/imageUtils';
import { API_BASE_URL } from '../utils/api';

// 將文本配置抽離
const text = {
    'zh-TW': {
        loading: '載入中...',
        register: '立即報名',
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
        }
    },
    'en': {
        loading: 'Loading...',
        register: 'Register Now',
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
        }
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

    const currentText = useMemo(() => text[language], [language]);

    const formatDateTime = useCallback((dateTime) => {
        const date = new Date(dateTime);
        
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
        // Refresh the event data to update registration counts
        fetchEvent();
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
    console.log('Event sessions:', event.attributes.session);
    console.log('Event coverImage:', event.attributes.coverImage);

    return (
        <div className="event-detail-page">
            <div className="event-detail-header">
                <div className="header-image">
                    {event.attributes.coverImage?.data && (
                        <img 
                            src={getImageUrl(event.attributes.coverImage)}
                            alt={event.attributes.title}
                            loading="lazy"
                            onError={(e) => {
                                console.error('Image failed to load:', e);
                                e.target.onerror = null;
                                e.target.src = 'https://placehold.co/800x400?text=No+Image';
                            }}
                        />
                    )}
                </div>
                <div className="header-content">
                    <span className={`event-status ${event.attributes.status}`}>
                        {currentText.status[event.attributes.status]}
                    </span>
                    <h1>{event.attributes.title}</h1>
                    <p className="event-description">{event.attributes.description}</p>
                </div>
            </div>

            {/* 檢查 session 是否存在 */}
            {event.attributes.session && event.attributes.session.length > 0 ? (
                <div className="event-sessions">
                    <h2 className="section-title">{currentText.sessions}</h2>
                    <div className="sessions-grid">
                        {event.attributes.session.map((session, index) => {
                            const registrations = getRegistrationsForSession(index);
                            const isDisabled = event.attributes.status === 'ended' || 
                                            session.maxParticipants <= registrations;
                            
                            return (
                                <div key={index} className="session-card">
                                    <div className="session-header">
                                        <div className="session-time">
                                            <i className="far fa-calendar-alt"></i>
                                            <div className="time-details">
                                                <span className="session-date">{formatDateTime(session.startDateTime).formattedDate}</span>
                                                <div className="session-time-range">
                                                    <span>{formatDateTime(session.startDateTime).formattedTime}</span>
                                                    <span> - </span>
                                                    <span>{formatDateTime(session.endDateTime).formattedTime}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="session-location">
                                            <i className="fas fa-map-marker-alt"></i>
                                            <span>{session.location}</span>
                                        </div>
                                    </div>
                                    <button 
                                        className={`register-button ${isDisabled ? 'disabled' : ''}`}
                                        disabled={isDisabled}
                                        onClick={() => handleRegistrationClick(index)}
                                    >
                                        {currentText.register}
                                    </button>
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