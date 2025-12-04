import React from 'react';
import './PageHeader.css';

/**
 * PageHeader - A consistent page header component with icon, title, and subtitle
 * Ensures strictly left-aligned titles across all pages for visual consistency
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Lucide icon or other React element
 * @param {string} props.title - Page title
 * @param {string} [props.subtitle] - Optional page subtitle
 * @param {React.ReactNode} [props.actions] - Optional action buttons (right side)
 * @param {string} [props.className] - Additional CSS classes
 */
const PageHeader = ({ icon, title, subtitle, actions, className = '' }) => {
    const hasActions = Boolean(actions);

    return (
        <div className={`page-header ${hasActions ? 'page-header-flex' : ''} ${className}`.trim()}>
            <div className="page-header-content">
                <div className="page-title-row">
                    {icon && <span className="page-title-icon">{icon}</span>}
                    <div className="page-title-text">
                        <h1 className="page-title">{title}</h1>
                        {subtitle && <p className="page-subtitle">{subtitle}</p>}
                    </div>
                </div>
            </div>
            {actions && <div className="page-header-actions">{actions}</div>}
        </div>
    );
};

export default PageHeader;
