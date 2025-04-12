import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiMapPin, FiHome, FiDollarSign, FiBriefcase, FiLayers, FiX, 
    FiChevronLeft, FiChevronRight, FiImage, FiCalendar, 
    FiCheckCircle, FiKey, FiMap, FiGrid, FiAward, FiPackage, FiShare2
} from 'react-icons/fi';
import '../styles/ProjectDetail.css';
import { API_BASE_URL } from '../utils/api';
import { getImageUrl } from '../utils/imageUtils';
import placeholderImage from '../assets/placeholder.jpg';
import CompanyInfo from '../components/CompanyInfo';

// Loading Skeleton Component
const LoadingSkeleton = () => (
    <div className="loading-skeleton">
        <div className="skeleton hero-skeleton"></div>
        <div className="skeleton-content">
            <div className="skeleton-item title"></div>
            <div className="skeleton-item text"></div>
            <div className="skeleton-grid">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="skeleton-card"></div>
                ))}
            </div>
        </div>
    </div>
);

// Project Hero Section (使用修改過的 ImageGallery 組件)
const ProjectHero = ({ project, images }) => {
    const [currentImage, setCurrentImage] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const nextImage = () => {
        setCurrentImage((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <motion.div 
            className="project-hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="main-gallery">
                <motion.div className="gallery-main-image">
                    <motion.img
                        key={currentImage}
                        src={images[currentImage]}
                        alt={project?.attributes?.name}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    />
                    <div className="gallery-controls">
                        <button 
                            className="gallery-control prev" 
                            onClick={prevImage}
                        >
                            <FiChevronLeft />
                        </button>
                        <button 
                            className="gallery-control next"
                            onClick={nextImage}
                        >
                            <FiChevronRight />
                        </button>
                    </div>
                    <div className="hero-overlay">
                        <motion.h1 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            {project?.attributes?.name}
                        </motion.h1>
                        <motion.div 
                            className="hero-location"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <FiMapPin /> {project?.attributes?.location?.address}
                        </motion.div>
                    </div>
                    <div className="image-counter">
                        {currentImage + 1} / {images.length}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

// Quick Info Cards
const QuickInfoCard = ({ icon: Icon, label, value }) => (
    <motion.div 
        className="info-card"
        whileHover={{ y: -5 }}
        transition={{ type: "spring", stiffness: 300 }}
    >
        <div className="info-icon">
            <Icon />
        </div>
        <div className="info-content">
            <h3>{label}</h3>
            <p>{value}</p>
        </div>
    </motion.div>
);

// Image Gallery Component
const ImageGallery = ({ images, projectName }) => {
    const [currentImage, setCurrentImage] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const nextImage = () => {
        setCurrentImage((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
    };

    const handleKeyPress = (e) => {
        if (isFullscreen) {
            switch(e.key) {
                case 'ArrowLeft':
                    prevImage();
                    break;
                case 'ArrowRight':
                    nextImage();
                    break;
                case 'Escape':
                    setIsFullscreen(false);
                    break;
                default:
                    break;
            }
        }
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isFullscreen]);

    return (
        <div className="project-gallery-section">
            <div className="main-gallery">
                <motion.div 
                    className="gallery-main-image"
                    onClick={() => setIsFullscreen(true)}
                >
                    <motion.img
                        key={currentImage}
                        src={images[currentImage]}
                        alt={`${projectName} - ${currentImage + 1}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    />
                    <div className="gallery-controls">
                        <button 
                            className="gallery-control prev" 
                            onClick={(e) => {
                                e.stopPropagation();
                                prevImage();
                            }}
                        >
                            <FiChevronLeft />
                        </button>
                        <button 
                            className="gallery-control next"
                            onClick={(e) => {
                                e.stopPropagation();
                                nextImage();
                            }}
                        >
                            <FiChevronRight />
                        </button>
                    </div>
                    <div className="image-counter">
                        {currentImage + 1} / {images.length}
                    </div>
                </motion.div>
            </div>

            <div className="gallery-thumbnails">
                {images.map((image, index) => (
                    <motion.div
                        key={index}
                        className={`gallery-thumbnail ${currentImage === index ? 'active' : ''}`}
                        onClick={() => setCurrentImage(index)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <img src={image} alt={`${projectName} thumbnail ${index + 1}`} />
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {isFullscreen && (
                    <motion.div 
                        className="fullscreen-gallery"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <button 
                            className="close-fullscreen"
                            onClick={() => setIsFullscreen(false)}
                        >
                            <FiX />
                        </button>
                        <div className="fullscreen-image">
                            <motion.img
                                key={currentImage}
                                src={images[currentImage]}
                                alt={`${projectName} - ${currentImage + 1}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                        <div className="fullscreen-controls">
                            <button onClick={prevImage}>
                                <FiChevronLeft />
                            </button>
                            <span className="fullscreen-counter">
                                {currentImage + 1} / {images.length}
                            </span>
                            <button onClick={nextImage}>
                                <FiChevronRight />
                            </button>
                        </div>
                        <div className="fullscreen-thumbnails">
                            {images.map((image, index) => (
                                <div
                                    key={index}
                                    className={`thumbnail ${currentImage === index ? 'active' : ''}`}
                                    onClick={() => setCurrentImage(index)}
                                >
                                    <img src={image} alt={`${projectName} thumbnail ${index + 1}`} />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Quick Navigation Component
const QuickNav = ({ activeSection, setActiveSection }) => {
    const { language } = useLanguage();
    
    const navTranslations = {
        'zh-TW': {
            basicInfo: '基本資訊',
            location: '位置資訊',
            buildings: '建築資訊',
            features: '建案特色',
            share: '分享'
        },
        'en': {
            basicInfo: 'Basic Info',
            location: 'Location',
            buildings: 'Buildings',
            features: 'Features',
            share: 'Share'
        }
    };
    
    const t = navTranslations[language];
    
    const sections = [
        { id: 'basic-info', icon: FiBriefcase, label: t.basicInfo },
        { id: 'location', icon: FiMapPin, label: t.location },
        { id: 'buildings', icon: FiHome, label: t.buildings },
        { id: 'features', icon: FiAward, label: t.features }
    ];

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            // 立即更新 activeSection
            setActiveSection(id);
            
            // 使用 scrollIntoView 進行滾動
            element.scrollIntoView({ behavior: 'smooth' });
            
            // 使用 setTimeout 進行精確調整
            setTimeout(() => {
                const offset = 160; // navbar (80px) + quick nav (64px) + padding (16px)
                const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({
                    top: Math.max(0, elementPosition - offset),
                    behavior: 'smooth'
                });
            }, 100);
        }
    };

    return (
        <nav className="quick-nav">
            <div className="quick-nav-container">
                <div className="quick-nav-list">
                    {sections.map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            data-section={id}
                            className={`quick-nav-item ${activeSection === id ? 'active' : ''}`}
                            onClick={() => scrollToSection(id)}
                        >
                            <Icon />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
                <div className="share-buttons">
                    <button
                        className="share-button"
                        onClick={() => {
                            if (navigator.share) {
                                navigator.share({
                                    title: document.title,
                                    url: window.location.href
                                });
                            } else {
                                navigator.clipboard.writeText(window.location.href);
                                alert(language === 'zh-TW' ? '已複製連結到剪貼簿' : 'Link copied to clipboard');
                            }
                        }}
                    >
                        <FiShare2 />
                        <span>{t.share}</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

// 新的基本資訊區塊
const BasicInfoSection = ({ id, attributes, t, language }) => {
    console.log('BasicInfoSection 收到的 attributes:', attributes);
    console.log('價格範圍數據:', attributes.priceRange);
    
    return (
    <motion.section 
        id={id}
        className="basic-info-section"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
    >
        <h2 className="section-title">
            <FiBriefcase />
            {t.basicInfo || (language === 'zh-TW' ? '基本資訊' : 'Basic Info')}
        </h2>
        <div className="info-table">
            {/* 主要資訊 - 第一列 */}
            <div className="info-group main-info">
                <div className="info-row">
                    <div className="info-label">
                        <FiHome />
                        <span>{t.name}</span>
                    </div>
                    <div className="info-value">{attributes.name}</div>
                </div>
                <div className="info-row">
                    <div className="info-label">
                        <FiBriefcase />
                        <span>{t.developer}</span>
                    </div>
                    <div className="info-value">{attributes.developer}</div>
                </div>
                <div className="info-row">
                    <div className="info-label">
                        <FiCalendar />
                        <span>{t.completionDate}</span>
                    </div>
                    <div className="info-value">
                        {attributes.completionDate ? 
                            new Date(attributes.completionDate).toLocaleDateString(
                                language === 'zh-TW' ? 'zh-TW' : 'en-US',
                                { year: 'numeric', month: 'long' }
                            ) : '-'
                        }
                    </div>
                </div>
                <div className="info-row">
                    <div className="info-label">
                        <FiCheckCircle />
                        <span>{t.status.title}</span>
                    </div>
                    <div className="info-value">{t.status[attributes.status]}</div>
                </div>
            </div>

            {/* 主要資訊 - 第二列 */}
            <div className="info-group main-info">
                <div className="info-row">
                    <div className="info-label">
                        <FiKey />
                        <span>{t.ownership.status}</span>
                    </div>
                    <div className="info-value">
                        {attributes.propertyOwnership ? t.ownership[attributes.propertyOwnership] : '-'}
                    </div>
                </div>
                <div className="info-row">
                    <div className="info-label">
                        <FiGrid />
                        <span>{t.category.title}</span>
                    </div>
                    <div className="info-value">
                        <div>{t.category.type[attributes.category?.type]}</div>
                    </div>
                </div>
                <div className="info-row">
                    <div className="info-label">
                        <FiHome />
                        <span>{t.category.projectType.title}</span>
                    </div>
                    <div className="info-value">
                        <div>{t.category.projectType[attributes.category?.projectType]}</div>
                    </div>
                </div>
            </div>

            {/* 價格範圍 (跨兩列) */}
            <div className="info-group price-info">
                <div className="info-row">
                    <div className="info-label">
                        <FiDollarSign />
                        <span>{t.price.range}</span>
                    </div>
                    <div className="info-value price-value">
                        {attributes.priceRange ? (
                            <div className="price-range">
                                ${Number(attributes.priceRange.min_price).toLocaleString()} ~ ${Number(attributes.priceRange.max_price).toLocaleString()} {language === 'zh-TW' ? '新台幣' : 'NTD'}
                            </div>
                        ) : '-'}
                    </div>
                </div>
            </div>
        </div>
    </motion.section>
    );
};

const ProjectDetail = () => {
    const { id } = useParams();
    const { language } = useLanguage();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentImage, setCurrentImage] = useState(0);
    const [images, setImages] = useState([]);
    const [activeSection, setActiveSection] = useState('basic-info');

    const translations = {
        'zh-TW': {
            loading: '載入中...',
            name: '建案名稱',
            developer: '開發商',
            totalFloor: '總樓層',
            completionDate: '完工日期',
            price: {
                range: '價格範圍',
                min: '起價',
                max: '最高',
                startingPrice: '起價'
            },
            status: {
                title: '銷售狀態',
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
                projectType: {
                    title: '類型',
                    apartment: '社區大樓',
                    house: '獨棟房屋',
                    villa: '別墅',
                    townhouse: '連棟房屋',
                    mansion: '豪宅'
                },
                features: {
                    environment: '環境特色',
                    architectural: '建築特色'
                }
            },
            buildings: {
                title: '建築資訊',
                name: '建築名稱',
                floors: '樓層',
                unitsPerFloor: '每層戶數',
                description: '描述'
            },
            unitTypes: {
                title: '單位類型',
                typeName: '類型名稱',
                area: '面積',
                layout: '平面圖',
                description: '描述',
                roomType: '格局',
                startingPrice: '起價'
            },
            ownership: {
                title: '產權狀態',
                status: '產權',
                Freehold: '永久產權',
                Leasehold: '租賃產權'
            },
            gallery: {
                title: '專案圖片'
            }
        },
        'en': {
            loading: 'Loading...',
            name: 'Project Name',
            developer: 'Developer',
            totalFloor: 'Total Floors',
            completionDate: 'Completion Date',
            price: {
                range: 'Price Range',
                min: 'Starting from',
                max: 'Up to',
                startingPrice: 'Starting Price'
            },
            status: {
                title: 'Sales Status',
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
                projectType: {
                    title: 'Type',
                    apartment: 'Apartment',
                    house: 'House',
                    villa: 'Villa',
                    townhouse: 'Townhouse',
                    mansion: 'Mansion'
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
                description: 'Description'
            },
            unitTypes: {
                title: 'Unit Types',
                typeName: 'Type Name',
                area: 'Area',
                layout: 'Layout',
                description: 'Description',
                roomType: 'Room Type',
                startingPrice: 'Starting Price'
            },
            ownership: {
                title: 'Ownership Status',
                status: 'Ownership',
                Freehold: 'Freehold',
                Leasehold: 'Leasehold'
            },
            gallery: {
                title: 'Project Gallery'
            }
        }
    };

    const t = translations[language];

    useEffect(() => {
        const fetchProject = async () => {
            setLoading(true);
            setError(null);
            
            const locale = language === 'zh-TW' ? 'zh-Hant-TW' : language;
            
            const populateQuery = [
                'buildings',
                'buildings.unit_types',
                'buildings.unit_types.layout',
                'buildings.building_media',
                'category',
                'facilities',
                'location',
                'parking',
                'services',
                'projectMedia',
                'unit_types',
                'unit_types.layout',
                'priceRange'
            ].join(',');

            try {
                console.log(`Fetching project with ID: ${id} and language: ${locale}`);
                console.log(`API URL: ${API_BASE_URL}/api/projects/${id}?populate=${populateQuery}&locale=${locale}`);
                
                const response = await fetch(
                    `${API_BASE_URL}/api/projects/${id}?populate=${populateQuery}&locale=${locale}`
                );
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('API 回傳的完整數據:', data);
                console.log('價格範圍數據:', data.data?.attributes?.priceRange);
                console.log('Current language:', language);
                
                // 檢查是否有數據
                if (!data.data) {
                    setError(`No data found for this project in ${language === 'zh-TW' ? 'Chinese' : 'English'}`);
                    setLoading(false);
                    return;
                }
                
                setProject(data.data);
                
                // Process images
                if (data.data?.attributes?.projectMedia?.data) {
                    const processedImages = data.data.attributes.projectMedia.data.map(
                        media => getImageUrl({ data: [media] })
                    );
                    setImages(processedImages);
                }
                
                setError(null);
            } catch (error) {
                console.error('Error fetching project:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [id, language]);

    // 在 ProjectDetail 組件中更新滾動監聽邏輯
    useEffect(() => {
        let isScrolling = false;
        let scrollTimeout;

        const handleScroll = () => {
            // 如果是手動點擊觸發的滾動，不要更新 activeSection
            if (isScrolling) return;

            const navHeight = 80;
            const quickNavHeight = 64;
            const offset = navHeight + quickNavHeight;
            
            const sections = ['basic-info', 'location', 'buildings', 'features'];
            let current = '';
            
            // 找到最接近頂部的區塊
            let minDistance = Infinity;
            
            for (const id of sections) {
                const element = document.getElementById(id);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const distance = Math.abs(rect.top - offset);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        current = id;
                    }
                }
            }
            
            if (current !== activeSection) {
                setActiveSection(current);
            }

            // 設置防抖計時器
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
            }, 150);
        };

        window.addEventListener('scroll', handleScroll);
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(scrollTimeout);
        };
    }, [activeSection]);

    if (loading) return <LoadingSkeleton />;
    if (error) return (
        <motion.div 
            className="error-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="error-message">
                <h2>Oops!</h2>
                <p>{error}</p>
            </div>
        </motion.div>
    );
    if (!project) return (
        <motion.div 
            className="error-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="error-message">
                <h2>Not Found</h2>
                <p>{t['project.notFound'] || 'Project not found'}</p>
            </div>
        </motion.div>
    );

    const { attributes } = project;
    
    console.log('完整的 Project 數據:', project);
    console.log('完整的 attributes:', attributes);
    console.log('完工日期 (completion_date):', attributes.completion_date);
    console.log('完工日期 (completionDate):', attributes.completionDate);

    return (
        <motion.div 
            className="project-detail-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <ProjectHero 
                project={project} 
                images={images} 
            />

            <QuickNav activeSection={activeSection} setActiveSection={setActiveSection} />

            <div className="project-content">
                {/* Basic Info Section */}
                <BasicInfoSection 
                    id="basic-info"
                    attributes={attributes} 
                    t={t} 
                    language={language} 
                />

                {/* Location Section */}
                <motion.section 
                    id="location"
                    className="location-section"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <h2 className="section-title">
                        <FiMapPin />
                        {t.location.title}
                    </h2>
                    <div className="location-info">
                        <div className="location-main">
                            <div className="location-address">
                                <FiMapPin className="location-icon" />
                                <span className="address-text">{attributes.location?.address || '-'}</span>
                            </div>
                            <div className="location-details">
                                <div className="detail-item">
                                    <span className="detail-label">{t.location.country}</span>
                                    <span className="detail-value">{attributes.location?.country || '-'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">{t.location.city}</span>
                                    <span className="detail-value">{attributes.location?.city || '-'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">{t.location.region}</span>
                                    <span className="detail-value">{attributes.location?.region || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* Buildings Section */}
                <motion.section 
                    id="buildings"
                    className="buildings-section"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <h2 className="section-title">
                        <FiHome />
                        {t.buildings.title}
                    </h2>
                    <div className="building-cards">
                        {attributes.buildings?.map((building, index) => (
                            <motion.div 
                                key={index}
                                className="building-card"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 * index }}
                            >
                                <div className="building-header">
                                    <h3 className="building-name">{building.name}</h3>
                                    <div className="building-specs">
                                        <span>{language === 'zh-TW' ? '每層戶數: ' : 'Units per floor: '}{building.units_per_floor} {language === 'zh-TW' ? '戶' : ''}</span>
                                    </div>
                                </div>
                                <div className="building-content">
                                    <p>{building.description}</p>
                                </div>
                                {building.building_media?.data && (
                                    <div className="building-image">
                                        <img 
                                            src={getImageUrl({ data: [building.building_media.data[0]] })}
                                            alt={building.name}
                                        />
                                    </div>
                                )}
                                
                                {/* Unit Types for this Building */}
                                {building.unit_types && building.unit_types.length > 0 && (
                                    <div className="building-unit-types">
                                        <h4 className="unit-types-title">{t.unitTypes.title}</h4>
                                        <div className="unit-types-grid">
                                            {building.unit_types.map((unit, unitIndex) => (
                                                <motion.div 
                                                    key={unitIndex}
                                                    className="unit-type-item"
                                                    whileHover={{ y: -3 }}
                                                    transition={{ type: "spring", stiffness: 300 }}
                                                >
                                                    <div className="unit-type-header">
                                                        <h5>{unit.type_name}</h5>
                                                        <div className="unit-specs">
                                                            <span className="area">{unit.area} m²</span>
                                                            <span className="room-type">{unit.roomtype}</span>
                                                        </div>
                                                    </div>
                                                    {unit.description && (
                                                        <p className="unit-description">{unit.description}</p>
                                                    )}
                                                    {unit.layout?.data && (
                                                        <div className="unit-layout">
                                                            <img 
                                                                src={getImageUrl({ data: [unit.layout.data] })}
                                                                alt={`${unit.type_name} layout`}
                                                                onError={(e) => {
                                                                    console.log('圖片載入錯誤:', e);
                                                                    console.log('嘗試載入的 URL:', e.target.src);
                                                                    console.log('Layout 數據結構:', unit.layout);
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                    {unit.startingprice && (
                                                        <div className="unit-price">
                                                            <span className="price-label">{t.unitTypes.startingPrice}</span>
                                                            <span className="price-value">
                                                                ${unit.startingprice.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* Features Section */}
                <motion.section 
                    id="features"
                    className="features-section"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.1 }}
                >
                    <h2 className="section-title">
                        <FiAward />
                        {language === 'zh-TW' ? '建案特色' : 'Features'}
                    </h2>
                    <div className="features-grid">
                        <div className="feature-category">
                            <h3 className="feature-category-title">
                                <FiMap />
                                {t.category.features.environment}
                            </h3>
                            <div className="feature-tags">
                                {attributes.category?.environmentFeatures?.map((feature, index) => (
                                    <motion.span 
                                        key={index} 
                                        className="feature-tag"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 * index }}
                                        whileHover={{ y: -2, scale: 1.05 }}
                                    >
                                        {feature}
                                    </motion.span>
                                ))}
                            </div>
                        </div>
                        <div className="feature-category">
                            <h3 className="feature-category-title">
                                <FiHome />
                                {t.category.features.architectural}
                            </h3>
                            <div className="feature-tags">
                                {attributes.category?.architecturalFeatures?.map((feature, index) => (
                                    <motion.span 
                                        key={index} 
                                        className="feature-tag"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 * index }}
                                        whileHover={{ y: -2, scale: 1.05 }}
                                    >
                                        {feature}
                                    </motion.span>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.section>
            </div>
            
            {/* 添加公司信息組件 */}
            <div className="project-detail-container">
                <CompanyInfo />
            </div>
        </motion.div>
    );
};

export default ProjectDetail; 