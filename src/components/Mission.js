import React from 'react';
import '../styles/Mission.css';

const Mission = () => {
    return (
        <section className="mission-section">
            <div className="mission-top-decor"></div>
            <div className="mission-content">
                <h2 className="mission-title" style={{ color: '#C5A664' }}>使命</h2>
                <p className="mission-text" style={{ color: '#142613' }}>
                    我們致力於成為全球房地產領域的信賴夥伴，為客戶提供專業、誠信良質的服務，幫助他們實現家園夢想與投資目標。
                </p>
            </div>
            <div className="mission-bottom-decor"></div>
        </section>
    );
};

export default Mission; 