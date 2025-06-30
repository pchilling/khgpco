import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/ContactSection.css';
import companyLogo from '../assets/logo-white.png'; // 請確保有白色版本的logo
import lineIcon from '../assets/line.png';
import facebookIcon from '../assets/facebook.webp';
import instagramIcon from '../assets/instagram.png';
import logo2 from '../assets/logo2.png';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { message } from 'antd';

const ContactSection = () => {
    const { language } = useLanguage();
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        message: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'error', or null

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
            companyEmail: 'khglobal.service@khglo.com',
            relatedCompany: '關係企業',
            disclaimer: '免責聲明',
            disclaimerHTML: '<span class="disclaimer-symbol">※</span> 本網頁資訊內容均由開發商/發展商/經紀商所提供，所包含之所有資料僅供參考用途，並僅作廣告宣傳用途。 <span class="disclaimer-symbol">※</span>',
            phonePlaceholder: '09xx-xxx-xxx',
            required: '必填',
            invalidPhone: '請輸入有效的電話號碼 (格式: 09xx-xxx-xxx)',
            success: '訊息已送出！',
            error: '送出失敗，請稍後再試'
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
            companyEmail: 'khglobal.service@khglo.com',
            relatedCompany: 'Related Company',
            disclaimer: 'Disclaimer',
            disclaimerHTML: '<span class="disclaimer-symbol">※</span> The information on this website is provided by developers/brokers for reference and advertising purposes only. <span class="disclaimer-symbol">※</span>',
            phonePlaceholder: '09xx-xxx-xxx',
            required: 'Required',
            invalidPhone: 'Please enter a valid phone number (Format: 09xx-xxx-xxx)',
            success: 'Message sent successfully!',
            error: 'Failed to send message, please try again later'
        }
    };

    const t = translations[language];

    // 電話號碼格式化函數
    const formatPhoneNumber = (value) => {
        // 移除所有非數字字符
        const phoneDigits = value.replace(/\D/g, '');
        
        // 如果沒有數字，返回空字符串
        if (!phoneDigits) return '';
        
        // 格式化為 09xx-xxx-xxx
        if (phoneDigits.length <= 4) {
            return phoneDigits;
        } else if (phoneDigits.length <= 7) {
            return `${phoneDigits.slice(0, 4)}-${phoneDigits.slice(4)}`;
        } else {
            return `${phoneDigits.slice(0, 4)}-${phoneDigits.slice(4, 7)}-${phoneDigits.slice(7, 10)}`;
        }
    };

    // 處理電話號碼輸入
    const handlePhoneChange = (e) => {
        const formattedPhone = formatPhoneNumber(e.target.value);
        setFormData({ ...formData, phone: formattedPhone });
    };

    // 表單驗證
    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.name.trim()) {
            newErrors.name = `${t.name} ${t.required}`;
        }
        
        if (!formData.phone.trim()) {
            newErrors.phone = `${t.phone} ${t.required}`;
        } else {
            // 移除所有非數字字符進行驗證
            const phoneDigits = formData.phone.replace(/\D/g, '');
            // 檢查是否是 10 位數字且以 09 開頭
            if (phoneDigits.length !== 10 || !phoneDigits.startsWith('09')) {
                newErrors.phone = t.invalidPhone;
            }
        }
        
        if (!formData.email.trim()) {
            newErrors.email = `${t.email} ${t.required}`;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = `${t.email} 格式不正確`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus(null);

        try {
            const contactData = {
                data: {
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    message: formData.message,
                    source: 'website',
                }
            };
            
            const response = await fetch(`${API_BASE_URL}/api/contact-messages`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(contactData)
            });
            
            if (!response.ok) {
                throw new Error(`請求失敗: ${response.status}`);
            }
            
            const result = await response.json();
            
            setFormData({
                name: '',
                phone: '',
                email: '',
                message: ''
            });
            setSubmitStatus('success');
            
        } catch (error) {
            console.error('聯絡表單提交失敗:', error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    console.log('Logo2 path:', logo2);

    const socialLinks = {
        line: 'https://line.me/ti/p/~@118qhydb',
        facebook: 'https://www.facebook.com/KHGlobalprop/',
        instagram: 'https://www.instagram.com/khgpco?fbclid=IwY2xjawH6k41leHRuA2FlbQIxMAABHVIrdNR3UEjJE8y2VxMTQZtnW2meWesDEX6b_wM_ozsGr_0SIjFM-Ape4g_aem_ocU0a9CE9DRUpxGNzjAIHg'
    };

    return (
        <section className="contact-section" id="contact-section">
            <div className="contact-container">
                <div className="contact-left">
                    <h1>{t.title}</h1>
                    
                    {submitStatus === 'success' && (
                        <div className="success-message">
                            <i className="fas fa-check-circle"></i>
                            <p>{t.success}</p>
                        </div>
                    )}
                    
                    {submitStatus === 'error' && (
                        <div className="error-message">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>{t.error}</p>
                        </div>
                    )}
                    
                    {submitStatus !== 'success' && (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <input
                                    type="text"
                                    placeholder={t.name}
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                                {errors.name && <span className="error">{errors.name}</span>}
                            </div>
                            <div className="form-group phone-group">
                                <select defaultValue="+886">
                                    <option value="+886">台灣 +886</option>
                                </select>
                                <input
                                    type="tel"
                                    placeholder={t.phonePlaceholder}
                                    value={formData.phone}
                                    onChange={handlePhoneChange}
                                />
                                {errors.phone && <span className="error">{errors.phone}</span>}
                            </div>
                            <div className="form-group">
                                <input
                                    type="text"
                                    placeholder={t.email}
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                                {errors.email && <span className="error">{errors.email}</span>}
                            </div>
                            <div className="form-group">
                                <textarea
                                    placeholder={t.message}
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                ></textarea>
                            </div>
                            <button 
                                type="submit" 
                                className="submit-btn"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="loading-text">
                                        <i className="fas fa-spinner fa-spin"></i> 處理中...
                                    </span>
                                ) : (
                                    t.submit
                                )}
                            </button>
                        </form>
                    )}
                </div>

                <div className="contact-right">
                    {/* 暫時註釋掉 logo 區塊
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
                    */}
                    <div className="address-info">
                        <p><i className="fas fa-map-marker-alt"></i> {t.address}</p>
                        <p><i className="fas fa-phone"></i> {t.phone}</p>
                        <p><i className="fas fa-envelope"></i> {t.companyEmail}</p>
                    </div>
                    
                    <div className="social-section">
                      
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
            
            {/* 免責聲明區塊 */}
            <div className="disclaimer-container">
                <h3>{t.disclaimer}</h3>
                <div className="disclaimer-content">
                    <p 
                        className="main-disclaimer"
                        dangerouslySetInnerHTML={{ __html: t.disclaimerHTML }}
                    ></p>
                </div>
            </div>
        </section>
    );
};

export default ContactSection; 