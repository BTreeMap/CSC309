import React from 'react';
import { useTranslation } from 'react-i18next';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', text }) => {
    const { t } = useTranslation('common');
    const displayText = text ?? t('loading');

    return (
        <div className={`loading-spinner-container loading-spinner-${size}`}>
            <div className="loading-spinner" role="status" aria-label={displayText}>
                <div className="spinner"></div>
            </div>
            {displayText && <p className="loading-text">{displayText}</p>}
        </div>
    );
};

export default LoadingSpinner;
