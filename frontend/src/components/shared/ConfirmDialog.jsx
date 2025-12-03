import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import './ConfirmDialog.css';

const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    confirmVariant = 'primary', // 'primary', 'danger', 'warning'
    loading = false
}) => {
    const { t } = useTranslation('common');

    const displayTitle = title ?? t('confirmDialog.title');
    const displayMessage = message ?? t('confirmDialog.message');
    const displayConfirmText = confirmText ?? t('confirm');
    const displayCancelText = cancelText ?? t('cancel');

    const handleConfirm = () => {
        onConfirm();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={displayTitle} size="small">
            <div className="confirm-dialog">
                <div className="confirm-message">{displayMessage}</div>
                <div className="confirm-actions">
                    <button
                        className="confirm-button cancel-button"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {displayCancelText}
                    </button>
                    <button
                        className={`confirm-button confirm-action-button confirm-${confirmVariant}`}
                        onClick={handleConfirm}
                        disabled={loading}
                    >
                        {loading ? t('processing') : displayConfirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmDialog;
