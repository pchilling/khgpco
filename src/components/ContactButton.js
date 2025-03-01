import React from 'react';
import '../styles/ContactButton.css';

const ContactButton = () => {
    return (
        <div className="contact-button-wrapper">
            <a 
                href="https://your-contact-link.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="contact-button"
                aria-label="Contact Us"
            >
                <i className="fas fa-comments"></i>
            </a>
        </div>
    );
};

export default ContactButton; 