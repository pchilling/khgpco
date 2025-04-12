import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../utils/api';
import { getImageUrl, PLACEHOLDER_IMAGE } from '../utils/imageUtils';
import { FiMapPin, FiHome, FiNavigation } from 'react-icons/fi';
import '../styles/LatestProjects.css';

const LatestProjects = () => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const translations = {
        'zh-TW': {
            title: '精選項目',
            loading: '載入中...',
            noProjects: '暫無建案',
            viewAll: '查看更多',
            status: {
                presale: '預售',
                selling: '銷售中',
                sold: '已售完'
            },
            category: {
                residential: '住宅',
                commercial: '商業'
            },
            propertyType: {
                apartment: '公寓',
                house: '獨棟別墅',
                villa: '別墅',
                condo: '社區大樓',
                commercial: '商業空間'
            }
        },
        'en': {
            title: 'Feature Projects',
            loading: 'Loading...',
            noProjects: 'No projects available',
            viewAll: 'View All',
            status: {
                presale: 'Pre-sale',
                selling: 'Selling',
                sold: 'Sold Out'
            },
            category: {
                residential: 'Residential',
                commercial: 'Commercial'
            },
            propertyType: {
                apartment: 'Apartment',
                house: 'House',
                villa: 'Villa',
                condo: 'Condominium',
                commercial: 'Commercial Space'
            }
        }
    };

    const t = translations[language];

    const fetchLatestProjects = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                'sort[0]': 'updatedAt:desc',
                'pagination[limit]': 3,
                'populate': '*',
                'locale': language === 'zh-TW' ? 'zh-Hant-TW' : language
            });

            console.log(`Fetching latest projects with language: ${language === 'zh-TW' ? 'zh-Hant-TW' : language}`);
            console.log(`API URL: ${API_BASE_URL}/api/projects?${queryParams}`);

            const response = await fetch(`${API_BASE_URL}/api/projects?${queryParams}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            console.log('Latest projects data received:', data);
            console.log('Current language:', language);
            console.log('Number of latest projects:', data.data?.length || 0);
            
            setProjects(data.data || []);
        } catch (error) {
            console.error('Error fetching latest projects:', error);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLatestProjects();
    }, [language]);

    const formatLocation = (location) => {
        if (!location) return '';
        const parts = [];
        if (location.country) parts.push(location.country);
        if (location.city) parts.push(location.city);
        return parts.join(' · ');
    };

    return (
        <section className="latest-projects-section">
            <div className="section-header">
                <h2>{t.title}</h2>
                <button 
                    className="view-all-button"
                    onClick={() => navigate('/projects')}
                >
                    {t.viewAll}
                </button>
            </div>
            <div className="latest-projects-container">
                {loading ? (
                    <div className="loading">{t.loading}</div>
                ) : projects.length === 0 ? (
                    <div className="no-projects">{t.noProjects}</div>
                ) : (
                    <div className="projects-grid">
                        {projects.map(project => (
                            <div key={project.id} className="project-card" onClick={() => navigate(`/projects/${project.id}`)}>
                                <div className="project-image">
                                    {project.attributes.projectMedia ? (
                                        <img 
                                            src={getImageUrl(project.attributes.projectMedia)}
                                            alt={project.attributes.name}
                                            onError={(e) => {
                                                const img = e.target;
                                                if (img.src !== PLACEHOLDER_IMAGE) {
                                                    img.src = PLACEHOLDER_IMAGE;
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div className="no-image">No Image</div>
                                    )}
                                    <div className="property-tags">
                                        <span className="tag status">{t.status[project.attributes.status]}</span>
                                        {project.attributes.category?.type && (
                                            <span className="tag category">
                                                {t.category[project.attributes.category.type]}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="project-content">
                                    <h3 className="project-name">{project.attributes.name}</h3>
                                    <p className="project-location">
                                        <FiMapPin className="project-info-icon" />
                                        {formatLocation(project.attributes.location)}
                                    </p>
                                    {project.attributes.location?.address && (
                                        <p className="project-address">
                                            <FiNavigation className="project-info-icon" />
                                            {project.attributes.location.address}
                                        </p>
                                    )}
                                    {project.attributes.propertyType && (
                                        <p className="project-type">
                                            <FiHome className="project-info-icon" />
                                            {t.propertyType[project.attributes.propertyType]}
                                        </p>
                                    )}
                                    <div className="project-price">
                                        {project.attributes.priceRange ? (
                                            <span>
                                                ${Number(project.attributes.priceRange.min_price).toLocaleString()} ~ 
                                                ${Number(project.attributes.priceRange.max_price).toLocaleString()}
                                            </span>
                                        ) : '-'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default LatestProjects; 