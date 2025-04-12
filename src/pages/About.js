import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import Partners from '../components/Partners';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faUsers, 
    faGlobe, 
    faPuzzlePiece, 
    faBuilding, 
    faHandshake, 
    faKey,
    faQuoteLeft,
    faCompass,
    faChartLine,
    faShieldAlt,
    faLandmark
} from '@fortawesome/free-solid-svg-icons';
import '../styles/About.css';

const About = () => {
    const { language } = useLanguage();

    const translations = {
        'zh-TW': {
            title: '關於',
            slogan: {
                line1: '寬鑫領航，開啟世界',
                line2: '專業引領全球置產，量身打造資產配置，穩健增長跨越國界，開創無限未來版圖。'
            },
            companyDesc: {
                subtitle: '全球視野，專業領航',
                text: '寬鑫國際置業有限公司致力於成為全球華人最值得信賴的海外房地產專家。我們專注於海外房地產代銷、資產配置、國際產權代辦、專業貸款規劃、高端租賃管理、私人資產顧問與法規社區指引，提供一站式專業服務，確保每位客戶在全球市場中安心布局，掌握財富增值機會。'
            },
            philosophy: {
                title: '企業理念',
                text1: '我們以「專業、誠信、創新、共贏」為核心價值，透過精準的市場分析與透明化的服務機制，為客戶打造穩健且具前瞻性的國際資產配置策略。我們深知海外置產不僅是購買房產，更是一場跨國資產管理的旅程，因此我們致力於提供安全、合規、穩健的解決方案，讓投資變得更簡單、更值得信賴。',
                text2: '未來，寬鑫國際將持續拓展全球版圖，深化跨國產權服務，打造華人專屬的國際不動產生態圈，建立安全、透明、專業的全球投資橋樑，讓每位客戶都能放心進入國際市場，享受穩健增值的長遠回報。',
                text3: '寬鑫領航，開啟世界，讓您的財富與視野無限延伸！'
            },
            vision: {
                title: '寬鑫領航，開啟世界',
                subtitle: '讓您的財富與視野無限延伸！'
            },
            services: {
                title: '六大核心服務',
                service1: {
                    title: '頂級業務團隊',
                    desc: '我們擁有專業的團隊，提供一對一專業的諮詢服務。'
                },
                service2: {
                    title: '全球網絡',
                    desc: '連結國內外市場，廣納多元房地產資源。'
                },
                service3: {
                    title: '量身定制解決方案',
                    desc: '根據您的需求，提供個性化的房地產解決方案。'
                },
                service4: {
                    title: '高級建築',
                    desc: '精選全球高端建案，嚴選優質物件。'
                },
                service5: {
                    title: '售後服務',
                    desc: '提供完整的售後支援，確保您的資產權益與管理無虞。'
                },
                service6: {
                    title: '待租管服務',
                    desc: '專業租賃管理與維護，為您的資產創造穩定收益。'
                }
            }
        },
        'en': {
            title: 'About',
            slogan: {
                line1: 'KH Global, Opening New Horizons',
                line2: 'Professional guidance in global property investment, tailored asset allocation, steady growth across borders, creating unlimited future territory.'
            },
            companyDesc: {
                subtitle: 'Global Vision, Professional Leadership',
                text: 'KH Global Properties is committed to becoming the most trusted overseas real estate expert for global Chinese. We focus on overseas real estate sales, asset allocation, international property rights processing, professional loan planning, high-end leasing management, private asset consulting and regulatory community guidance, providing one-stop professional services to ensure each client can confidently deploy their investments in the global market and capture wealth appreciation opportunities.'
            },
            philosophy: {
                title: 'Corporate Philosophy',
                text1: 'We take "honesty, integrity, innovation, and win-win" as our core values, through precise professional market analysis and quality service and consulting, to create stable and competitive international asset allocation strategies for clients. We remain steadfast regardless of external environmental changes, and are a good partner for asset managers, including our investment advice, all created for clients.',
                text2: 'In the future, KH Global will continue to expand globally, deepen cross-strait industry chain services, create a Chinese-renowned international real estate ecosystem, establish safe, transparent, and professional global investment modules, allowing you to confidently enter the international market from anywhere in the world and enjoy the best fundamental value in the housing market.',
                text3: 'KH Spirit, opening the world, let your wealth grow with us!'
            },
            vision: {
                title: 'KH Global Leads, Opening the World',
                subtitle: 'Extending Your Wealth and Vision Infinitely!'
            },
            services: {
                title: 'Six Core Services',
                service1: {
                    title: 'Elite Business Team',
                    desc: 'We have a professional team providing one-on-one consulting services.'
                },
                service2: {
                    title: 'Global Network',
                    desc: 'Connecting domestic and international markets, gathering diverse real estate resources.'
                },
                service3: {
                    title: 'Customized Solutions',
                    desc: 'Providing personalized real estate solutions based on your needs.'
                },
                service4: {
                    title: 'Premium Properties',
                    desc: 'Carefully selected high-end properties worldwide.'
                },
                service5: {
                    title: 'After-Sales Service',
                    desc: 'Providing comprehensive after-sales support to ensure your asset rights and management.'
                },
                service6: {
                    title: 'Property Management Service',
                    desc: 'Professional leasing management and maintenance, creating stable returns for your assets.'
                }
            }
        }
    };

    const t = translations[language];

    return (
        <div className="about-page">
            <div className="about-header">
                <h1>{t.title}</h1>
            </div>
            
            <div className="about-content">
                <div className="slogan-section">
                    <FontAwesomeIcon icon={faCompass} className="section-icon pulse" />
                    <h2>{t.slogan.line1}</h2>
                    <p>{t.slogan.line2}</p>
                </div>

                <div className="company-intro">
                    <div className="intro-header">
                        <FontAwesomeIcon icon={faShieldAlt} className="section-icon shield-icon" />
                        <h2>{t.companyDesc.subtitle}</h2>
                    </div>
                    <div className="intro-box">
                        <p>{t.companyDesc.text}</p>
                    </div>
                </div>

                <div className="philosophy-section">
                    <div className="intro-header">
                        <FontAwesomeIcon icon={faLandmark} className="section-icon" />
                        <h2>{t.philosophy.title}</h2>
                    </div>
                    <div className="philosophy-content">
                        <div className="philosophy-card">
                            <p>{t.philosophy.text1}</p>
                        </div>
                        <div className="philosophy-card">
                            <p>{t.philosophy.text2}</p>
                        </div>
                    </div>
                </div>

                <div className="vision-statement">
                    <h2>{t.vision.title}</h2>
                    <p>{t.vision.subtitle}</p>
                </div>

                <div className="services-section">
                    <h2>{t.services.title}</h2>
                    <div className="services-grid">
                        <div className="service-card">
                            <FontAwesomeIcon icon={faUsers} className="service-icon" />
                            <h3>{t.services.service1.title}</h3>
                            <p>{t.services.service1.desc}</p>
                        </div>
                        <div className="service-card">
                            <FontAwesomeIcon icon={faGlobe} className="service-icon" />
                            <h3>{t.services.service2.title}</h3>
                            <p>{t.services.service2.desc}</p>
                        </div>
                        <div className="service-card">
                            <FontAwesomeIcon icon={faPuzzlePiece} className="service-icon" />
                            <h3>{t.services.service3.title}</h3>
                            <p>{t.services.service3.desc}</p>
                        </div>
                        <div className="service-card">
                            <FontAwesomeIcon icon={faBuilding} className="service-icon" />
                            <h3>{t.services.service4.title}</h3>
                            <p>{t.services.service4.desc}</p>
                        </div>
                        <div className="service-card">
                            <FontAwesomeIcon icon={faHandshake} className="service-icon" />
                            <h3>{t.services.service5.title}</h3>
                            <p>{t.services.service5.desc}</p>
                        </div>
                        <div className="service-card">
                            <FontAwesomeIcon icon={faKey} className="service-icon" />
                            <h3>{t.services.service6.title}</h3>
                            <p>{t.services.service6.desc}</p>
                        </div>
                    </div>
                </div>

                <Partners />
            </div>
        </div>
    );
};

export default About;