import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Projects.css';

const Projects = () => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const translations = {
        'zh-TW': {
            title: '精選建案',
            subtitle: '為您精選最優質的房地產項目',
            filters: {
                all: '所有建案',
                villa: '別墅',
                apartment: '公寓',
                office: '辦公室'
            },
            forSale: '待售',
            forRent: '出租',
            featured: '精選',
            month: '/月',
            viewMore: '查看更多',
            seeAll: '查看全部'
        },
        'en': {
            title: 'Featured Properties',
            subtitle: 'Discover our selection of premium real estate properties',
            filters: {
                all: 'All Properties',
                villa: 'Villa',
                apartment: 'Apartments',
                office: 'Office'
            },
            forSale: 'FOR SALE',
            forRent: 'FOR RENT',
            featured: 'FEATURED',
            month: '/month',
            viewMore: 'View More',
            seeAll: 'See All Listing'
        }
    };

    const t = translations[language];

    useEffect(() => {
        fetch('http://localhost:1339/api/projects?populate=*')
            .then(res => res.json())
            .then(data => {
                setProjects(data.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching projects:', error);
                setLoading(false);
            });
    }, []);

    const formatLocation = (location) => {
        if (!location) return '';
        return `${location.address}, ${location.city}`;
    };

    return (
        <div className="projects-page">
            <div className="projects-header">
                <h1>{t.title}</h1>
                <p>{t.subtitle}</p>
            </div>
            <div className="filter-container">
                <div className="filter-tabs">
                    {Object.entries(t.filters).map(([key, value]) => (
                        <button
                            key={key}
                            className={`filter-tab ${filter === key ? 'active' : ''}`}
                            onClick={() => setFilter(key)}
                        >
                            {value}
                        </button>
                    ))}
                </div>
            </div>
            <div className="projects-grid">
                {loading ? (
                    <div className="loading">{t.loading}</div>
                ) : (
                    projects.map(project => (
                        <div key={project.id} className="project-card" onClick={() => navigate(`/projects/${project.id}`)}>
                            <div className="project-image">
                                {project.attributes.projectMedia?.data?.[0]?.attributes?.url ? (
                                    <img 
                                        src={`http://localhost:1339${project.attributes.projectMedia.data[0].attributes.url}`}
                                        alt={project.attributes.name}
                                    />
                                ) : (
                                    <div className="no-image">No Image</div>
                                )}
                                <div className="property-tags">
                                    {project.attributes.status === 'sale' && (
                                        <span className="tag sale">{t.forSale}</span>
                                    )}
                                    {project.attributes.status === 'rent' && (
                                        <span className="tag rent">{t.forRent}</span>
                                    )}
                                    {project.attributes.featured && (
                                        <span className="tag featured">{t.featured}</span>
                                    )}
                                </div>
                            </div>
                            <div className="project-content">
                                <h2 className="project-name">{project.attributes.name}</h2>
                                <p className="project-location">{formatLocation(project.attributes.location)}</p>
                                <div className="project-features">
                                    <span><i className="fas fa-bed"></i> {project.attributes.bedrooms}</span>
                                    <span><i className="fas fa-bath"></i> {project.attributes.bathrooms}</span>
                                    <span><i className="fas fa-vector-square"></i> {project.attributes.area} m²</span>
                                </div>
                                <div className="project-price">
                                    {project.attributes.status === 'rent' 
                                        ? `$${project.attributes.price}${t.month}`
                                        : `$${project.attributes.price}`
                                    }
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="see-all-button">
                <button onClick={() => navigate('/projects')}>{t.seeAll}</button>
            </div>
        </div>
    );
};

export default Projects; 