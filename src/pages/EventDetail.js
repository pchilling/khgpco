import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import '../styles/EventDetail.css';

const EventDetail = () => {
    const { id } = useParams();
    const { language } = useLanguage();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    const text = {
        'zh-TW': {
            loading: '載入中...',
            register: '立即報名',
            maxParticipants: '名額上限',
            remainingSpots: '剩餘名額',
            eventDate: '活動日期',
            location: '活動地點',
            sessions: '場次資訊',
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
            status: {
                upcoming: 'Upcoming',
                ongoing: 'Ongoing',
                ended: 'Ended'
            }
        }
    };

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const response = await fetch(`http://localhost:1339/api/events/${id}?populate=*`);
                const data = await response.json();
                setEvent(data.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching event:', error);
                setLoading(false);
            }
        };

        fetchEvent();
    }, [id]);

    const formatDateTime = (dateTime) => {
        return new Date(dateTime).toLocaleString(
            language === 'zh-TW' ? 'zh-TW' : 'en-US',
            { 
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }
        );
    };

    const currentText = text[language];

    if (loading) return <div className="loading">{currentText.loading}</div>;
    if (!event) return null;

    return (
        <div className="event-detail-page">
            <div className="event-detail-header">
                <div className="header-image">
                    {event.attributes.coverImage?.data && (
                        <img 
                            src={`http://localhost:1339${event.attributes.coverImage.data[0].attributes.url}`}
                            alt={event.attributes.title}
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

            <div className="event-detail-content">
                <div className="event-sessions">
                    <h2>{currentText.sessions}</h2>
                    <div className="sessions-grid">
                        {event.attributes.session?.map((session, index) => (
                            <div key={index} className="session-card">
                                <div className="session-header">
                                    <div className="session-time">
                                        <i className="far fa-calendar-alt"></i>
                                        <div className="time-details">
                                            <span>{formatDateTime(session.startDateTime)}</span>
                                            <span>-</span>
                                            <span>{formatDateTime(session.endDateTime)}</span>
                                        </div>
                                    </div>
                                    <div className="session-location">
                                        <i className="fas fa-map-marker-alt"></i>
                                        <span>{session.location}</span>
                                    </div>
                                </div>
                                <div className="session-footer">
                                    <div className="capacity-info">
                                        <span className="max-participants">
                                            <i className="fas fa-users"></i>
                                            {currentText.maxParticipants}: {event.attributes.maxParticipants}
                                        </span>
                                        <span className="remaining">
                                            {currentText.remainingSpots}: {
                                                event.attributes.maxParticipants - (event.attributes.registrations?.length || 0)
                                            }
                                        </span>
                                    </div>
                                    <button 
                                        className={`register-button ${event.attributes.status === 'ended' ? 'disabled' : ''}`}
                                        disabled={event.attributes.status === 'ended'}
                                    >
                                        {currentText.register}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetail; 