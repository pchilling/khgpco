import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import '../styles/ProjectDetail.css';

const ProjectDetail = () => {
    const { id } = useParams();
    const { language } = useLanguage();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const translations = {
        'zh-TW': {
            loading: '載入中...',
            name: '建案名稱',
            developer: '開發商',
            totalFloor: '總樓層',
            price: '價格',
            status: {
                presale: '預售',
                selling: '銷售中',
                secondhand: '二手',
                sold: '已售完'
            },
            location: {
                title: '位置資訊',
                region: '區域',
                country: '國家',
                city: '城市',
                address: '地址'
            },
            category: {
                title: '建案類型',
                type: {
                    residential: '住宅',
                    commercial: '商業'
                },
                targetAudience: {
                    investment: '投資客',
                    'self-living': '自住',
                    enterprise: '企業'
                },
                paymentOptions: {
                    mortgage: '房貸',
                    installment: '分期付款'
                },
                features: {
                    environment: '環境特色',
                    architectural: '建築特色'
                }
            },
            buildings: {
                title: '建築資訊',
                name: '建築名稱',
                floors: '樓層數',
                unitsPerFloor: '每層戶數',
                description: '描述',
                unitTypes: {
                    title: '單位類型',
                    typeName: '類型名稱',
                    area: '面積',
                    rooms: '房數',
                    priceRange: '價格範圍'
                }
            },
            facilities: {
                title: '設施',
                name: '設施名稱',
                description: '設施描述'
            },
            parking: {
                title: '停車資訊',
                hasParking: '提供停車',
                count: '車位數量'
            },
            services: {
                title: '服務項目'
            }
        },
        'en': {
            loading: 'Loading...',
            name: 'Project Name',
            developer: 'Developer',
            totalFloor: 'Total Floors',
            price: 'Price',
            status: {
                presale: 'Pre-sale',
                selling: 'Selling',
                secondhand: 'Second Hand',
                sold: 'Sold Out'
            },
            location: {
                title: 'Location',
                region: 'Region',
                country: 'Country',
                city: 'City',
                address: 'Address'
            },
            category: {
                title: 'Category',
                type: {
                    residential: 'Residential',
                    commercial: 'Commercial'
                },
                targetAudience: {
                    investment: 'Investment',
                    'self-living': 'Self Living',
                    enterprise: 'Enterprise'
                },
                paymentOptions: {
                    mortgage: 'Mortgage',
                    installment: 'Installment'
                },
                features: {
                    environment: 'Environmental Features',
                    architectural: 'Architectural Features'
                }
            },
            buildings: {
                title: 'Buildings',
                name: 'Building Name',
                floors: 'Floors',
                unitsPerFloor: 'Units Per Floor',
                description: 'Description',
                unitTypes: {
                    title: 'Unit Types',
                    typeName: 'Type Name',
                    area: 'Area',
                    rooms: 'Rooms',
                    priceRange: 'Price Range'
                }
            },
            facilities: {
                title: 'Facilities',
                name: 'Facility Name',
                description: 'Description'
            },
            parking: {
                title: 'Parking',
                hasParking: 'Parking Available',
                count: 'Parking Spaces'
            },
            services: {
                title: 'Services'
            }
        }
    };

    const t = translations[language];

    useEffect(() => {
        setLoading(true);
        setError(null);
        
        const locale = language === 'zh-TW' ? 'zh-Hant-TW' : 'en';
        
        const populateQuery = [
            'buildings',
            'buildings.unit_types',
            'buildings.building_media',
            'category',
            'facilities',
            'location',
            'parking',
            'services',
            'projectMedia'
        ].join(',');

        fetch(`http://localhost:1339/api/projects/${id}?populate=${populateQuery}&locale=${locale}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                console.log('API Response:', data);
                setProject(data.data);
                setError(null);
            })
            .catch(error => {
                console.error('Error fetching project:', error);
                setError(error.message);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id, language]);

    if (loading) return <div className="loading">{t.loading}</div>;
    if (error) return <div className="error">{error}</div>;
    if (!project) return <div className="error">{t['project.notFound'] || 'Project not found'}</div>;

    const { attributes } = project;

    return (
        <div className="project-detail-page">
            {/* Hero Section */}
            <section className="hero-section">
                {attributes.projectMedia?.data && (
                    <div className="hero-image">
                        <img 
                            src={`http://localhost:1339${attributes.projectMedia.data[0].attributes.url}`}
                            alt={attributes.name}
                        />
                        <div className="hero-overlay">
                            <h1>{attributes.name}</h1>
                            <p className="hero-location">{attributes.location?.city}</p>
                        </div>
                    </div>
                )}
            </section>

            {/* Quick Info Section */}
            <section className="quick-info">
                <div className="info-card">
                    <span className="info-icon">🏢</span>
                    <div className="info-content">
                        <h3>{t.totalFloor}</h3>
                        <p>{attributes.total_floor} 層</p>
                    </div>
                </div>
                <div className="info-card">
                    <span className="info-icon">💰</span>
                    <div className="info-content">
                        <h3>{t.price}</h3>
                        <p>{Array.isArray(attributes.price) ? attributes.price[0] : attributes.price}</p>
                    </div>
                </div>
                <div className="info-card">
                    <span className="info-icon">🏗️</span>
                    <div className="info-content">
                        <h3>{t.developer}</h3>
                        <p>{attributes.developer}</p>
                    </div>
                </div>
                <div className="info-card">
                    <span className="info-icon">📋</span>
                    <div className="info-content">
                        <h3>Status</h3>
                        <p className={`status-badge ${attributes.status}`}>
                            {attributes.status && t.status[attributes.status]}
                        </p>
                    </div>
                </div>
            </section>

            <div className="content-grid">
                {/* 左側內容 */}
                <div className="main-content">
                    {/* 位置資訊 */}
                    {attributes.location && (
                        <section className="content-section location-section">
                            <h2>
                                <span className="section-icon">📍</span>
                                {t.location.title}
                            </h2>
                            <div className="location-details">
                                <div className="location-map">
                                    {/* 這裡可以加入地圖組件 */}
                                </div>
                                <div className="location-info">
                                    <p><strong>{t.location.region}:</strong> {attributes.location.region}</p>
                                    <p><strong>{t.location.city}:</strong> {attributes.location.city}</p>
                                    <p><strong>{t.location.address}:</strong> {attributes.location.address}</p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 建築資訊 */}
                    {attributes.buildings && (
                        <section className="content-section buildings-section">
                            <h2>
                                <span className="section-icon">🏢</span>
                                {t.buildings.title}
                            </h2>
                            <div className="buildings-grid">
                                {attributes.buildings.map((building, index) => (
                                    <div key={index} className="building-card">
                                        <h3>{building.name}</h3>
                                        <div className="building-details">
                                            <div className="detail-item">
                                                <span className="detail-icon">📊</span>
                                                <p>{building.floors} 層</p>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-icon">🚪</span>
                                                <p>{building.units_per_floor} 戶/層</p>
                                            </div>
                                        </div>
                                        {building.description && (
                                            <p className="building-description">{building.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* 右側內容 */}
                <div className="side-content">
                    {/* 建案類型 */}
                    {attributes.category && (
                        <section className="content-section category-section">
                            <h2>
                                <span className="section-icon">🏷️</span>
                                {t.category.title}
                            </h2>
                            <div className="category-details">
                                <div className="tag-group">
                                    {attributes.category.type && (
                                        <span className="tag">
                                            {t.category.type[attributes.category.type]}
                                        </span>
                                    )}
                                    {attributes.category.targetAudience && (
                                        <span className="tag">
                                            {t.category.targetAudience[attributes.category.targetAudience]}
                                        </span>
                                    )}
                                </div>
                                
                                {/* 特色列表 */}
                                {(attributes.category.environmentFeatures || 
                                  attributes.category.architecturalFeatures) && (
                                    <div className="features-section">
                                        {attributes.category.environmentFeatures && (
                                            <div className="feature-group">
                                                <h3>{t.category.features.environment}</h3>
                                                <ul className="feature-list">
                                                    {Array.isArray(attributes.category.environmentFeatures) ? 
                                                        attributes.category.environmentFeatures.map((feature, index) => (
                                                            <li key={index}>{feature}</li>
                                                        )) : 
                                                        <li>{attributes.category.environmentFeatures}</li>
                                                    }
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail; 