import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
    const [isMobile, setIsMobile] = useState(false);

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <img src="/logo.png" alt="Logo" />
            </div>
            <div className="nav-content">
                <div className="nav-items-container">
                    <ul className="navbar-links">
                        <li><Link to="/" className="nav-link">首頁</Link></li>
                        <li><Link to="/projects" className="nav-link">項目</Link></li>
                        <li><Link to="/activities" className="nav-link">活動</Link></li>
                        <li><Link to="/about" className="nav-link">關於我們</Link></li>
                        <li><Link to="/contact" className="nav-link">聯絡我們</Link></li>
                    </ul>
                    <button className="language-toggle">EN</button>
                </div>
                <button className="mobile-menu-button" onClick={() => setIsMobile(!isMobile)}>
                    {isMobile ? "✕" : "☰"}
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
