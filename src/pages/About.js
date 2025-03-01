import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/About.css';

const About = () => {
    const { language } = useLanguage();

    const translations = {
        'zh-TW': {
            title: '關於',
            companyDesc1: '寬鑫國際置產，追求完善科技與全球制度，讓物業交易更高效，加速在世界各地輕鬆快速理想居所。',
            companyDesc2: '寬鑫國際置產有限公司是一家香港持牌的房地產代理，專注於本地及海外的房地產銷售和市場營銷服務。我們的項目來自中國、台灣、泰國、日本、馬來西亞、菲律賓、新加坡、美國、英國、澳門、加拿大、澳洲、大灣區等地區的房地產項目。',
            companyDesc3: '寬鑫國際是一家以客戶為中心的房地產代理公司，我們致力於為客戶提供最優質的房地產諮詢服務。我們的團隊由經驗豐富的房地產專業人士組成，我們在房地產市場擁有豐富的經驗和專業知識。我們相信通過提供優質的服務，我們可以幫助客戶實現他們的房地產目標。',
            ceoTitle: '執行長 CEO',
            ceoName: '蔣致永 Eric Chiang',
            education: {
                title1: '台灣東海大學經濟系',
                title2: '英國杜倫大學 MBA 主修市場行銷策略',
                title3: '美國華盛頓州不動產經理人執照',
                title4: '台灣不動產業專員執照'
            },
            features: {
                feature1: {
                    title: '頂級業務團隊',
                    desc: '我們擁有專業的團隊，提供一對一專業的諮詢服務，為您打造最佳投資組合。'
                },
                feature2: {
                    title: '全球網絡',
                    desc: '連結國內外市場，廣納多元房地產資源，為您找尋最佳投資機會。'
                },
                feature3: {
                    title: '量身定制方案',
                    desc: '根據您的需求，提供個性化的房地產解決方案，實現您的資產配置目標。'
                },
                feature4: {
                    title: '高級建築',
                    desc: '精選全球高端建案，嚴選優質物件，滿足您對理想房產的期待。'
                }
            }
        },
        'en': {
            title: 'About',
            companyDesc1: 'KH Global Property pursues perfect technology and global systems to make property transactions more efficient and accelerate the process of finding ideal homes around the world.',
            companyDesc2: 'KH Global Property Company Limited is a licensed real estate agency in Hong Kong, focusing on local and overseas real estate sales and marketing services. Our projects come from real estate developments in China, Taiwan, Thailand, Japan, Malaysia, Philippines, Singapore, USA, UK, Macau, Canada, Australia, Greater Bay Area, and other regions.',
            companyDesc3: 'KH Global is a customer-centric real estate agency committed to providing the highest quality real estate consulting services. Our team consists of experienced real estate professionals with extensive experience and expertise in the real estate market. We believe that through providing quality service, we can help our clients achieve their real estate goals.',
            ceoTitle: 'CEO',
            ceoName: 'Eric Chiang',
            education: {
                title1: 'Bachelor of Economics, Tunghai University, Taiwan',
                title2: 'MBA in Marketing Strategy, Durham University, UK',
                title3: 'Real Estate Manager License, Washington State, USA',
                title4: 'Real Estate Specialist License, Taiwan'
            },
            features: {
                feature1: {
                    title: 'Elite Business Team',
                    desc: 'Our professional team provides one-on-one consulting services to create the best investment portfolio for you.'
                },
                feature2: {
                    title: 'Global Network',
                    desc: 'Connecting domestic and international markets, gathering diverse real estate resources to find the best investment opportunities for you.'
                },
                feature3: {
                    title: 'Customized Solutions',
                    desc: 'Providing personalized real estate solutions based on your needs to achieve your asset allocation goals.'
                },
                feature4: {
                    title: 'Premium Properties',
                    desc: 'Carefully selected high-end properties worldwide to meet your expectations for ideal real estate.'
                }
            }
        }
    };

    const t = translations[language];

    return (
        <div className="about-page">
            <section className="about-header">
                <h1>{t.title}</h1>
            </section>
            
            <div className="about-content">
                <div className="intro-text">
                    {t.companyDesc1}
                </div>

                <div className="detail-content">
                    <p>{t.companyDesc2}</p>
                    <p>{t.companyDesc3}</p>
                </div>

                <div className="ceo-section">
                    <div className="ceo-info">
                        <h2>{t.ceoName}</h2>
                        <p className="ceo-title">{t.ceoTitle}</p>
                        <ul className="education-list">
                            {Object.values(t.education).map((edu, index) => (
                                <li key={index}>{edu}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="features-section">
                    <div className="features-grid">
                        {Object.values(t.features).map((feature, index) => (
                            <div key={index} className="feature-card">
                                <h3>{feature.title}</h3>
                                <p>{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;