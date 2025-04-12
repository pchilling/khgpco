import React from 'react';
import '../styles/ContactButton.css';

const ContactButton = () => {
    // Line link address from the social links in ContactSection.js
    const lineLink = 'https://line.me/ti/p/~@118qhydb';
    
    return (
        <div className="contact-button-wrapper">
            <a 
                href={lineLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="contact-button"
                aria-label="Contact Us on Line"
            >
                <i className="fas fa-comments"></i>
            </a>
        </div>
    );
};

export default ContactButton; 