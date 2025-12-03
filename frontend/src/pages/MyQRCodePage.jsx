import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { LoadingSpinner } from '../components/shared';
import { createUserPayload } from '../utils/qrPayload';
import './MyQRCodePage.css';

const MyQRCodePage = () => {
    const { t } = useTranslation(['users', 'common']);
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <Layout>
                <LoadingSpinner />
            </Layout>
        );
    }

    // Generate QR payload with full user info
    const qrValue = user ? createUserPayload(user) : '';

    const handleDownload = () => {
        const svg = document.querySelector('.qr-code-svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            const link = document.createElement('a');
            link.download = `qr-code-${user.utorid}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };

        img.src = `data:image/svg+xml;base64,${btoa(decodeURIComponent(encodeURIComponent(svgData)))}`;
    };

    return (
        <Layout>
            <div className="qr-code-page">
                <div className="page-header">
                    <h1 className="page-title">{t('users:qrCode.title')}</h1>
                    <p className="page-subtitle">{t('users:qrCode.subtitle')}</p>
                </div>

                <div className="qr-code-container">
                    <div className="qr-code-card">
                        <div className="qr-code-wrapper">
                            <QRCodeSVG
                                value={qrValue}
                                size={250}
                                level="H"
                                includeMargin={true}
                                className="qr-code-svg"
                            />
                        </div>

                        <div className="qr-code-info">
                            <div className="user-info-row">
                                <span className="user-info-label">{t('users:profile.utorid')}</span>
                                <span className="user-info-value">{user?.utorid}</span>
                            </div>
                            <div className="user-info-row">
                                <span className="user-info-label">{t('users:profile.name')}</span>
                                <span className="user-info-value">{user?.name || t('common:noData')}</span>
                            </div>
                        </div>

                        <button className="btn btn-primary download-qr-button" onClick={handleDownload}>
                            {t('users:qrCode.download')}
                        </button>
                    </div>

                    <div className="qr-code-instructions">
                        <h2>{t('users:qrCode.howToUse')}</h2>

                        <div className="instruction-item">
                            <span className="instruction-icon">🛒</span>
                            <div className="instruction-content">
                                <h3>{t('users:qrCode.forPurchases')}</h3>
                                <p>{t('users:qrCode.forPurchasesDesc')}</p>
                            </div>
                        </div>

                        <div className="instruction-item">
                            <span className="instruction-icon">💸</span>
                            <div className="instruction-content">
                                <h3>{t('users:qrCode.forTransfers')}</h3>
                                <p>{t('users:qrCode.forTransfersDesc')}</p>
                            </div>
                        </div>

                        <div className="instruction-item">
                            <span className="instruction-icon">🔒</span>
                            <div className="instruction-content">
                                <h3>{t('users:qrCode.keepItSafe')}</h3>
                                <p>{t('users:qrCode.keepItSafeDesc')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default MyQRCodePage;
