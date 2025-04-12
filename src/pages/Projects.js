import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Projects.css';
import { API_BASE_URL } from '../utils/api';
import { getImageUrl, PLACEHOLDER_IMAGE } from '../utils/imageUtils';
import { FiSearch, FiFilter, FiX, FiMapPin, FiHome, FiNavigation } from 'react-icons/fi';

const Projects = () => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(true);
    const [filters, setFilters] = useState({
        city: '',
        region: '',
        minPrice: '',
        maxPrice: '',
        category: 'all'
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const projectsPerPage = 6;

    const translations = {
        'zh-TW': {
            title: '精選建案',
            subtitle: '為您精選最優質的房地產項目',
            search: {
                placeholder: '搜尋建案名稱或地址...',
                button: '搜尋'
            },
            filters: {
                title: '篩選條件',
                city: '城市',
                region: '區域',
                price: '價格範圍',
                minPrice: '最低價格',
                maxPrice: '最高價格',
                category: {
                    all: '所有類型',
                    residential: '住宅',
                    commercial: '商業'
                },
                apply: '套用篩選',
                clear: '清除篩選'
            },
            status: {
                presale: '預售',
                selling: '銷售中',
                sold: '已售完'
            },
            pagination: {
                prev: '上一頁',
                next: '下一頁'
            },
            noResults: '沒有符合條件的建案',
            loading: '載入中...'
        },
        'en': {
            title: 'Featured Properties',
            subtitle: 'Discover our selection of premium real estate properties',
            search: {
                placeholder: 'Search by name or address...',
                button: 'Search'
            },
            filters: {
                title: 'Filters',
                city: 'City',
                region: 'Region',
                price: 'Price Range',
                minPrice: 'Min Price',
                maxPrice: 'Max Price',
                category: {
                    all: 'All Types',
                    residential: 'Residential',
                    commercial: 'Commercial'
                },
                apply: 'Apply Filters',
                clear: 'Clear Filters'
            },
            status: {
                presale: 'Pre-sale',
                selling: 'Selling',
                sold: 'Sold Out'
            },
            pagination: {
                prev: 'Previous',
                next: 'Next'
            },
            noResults: 'No properties found',
            loading: 'Loading...'
        }
    };

    const t = translations[language];

    const fetchProjects = async () => {
        setLoading(true);
        try {
            // 構建 API 查詢參數
            const queryParams = new URLSearchParams({
                'pagination[page]': currentPage,
                'pagination[pageSize]': projectsPerPage,
                'populate': '*',
                'locale': language === 'zh-TW' ? 'zh-Hant-TW' : language
            });

            // 添加搜尋條件
            if (searchTerm) {
                queryParams.append('filters[$or][0][name][$containsi]', searchTerm);
                queryParams.append('filters[$or][1][location][address][$containsi]', searchTerm);
            }

            // 添加過濾條件
            if (filters.city) {
                queryParams.append('filters[location][city][$eq]', filters.city);
            }
            if (filters.region) {
                queryParams.append('filters[location][region][$eq]', filters.region);
            }
            if (filters.minPrice) {
                queryParams.append('filters[priceRange][min_price][$gte]', filters.minPrice);
            }
            if (filters.maxPrice) {
                queryParams.append('filters[priceRange][max_price][$lte]', filters.maxPrice);
            }
            if (filters.category !== 'all') {
                queryParams.append('filters[category][type][$eq]', filters.category);
            }

            // 添加調試日誌
            console.log(`Fetching projects with language: ${language}`);
            console.log(`API URL: ${API_BASE_URL}/api/projects?${queryParams}`);

            const response = await fetch(`${API_BASE_URL}/api/projects?${queryParams}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // 添加調試日誌
            console.log('Projects data received:', data);
            console.log('Current language:', language);
            console.log('Number of projects:', data.data?.length || 0);
            
            setProjects(data.data || []);
            setTotalPages(Math.ceil(data.meta.pagination.total / projectsPerPage));
        } catch (error) {
            console.error('Error fetching projects:', error);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [currentPage, searchTerm, filters, language]);

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchProjects();
    };

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            city: '',
            region: '',
            minPrice: '',
            maxPrice: '',
            category: 'all'
        });
        setCurrentPage(1);
    };

    const formatLocation = (location) => {
        if (!location) return '';
        const parts = [];
        if (location.country) parts.push(location.country);
        if (location.city) parts.push(location.city);
        return parts.join(' · ');
    };

    return (
        <div className="projects-page">
            <div className="projects-header">
                <h1>{t.title}</h1>
                <p>{t.subtitle}</p>
            </div>

            <div className="projects-content">
                <div className="search-filter-container">
                    <form onSubmit={handleSearch} className="search-form">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t.search.placeholder}
                            className="search-input"
                        />
                        <button type="submit" className="search-button">
                            <FiSearch />
                        </button>
                    </form>
                </div>

                <div className="filters-panel">
                    <h3>{t.filters.title}</h3>
                    <div className="filters-grid">
                        <div className="filter-group">
                            <label>{t.filters.city}</label>
                            <input
                                type="text"
                                value={filters.city}
                                onChange={(e) => handleFilterChange('city', e.target.value)}
                                placeholder={t.filters.city}
                            />
                        </div>
                        <div className="filter-group">
                            <label>{t.filters.region}</label>
                            <input
                                type="text"
                                value={filters.region}
                                onChange={(e) => handleFilterChange('region', e.target.value)}
                                placeholder={t.filters.region}
                            />
                        </div>
                        <div className="filter-group">
                            <label>{t.filters.minPrice}</label>
                            <input
                                type="number"
                                value={filters.minPrice}
                                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                                placeholder={t.filters.minPrice}
                            />
                        </div>
                        <div className="filter-group">
                            <label>{t.filters.maxPrice}</label>
                            <input
                                type="number"
                                value={filters.maxPrice}
                                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                                placeholder={t.filters.maxPrice}
                            />
                        </div>
                        <div className="filter-group">
                            <label>{t.filters.category.all}</label>
                            <select
                                value={filters.category}
                                onChange={(e) => handleFilterChange('category', e.target.value)}
                            >
                                {Object.entries(t.filters.category).map(([key, value]) => (
                                    <option key={key} value={key}>{value}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="filter-actions">
                        <button onClick={clearFilters} className="clear-filters-button">
                            {t.filters.clear}
                        </button>
                    </div>
                </div>

                <div className="projects-grid">
                    {loading ? (
                        <div className="loading">{t.loading}</div>
                    ) : projects.length === 0 ? (
                        <div className="no-projects">{t.noResults}</div>
                    ) : (
                        projects.map(project => (
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
                                                {t.filters.category[project.attributes.category.type]}
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
                                            {t.filters.category[project.attributes.propertyType] || project.attributes.propertyType}
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
                        ))
                    )}
                </div>

                {!loading && projects.length > 0 && (
                    <div className="pagination">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="pagination-button"
                        >
                            {t.pagination.prev}
                        </button>
                        <span className="page-number">{currentPage}</span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="pagination-button"
                        >
                            {t.pagination.next}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Projects;