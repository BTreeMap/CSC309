import React from 'react';
import './ErrorMessage.css';

const ErrorMessage = ({
    message = 'An error occurred',
    onRetry = null,
    variant = 'error' // 'error', 'warning', 'info'
}) => {
    const icons = {
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    return (
        <div className={`error-message-container error-message-${variant}`} role="alert">
            <span className="error-icon">{icons[variant]}</span>
            <span className="error-text">{message}</span>
            {onRetry && (
                <button className="error-retry-button" onClick={onRetry}>
                    Try Again
                </button>
            )}
        </div>
    );
};

export default ErrorMessage;
