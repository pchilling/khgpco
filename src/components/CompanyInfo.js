import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/CompanyInfo.css';
import KHGreen from '../assets/KHGreen.png';
import lineIcon from '../assets/line.png';
import facebookIcon from '../assets/facebook.webp';
import instagramIcon from '../assets/instagram.png';

const CompanyInfo = () => {
    const { language } = useLanguage();

    const translations = {
        'zh-TW': {
            companyInfo: {
                name: '寬鑫國際置業有限公司',
                phone: '04-3702-1316',
                address: '台中市西區台灣大道二段489號31F3106',
                email: 'service@khglobal.com.tw'
            }
        },
        'en': {
            companyInfo: {
                name: 'KH Global International Property Ltd.',
                phone: '04-3702-1316',
                address: '31F-3106, No.489, Sec. 2, Taiwan Blvd., West Dist., Taichung City',
                email: 'service@khglobal.com.tw'
            }
        }
    };

    const socialLinks = {
        line: 'https://line.me/ti/p/~@118qhydb',
        facebook: 'https://www.facebook.com/profile.php?id=61571826491287',
        instagram: 'https://www.instagram.com/khgpco?fbclid=IwY2xjawH6k41leHRuA2FlbQIxMAABHVIrdNR3UEjJE8y2VxMTQZtnW2meWesDEX6b_wM_ozsGr_0SIjFM-Ape4g_aem_ocU0a9CE9DRUpxGNzjAIHg'
    };

    const t = translations[language];

    return (
        <div className="company-info">
            <img src={KHGreen} alt="Company Logo" className="company-info-logo" />
            <div className="company-info-content">
                <p><i className="fas fa-building"></i>{t.companyInfo.name}</p>
                <p><i className="fas fa-phone"></i>Tel: {t.companyInfo.phone}</p>
                <p><i className="fas fa-envelope"></i>Email: {t.companyInfo.email}</p>
                <p><i className="fas fa-map-marker-alt"></i>{t.companyInfo.address}</p>
                
                <div className="company-social-section">
                    <div className="company-social-links">
                        <a 
                            href={socialLinks.line} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="company-social-icon"
                        >
                            <img src={lineIcon} alt="Line" />
                        </a>
                        <a 
                            href={socialLinks.instagram} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="company-social-icon"
                        >
                            <img src={instagramIcon} alt="Instagram" />
                        </a>
                        <a 
                            href={socialLinks.facebook} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="company-social-icon"
                        >
                            <img src={facebookIcon} alt="Facebook" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyInfo; 