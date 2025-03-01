import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Events.css';
import { useLanguage } from '../context/LanguageContext';

const Events = () => {
    const { language } = useLanguage();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const text = {
        'zh-TW': {
            header: '活動資訊',
            subtitle: '探索我們的活動！這裡有過去的精彩回顧和即將到來的活動資訊。',
            loading: '載入中...',
            register: '立即報名',
            maxParticipants: '名額上限',
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
                const response = await fetch('http://localhost:1339/api/events?populate=*');
                const data = await response.json();
                setEvents(data.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching events:', error);
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    const currentText = text[language];

    const formatDateTime = (dateTime) => {
        return new Date(dateTime).toLocaleString(
            language === 'zh-TW' ? 'zh-TW' : 'en-US',
            { 
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }
        );
    };

    // 只顯示第一個 session 的時間
    const getFirstSessionInfo = (sessions) => {
        if (!sessions || sessions.length === 0) return null;
        const firstSession = sessions[0];
        return {
            date: new Date(firstSession.startDateTime).toLocaleDateString(
                language === 'zh-TW' ? 'zh-TW' : 'en-US',
                { month: 'long', day: 'numeric' }
            ),
            location: firstSession.location
        };
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
                    <div className="events-grid">
                        {events?.map((event) => (
                            <div key={event.id} className="event-card" onClick={() => navigate(`/events/${event.id}`)}>
                                {event.attributes.coverImage?.data && (
                                    <div className="event-image">
                                        <img 
                                            src={`http://localhost:1339${event.attributes.coverImage.data[0].attributes.url}`}
                                            alt={event.attributes.title}
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
                                    {event.attributes.session && (
                                        <div className="event-brief-info">
                                            {getFirstSessionInfo(event.attributes.session) && (
                                                <>
                                                    <div className="brief-item">
                                                        <i className="far fa-calendar-alt"></i>
                                                        <span>{getFirstSessionInfo(event.attributes.session).date}</span>
                                                    </div>
                                                    <div className="brief-item">
                                                        <i className="fas fa-map-marker-alt"></i>
                                                        <span>{getFirstSessionInfo(event.attributes.session).location}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    <div className="event-footer">
                                        <span className="event-participants">
                                            <i className="fas fa-users"></i>
                                            {currentText.maxParticipants}: {event.attributes.maxParticipants}
                                        </span>
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
                )}
            </div>
        </div>
    );
};

export default Events; 