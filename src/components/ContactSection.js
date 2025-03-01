import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/ContactSection.css';
import companyLogo from '../assets/logo-white.png'; // 請確保有白色版本的logo
import lineIcon from '../assets/line.png';
import facebookIcon from '../assets/facebook.webp';
import instagramIcon from '../assets/instagram.png';
import logo2 from '../assets/logo2.png';


const ContactSection = () => {
    const { language } = useLanguage();
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        message: ''
    });

    const translations = {
        'zh-TW': {
            title: '聯繫我們',
            name: '姓名',
            phone: '電話',
            email: '信箱',
            message: '您的需求',
            submit: '送出',
            socialText: '或透過以下社交軟體與我們聯繫',
            companyName: '寬鑫國際置業有限公司',
            address: '台中市西區台灣大道二段489號31F3106',
            phone: '04-3702-1316',
            companyEmail: 'service@khglobal.com.tw',
            relatedCompany: '關係企業'
        },
        'en': {
            title: 'Contact Us',
            name: 'Name',
            phone: 'Phone',
            email: 'Email',
            message: 'Message',
            submit: 'Submit',
            socialText: 'Or contact us through the following social media',
            companyName: 'KH Global International Property Ltd.',
            address: '31F-3106, No.489, Sec. 2, Taiwan Blvd., West Dist., Taichung City',
            phone: '04-3702-1316',
            companyEmail: 'service@khglobal.com.tw',
            relatedCompany: 'Related Company'
        }
    };

    const t = translations[language];

    const handleSubmit = (e) => {
        e.preventDefault();
        // 處理表單提交邏輯
        console.log(formData);
    };

    console.log('Logo2 path:', logo2);

    const socialLinks = {
        line: 'https://line.me/ti/p/~@118qhydb',
        facebook: 'https://www.facebook.com/profile.php?id=61571826491287',
        instagram: 'https://www.instagram.com/khgpco?fbclid=IwY2xjawH6k41leHRuA2FlbQIxMAABHVIrdNR3UEjJE8y2VxMTQZtnW2meWesDEX6b_wM_ozsGr_0SIjFM-Ape4g_aem_ocU0a9CE9DRUpxGNzjAIHg'
    };

    return (
        <section className="contact-section">
            <div className="contact-container">
                <div className="contact-left">
                    <h2>{t.title}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <input
                                type="text"
                                placeholder={t.name}
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div className="form-group phone-group">
                            <select defaultValue="+886">
                                <option value="+886">台灣 +886</option>
                            </select>
                            <input
                                type="tel"
                                placeholder={t.phone}
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="text"
                                placeholder={t.email}
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <textarea
                                placeholder={t.message}
                                value={formData.message}
                                onChange={(e) => setFormData({...formData, message: e.target.value})}
                            ></textarea>
                        </div>
                        <button type="submit" className="submit-btn">{t.submit}</button>
                    </form>
                </div>

                <div className="contact-right">
                    <div className="company-info">
                        <img 
                            src={companyLogo} 
                            alt="KH Global Property" 
                            className="company-logo" 
                            style={{ border: 'none', background: 'none' }}
                        />
                        <img 
                            src={logo2} 
                            alt="Related Company" 
                            className="company-logo" 
                            style={{ border: 'none', background: 'none' }}
                        />
                    </div>
                    <div className="address-info">
                        <p><i className="fas fa-map-marker-alt"></i> {t.address}</p>
                        <p><i className="fas fa-phone"></i> {t.phone}</p>
                        <p><i className="fas fa-envelope"></i> {t.companyEmail}</p>
                    </div>
                    <div className="social-section">
                        <p>{t.socialText}</p>
                        <div className="social-links">
                            <a 
                                href={socialLinks.line} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="social-icon"
                            >
                                <img src={lineIcon} alt="Line" />
                            </a>
                            <a 
                                href={socialLinks.instagram} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="social-icon"
                            >
                                <img src={instagramIcon} alt="Instagram" />
                            </a>
                            <a 
                                href={socialLinks.facebook} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="social-icon"
                            >
                                <img src={facebookIcon} alt="Facebook" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ContactSection; 