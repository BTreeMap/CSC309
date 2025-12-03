import React from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';
import './EmptyState.css';

const EmptyState = ({
    icon = null,
    title,
    description,
    action = null
}) => {
    const { t } = useTranslation('common');
    const displayTitle = title ?? t('empty.title');
    const displayDescription = description ?? t('empty.message');

    return (
        <div className="empty-state">
            <div className="empty-state-icon">
                {icon || <Inbox size={48} strokeWidth={1.5} />}
            </div>
            <h3 className="empty-state-title">{displayTitle}</h3>
            <p className="empty-state-description">{displayDescription}</p>
            {action && <div className="empty-state-action">{action}</div>}
        </div>
    );
};

export default EmptyState;
