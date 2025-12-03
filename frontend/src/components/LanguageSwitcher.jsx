import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGUAGES, changeLanguage } from '../i18n';
import './LanguageSwitcher.css';

/**
 * Language switcher dropdown component
 * Allows users to change the application language
 */
const LanguageSwitcher = ({ compact = false, className = '' }) => {
    const { i18n, t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const currentLang = i18n.language?.split('-')[0] || 'en';
    const currentLanguageInfo = SUPPORTED_LANGUAGES[currentLang] || SUPPORTED_LANGUAGES.en;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close dropdown on escape key
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const handleLanguageChange = async (langCode) => {
        await changeLanguage(langCode);
        setIsOpen(false);
    };

    const handleKeyDown = (event, langCode) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleLanguageChange(langCode);
        }
    };

    return (
        <div
            className={`language-switcher ${compact ? 'compact' : ''} ${className}`}
            ref={dropdownRef}
        >
            <button
                className="language-switcher-toggle"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={t('common:language')}
                title={t('common:language')}
            >
                <Globe size={compact ? 18 : 20} className="language-switcher-icon" />
                {!compact && (
                    <>
                        <span className="language-switcher-current">
                            {currentLanguageInfo.nativeName}
                        </span>
                        <ChevronDown
                            size={16}
                            className={`language-switcher-chevron ${isOpen ? 'open' : ''}`}
                        />
                    </>
                )}
            </button>

            {isOpen && (
                <ul
                    className="language-switcher-menu"
                    role="listbox"
                    aria-label={t('common:language')}
                >
                    {Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => (
                        <li
                            key={code}
                            role="option"
                            aria-selected={code === currentLang}
                            className={`language-switcher-option ${code === currentLang ? 'selected' : ''}`}
                            onClick={() => handleLanguageChange(code)}
                            onKeyDown={(e) => handleKeyDown(e, code)}
                            tabIndex={0}
                        >
                            <span className="language-option-name">{info.nativeName}</span>
                            <span className="language-option-english">{info.name}</span>
                            {code === currentLang && (
                                <Check size={16} className="language-option-check" />
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LanguageSwitcher;
