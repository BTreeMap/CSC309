import React, { useEffect, useCallback } from 'react';
import './Modal.css';

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'medium', // 'small', 'medium', 'large'
    showCloseButton = true
}) => {
    const handleEscape = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick} role="dialog" aria-modal="true">
            <div className={`modal-content modal-${size}`}>
                <div className="modal-header">
                    {title && <h2 className="modal-title">{title}</h2>}
                    {showCloseButton && (
                        <button className="modal-close-button" onClick={onClose} aria-label="Close">
                            ×
                        </button>
                    )}
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
