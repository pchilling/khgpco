import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Testimonials.css';

// 導入客戶頭像圖片
import mswangAvatar from '../assets/mswang.jpg';
import mrleeAvatar from '../assets/mrlee.jpg';
import mschangAvatar from '../assets/mschang.jpg';

const Testimonials = () => {
    const { language } = useLanguage();
    
    // 保留備用頭像
    const defaultAvatarBase64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2U2ZTZlNiIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjEwMCIgcj0iNTAiIGZpbGw9IiNhMGEwYTAiLz48cGF0aCBkPSJNMjEwLDIxMGMwLTQ1LjMtMzYuNy04Mi04Mi04MnMtODIsMzYuNy04Miw4MkgyMTBaIiBmaWxsPSIjYTBhMGEwIi8+PC9zdmc+";

    const translations = {
        'zh-TW': {
            title: '顧客回饋',
            subtitle: '閱讀我們尊貴客戶的成功故事和真誠回饋。了解他們為何選擇寬鑫國際作為他們的房地產夥伴。',
            viewAll: '查看所有回饋',
            purchasedIn: '購買國家',
            testimonials: [
                {
                    id: 1,
                    rating: 5,
                    title: '專業且貼心的服務',
                    text: '在尋找新家的過程中，很感謝寬鑫國際的協助。從初步諮詢到最後簽約，每個環節都非常專業。特別是對於房屋貸款方案的建議，為我們節省了很多時間和成本。整個團隊的服務態度都很親切，讓我們感到很放心。',
                    author: '王小姐',
                    location: '台中市北屯區',
                    avatar: mswangAvatar, // 使用王小姐的頭像
                    country: '日本'
                },
                {
                    id: 2,
                    rating: 5,
                    title: '完美的投資建議',
                    text: '身為一位首次購置投資房產的買家，我很慶幸選擇了寬鑫國際。他們不僅提供了詳細的市場分析，還針對我的需求推薦了最適合的地段。從產品介紹到交屋，一路上的溝通都很順暢，讓整個過程非常輕鬆。',
                    author: '李先生',
                    location: '台北市信義區',
                    avatar: mrleeAvatar, // 使用李先生的頭像
                    country: '泰國'
                },
                {
                    id: 3,
                    rating: 5,
                    title: '超乎期待的售屋經驗',
                    text: '原本擔心售屋會是個複雜的過程，但寬鑫團隊的專業程度遠超過我的期待。他們不只幫我合理的評估房價，還提供了許多實用的美化建議，讓房子能更快售出。最後成交的價格也比預期中理想。',
                    author: '張太太',
                    location: '高雄市鼓山區',
                    avatar: mschangAvatar, // 使用張太太的頭像
                    country: '馬來西亞'
                }
            ]
        },
        'en': {
            title: 'What Our Clients Say',
            subtitle: 'Read the success stories and heartfelt testimonials from our valued clients. Discover why they chose KH Global for their real estate needs.',
            viewAll: 'View All Testimonials',
            purchasedIn: 'Purchased In',
            testimonials: [
                {
                    id: 1,
                    rating: 5,
                    title: 'Professional and Thoughtful Service',
                    text: 'We\'re grateful for KH Global\'s assistance in finding our new home. From initial consultation to final signing, every step was handled professionally. Their advice on mortgage options saved us significant time and costs. The entire team\'s service attitude was excellent, making us feel very secure.',
                    author: 'Ms. Wang',
                    location: 'Beitun District, Taichung',
                    avatar: mswangAvatar, // 使用王小姐的頭像
                    country: 'Japan'
                },
                {
                    id: 2,
                    rating: 5,
                    title: 'Perfect Investment Advice',
                    text: 'As a first-time property investor, I\'m glad I chose KH Global. They provided detailed market analysis and recommended the most suitable locations based on my needs. Communication was smooth throughout the entire process, from product introduction to handover.',
                    author: 'Mr. Li',
                    location: 'Xinyi District, Taipei',
                    avatar: mrleeAvatar, // 使用李先生的頭像
                    country: 'Thailand'
                },
                {
                    id: 3,
                    rating: 5,
                    title: 'Exceptional Selling Experience',
                    text: 'I was initially worried about the complexity of selling my property, but KH Global\'s team exceeded my expectations. They helped with fair price evaluation and provided practical staging advice that helped sell the property faster. The final price was better than expected.',
                    author: 'Mrs. Chang',
                    location: 'Gushan District, Kaohsiung',
                    avatar: mschangAvatar, // 使用張太太的頭像
                    country: 'Malaysia'
                }
            ]
        }
    };

    const t = translations[language];

    const renderStars = (rating) => {
        return [...Array(rating)].map((_, index) => (
            <span key={index} className="star">★</span>
        ));
    };

    return (
        <section className="testimonials-section">
            <div className="testimonials-container">
                <div className="testimonials-header">
                    <h2 className="testimonials-title">{t.title}</h2>
                    <p className="testimonials-subtitle">{t.subtitle}</p>
                </div>
                <div className="testimonials-grid">
                    {t.testimonials.map((testimonial) => (
                        <div key={testimonial.id} className="testimonial-card">
                            <div className="rating">
                                {renderStars(testimonial.rating)}
                            </div>
                            <h3 className="testimonial-title">{testimonial.title}</h3>
                            <p className="testimonial-text">{testimonial.text}</p>
                            <div className="testimonial-author">
                                <div className="author-avatar">
                                    <img 
                                        src={testimonial.avatar || defaultAvatarBase64} 
                                        alt={testimonial.author} 
                                        className="avatar-image"
                                    />
                                </div>
                                <div className="author-info">
                                    <span className="author-name">{testimonial.author}</span>
                                    <span className="author-location">{testimonial.location}</span>
                                    <div className="author-country">
                                        <span className="country-label">{t.purchasedIn}:</span>
                                        <span className="country-name">{testimonial.country}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials; 