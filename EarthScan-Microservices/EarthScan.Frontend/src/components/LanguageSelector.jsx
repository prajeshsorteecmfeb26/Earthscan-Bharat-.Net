import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

export default function LanguageSelector({ floating = false }) {
    const { i18n } = useTranslation();

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    const currentLanguage = i18n.language;
    let buttonText = 'English';
    if (currentLanguage === 'hi') buttonText = 'हिंदी (Hindi)';
    else if (currentLanguage === 'mr') buttonText = 'मराठी (Marathi)';

    const floatingStyle = floating
        ? { position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }
        : {};

    return (
        <Dropdown style={floatingStyle}>
            <Dropdown.Toggle variant="dark" id="dropdown-basic" className="rounded-pill shadow border-secondary border-opacity-50" style={{ background: 'rgba(10, 15, 24, 0.8)', backdropFilter: 'blur(10px)' }}>
                <i className="bi bi-translate me-2 text-info"></i> {buttonText}
            </Dropdown.Toggle>

            <Dropdown.Menu variant="dark" className="shadow-lg border-secondary border-opacity-50 mt-2" style={{ background: 'rgba(10, 15, 24, 0.95)', backdropFilter: 'blur(10px)' }}>
                <Dropdown.Item onClick={() => changeLanguage('en')} active={currentLanguage === 'en'}>English</Dropdown.Item>
                <Dropdown.Item onClick={() => changeLanguage('hi')} active={currentLanguage === 'hi'}>हिंदी (Hindi)</Dropdown.Item>
                <Dropdown.Item onClick={() => changeLanguage('mr')} active={currentLanguage === 'mr'}>मराठी (Marathi)</Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown>
    );
}

