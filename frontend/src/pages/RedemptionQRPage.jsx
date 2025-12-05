import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { transactionsAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, ErrorMessage, PageHeader } from '../components/shared';
import { createRedemptionPayload } from '../utils/qrPayload';
import { QrCode } from 'lucide-react';
import './RedemptionQRPage.css';

const RedemptionQRPage = () => {
    const { t } = useTranslation(['transactions', 'common']);
    const { transactionId } = useParams();
    const navigate = useNavigate();

    const [transaction, setTransaction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTransaction = async () => {
            try {
                const data = await transactionsAPI.getTransaction(transactionId);
                if (data.type !== 'redemption') {
                    setError('This transaction is not a redemption request');
                    return;
                }
                setTransaction(data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load redemption details');
            } finally {
                setLoading(false);
            }
        };

        fetchTransaction();
    }, [transactionId]);

    // Generate QR code payload with transaction details
    const qrValue = transaction ? createRedemptionPayload(transaction) : '';

    const handleDownload = useCallback(() => {
        const svg = document.querySelector('.redemption-qr-svg');
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
            link.download = `redemption-${transactionId}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };

        img.src = `data:image/svg+xml;base64,${btoa(decodeURIComponent(encodeURIComponent(svgData)))}`;
    }, [transactionId]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleString();
    };

    const getStatusBadge = () => {
        if (transaction?.processedAt) {
            return <span className="status-badge status-processed">{t('transactions:redemptionQr.statusProcessed')}</span>;
        }
        return <span className="status-badge status-pending">{t('transactions:redemptionQr.statusPending')}</span>;
    };

    if (loading) {
        return (
            <Layout>
                <LoadingSpinner text={t('transactions:redemptionQr.loading')} />
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="redemption-qr-page">
                    <ErrorMessage message={error} />
                    <div className="error-actions">
                        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                            {t('common:actions.goBack')}
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    const isProcessed = !!transaction?.processedAt;

    return (
        <Layout>
            <div className="redemption-qr-page">
                <PageHeader
                    icon={<QrCode />}
                    title={t('transactions:redemptionQr.title')}
                    subtitle={t('transactions:redemptionQr.subtitle')}
                />

                <div className="qr-content">
                    <div className="qr-card">
                        {isProcessed ? (
                            <div className="processed-notice">
                                <span className="processed-icon">✓</span>
                                <p>{t('transactions:redemptionQr.alreadyProcessed')}</p>
                            </div>
                        ) : (
                            <>
                                <div className="qr-wrapper">
                                    <QRCodeSVG
                                        value={qrValue}
                                        size={250}
                                        level="H"
                                        includeMargin={true}
                                        className="redemption-qr-svg"
                                    />
                                </div>
                                <button className="btn btn-primary download-qr-button" onClick={handleDownload}>
                                    <span className="download-icon">📥</span>
                                    {t('transactions:redemptionQr.downloadQr')}
                                </button>
                            </>
                        )}
                    </div>

                    <div className="redemption-details-card">
                        <h2>{t('transactions:redemptionQr.detailsTitle')}</h2>

                        <div className="detail-row">
                            <span className="detail-label">{t('transactions:redemptionQr.requestId')}</span>
                            <span className="detail-value">#{transaction.id}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">{t('transactions:redemptionQr.points')}</span>
                            <span className="detail-value points-value">{(() => {
                                const amount = transaction.type === 'redemption' && transaction.redeemed !== undefined 
                                    ? transaction.redeemed 
                                    : Math.abs(transaction.amount ?? 0);
                                return amount.toLocaleString();
                            })()}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">{t('transactions:redemptionQr.status')}</span>
                            {getStatusBadge()}
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">{t('transactions:redemptionQr.created')}</span>
                            <span className="detail-value">{formatDate(transaction.createdAt)}</span>
                        </div>

                        {transaction.processedAt && (
                            <div className="detail-row">
                                <span className="detail-label">{t('transactions:redemptionQr.processed')}</span>
                                <span className="detail-value">{formatDate(transaction.processedAt)}</span>
                            </div>
                        )}

                        {transaction.remark && (
                            <div className="detail-row">
                                <span className="detail-label">{t('transactions:redemptionQr.remark')}</span>
                                <span className="detail-value">{transaction.remark}</span>
                            </div>
                        )}
                    </div>

                    <div className="qr-actions">
                        <Link to="/transactions" className="action-link">
                            {t('transactions:redemptionQr.viewAllTransactions')}
                        </Link>
                        <Link to="/redeem" className="action-link">
                            {t('transactions:redemptionQr.createNewRedemption')}
                        </Link>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default RedemptionQRPage;
