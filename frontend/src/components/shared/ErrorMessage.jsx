import React from 'react';
import { XCircle, AlertTriangle, Info } from 'lucide-react';
import './ErrorMessage.css';

const ErrorMessage = ({
    message = 'An error occurred',
    onRetry = null,
    variant = 'error' // 'error', 'warning', 'info'
}) => {
    const icons = {
        error: <XCircle size={20} />,
        warning: <AlertTriangle size={20} />,
        info: <Info size={20} />
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
