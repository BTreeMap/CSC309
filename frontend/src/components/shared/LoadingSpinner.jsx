import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...' }) => {
    return (
        <div className={`loading-spinner-container loading-spinner-${size}`}>
            <div className="loading-spinner" role="status" aria-label={text}>
                <div className="spinner"></div>
            </div>
            {text && <p className="loading-text">{text}</p>}
        </div>
    );
};

export default LoadingSpinner;
