import React from 'react';
import '../styles/Partners.css';
import { useLanguage } from '../context/LanguageContext';
import partner1 from '../assets/partner1.jpg';
import partner2 from '../assets/partner2.png';
import partner3 from '../assets/partner3.jpg';
import partner4 from '../assets/partner4.png';
import partner5 from '../assets/partner5.jpg';
import partner6 from '../assets/partner6.png';
import partner7 from '../assets/partner7.png';
import partner8 from '../assets/partner8.png';
import partner9 from '../assets/partner9.png';
import partner10 from '../assets/partner10.jpg';
import partner11 from '../assets/partner11.png';
import partner12 from '../assets/partner12.png';
import partner13 from '../assets/partner13.png';
import partner14 from '../assets/partner14.png';

const Partners = () => {
    const { language } = useLanguage();
    
    const translations = {
        'zh-TW': {
            title: '全球戰略夥伴'
        },
        'en': {
            title: 'Global Strategic Partners'
        }
    };
    
    const t = translations[language];
    
    const partners = [
        { id: 1, name: "Partner 1", logo: partner1 },
        { id: 2, name: "Partner 2", logo: partner2 },
        { id: 3, name: "Partner 3", logo: partner3 },
        { id: 4, name: "Partner 4", logo: partner4 },
        { id: 5, name: "Partner 5", logo: partner5 },
        { id: 6, name: "Partner 6", logo: partner6 },
        { id: 7, name: "Partner 7", logo: partner7 },
        { id: 8, name: "Partner 8", logo: partner8 },
        { id: 9, name: "Partner 9", logo: partner9 },
        { id: 10, name: "Partner 10", logo: partner10 },
        { id: 11, name: "Partner 11", logo: partner11 },
        { id: 12, name: "Partner 12", logo: partner12 },
        { id: 13, name: "Partner 13", logo: partner13 },
        { id: 14, name: "Partner 14", logo: partner14 }
    ];

    return (
        <div className="partners-wrapper" style={{ position: 'relative', zIndex: 1 }}>
            <section className="partners-section">
                <div className="partners-container">
                    <h2 className="partners-title">{t.title}</h2>
                    <div className="partners-grid">
                        {partners.map(partner => (
                            <div key={partner.id} className="partner-item">
                                <img 
                                    src={partner.logo} 
                                    alt={partner.name} 
                                    className="partner-logo"
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ 
                    position: 'absolute', 
                    bottom: -5, 
                    left: 0, 
                    right: 0, 
                    height: 10, 
                    background: '#fff', 
                    zIndex: 100 
                }}></div>
                <div style={{ height: '40px', background: '#fff' }}></div>
            </section>
        </div>
    );
};

export default Partners; 