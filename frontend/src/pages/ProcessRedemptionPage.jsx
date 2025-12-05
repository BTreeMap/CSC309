import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transactionsAPI, usersAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { LoadingSpinner, ErrorMessage, ConfirmDialog, QrScanner, PageHeader } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import { parseQrPayload, extractTransactionId, QR_PAYLOAD_TYPES } from '../utils/qrPayload';
import { CheckCircle } from 'lucide-react';
import './ProcessRedemptionPage.css';

const ProcessRedemptionPage = () => {
    const { transactionId } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { t } = useTranslation(['transactions', 'common']);
    const { updateUser } = useAuth();

    const [transaction, setTransaction] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [manualId, setManualId] = useState('');

    const fetchTransactionData = useCallback(async (id) => {
        setLoading(true);
        setError(null);

        try {
            // Fetch transaction details
            const txn = await transactionsAPI.getTransaction(id);

            // Verify it's a redemption transaction
            if (txn.type !== 'redemption') {
                setError(t('processRedemption.error.notRedemption'));
                setLoading(false);
                return;
            }

            setTransaction(txn);

            // Fetch user info
            const user = await usersAPI.lookupUser(txn.utorid);
            setUserInfo(user);
        } catch (err) {
            setError(err.response?.data?.error || t('processRedemption.error.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (transactionId) {
            fetchTransactionData(transactionId);
        }
    }, [transactionId, fetchTransactionData]);

    const handleQrScan = (rawData) => {
        setShowScanner(false);
        if (!rawData) return;

        // Parse the QR payload using the standardized protocol
        const payload = parseQrPayload(rawData);

        if (!payload.isValid) {
            showToast(payload.error || t('processRedemption.error.invalidQr'), 'error');
            return;
        }

        // Validate this is a redemption QR code
        if (payload.type === QR_PAYLOAD_TYPES.USER) {
            showToast(t('processRedemption.error.userQrCode'), 'error');
            return;
        }

        // Extract transaction ID
        const txnId = extractTransactionId(payload);
        if (!txnId) {
            showToast(t('processRedemption.error.extractFailed'), 'error');
            return;
        }

        navigate(`/cashier/redemption/${txnId}`);
    };

    const handleManualLookup = () => {
        const trimmedId = manualId.trim();
        if (!trimmedId) {
            showToast(t('processRedemption.error.enterRedemptionId'), 'error');
            return;
        }
        navigate(`/cashier/redemption/${trimmedId}`);
    };

    const handleProcess = async () => {
        setProcessing(true);

        try {
            await transactionsAPI.processRedemption(transaction.id);
            
            const updatedUser = await usersAPI.getMe();
            updateUser(updatedUser);
            
            showToast(t('processRedemption.successMessage'), 'success');
            navigate('/cashier/redemption');
        } catch (err) {
            showToast(err.response?.data?.error || t('processRedemption.error.processFailed'), 'error');
        } finally {
            setProcessing(false);
            setShowConfirm(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // If no transaction ID, show the scanner interface
    if (!transactionId) {
        return (
            <Layout>
                <div className="process-redemption-page">
                    <PageHeader
                        icon={<CheckCircle />}
                        title={t('transactions:processRedemption.title')}
                        subtitle={t('transactions:processRedemption.subtitle')}
                    />

                    <div className="scanner-section">
                        <button
                            className="btn btn-primary btn-lg scan-qr-btn"
                            onClick={() => setShowScanner(true)}
                        >
                            <span className="btn-icon">📷</span>
                            {t('transactions:processRedemption.scanQR')}
                        </button>

                        <div className="manual-lookup">
                            <p className="divider-text">{t('transactions:processRedemption.orEnterManually')}</p>
                            <div className="manual-input-group">
                                <input
                                    type="text"
                                    value={manualId}
                                    onChange={(e) => setManualId(e.target.value)}
                                    placeholder={t('transactions:processRedemption.enterRedemptionId')}
                                    className="form-input"
                                    onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                                />
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleManualLookup}
                                >
                                    {t('transactions:processRedemption.lookUp')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <QrScanner
                        isOpen={showScanner}
                        onScan={handleQrScan}
                        onClose={() => setShowScanner(false)}
                        onError={(err) => console.warn('QR Scanner error:', err)}
                    />
                </div>
            </Layout>
        );
    }

    if (loading) {
        return (
            <Layout>
                <LoadingSpinner text={t('transactions:processRedemption.loading')} />
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="process-redemption-page">
                    <ErrorMessage message={error} />
                    <button onClick={() => navigate('/cashier/redemption')} className="btn btn-secondary">
                        ← {t('common:goBack')}
                    </button>
                </div>
            </Layout>
        );
    }

    if (!transaction) {
        return (
            <Layout>
                <div className="process-redemption-page">
                    <div className="not-found">
                        <h2>{t('transactions:processRedemption.notFound')}</h2>
                        <p>{t('transactions:processRedemption.notFoundDesc')}</p>
                        <button onClick={() => navigate('/cashier/redemption')} className="btn btn-secondary">
                            ← {t('common:goBack')}
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    const isProcessed = !!transaction.processedAt;
    const pointsToDeduct = transaction.type === 'redemption' && transaction.redeemed !== undefined 
        ? transaction.redeemed 
        : Math.abs(transaction.amount ?? 0);

    return (
        <Layout>
            <div className="process-redemption-page">
                <button onClick={() => navigate('/cashier/redemption')} className="btn btn-ghost back-button">
                    ← {t('common:back')}
                </button>

                <PageHeader
                    icon={<CheckCircle />}
                    title={t('transactions:processRedemption.title')}
                    subtitle={t('transactions:processRedemption.reviewSubtitle')}
                />

                <div className="redemption-card">
                    {isProcessed && (
                        <div className="processed-banner">
                            ✓ {t('transactions:processRedemption.alreadyProcessed')}
                        </div>
                    )}

                    <div className="redemption-header">
                        <div className="redemption-id">
                            <span className="label">{t('transactions:processRedemption.redemptionId')}</span>
                            <span className="value">#{transaction.id}</span>
                        </div>
                        <span className={`status-badge ${isProcessed ? 'processed' : 'pending'}`}>
                            {isProcessed ? t('transactions:status.processed') : t('transactions:status.pending')}
                        </span>
                    </div>

                    <div className="customer-section">
                        <h2>{t('transactions:processRedemption.customerInfo')}</h2>
                        <div className="customer-card">
                            <div className="customer-avatar">
                                {userInfo?.avatarUrl ? (
                                    <img src={userInfo.avatarUrl} alt={userInfo.name} />
                                ) : (
                                    <span>👤</span>
                                )}
                            </div>
                            <div className="customer-details">
                                <h3>{userInfo?.name || 'Unknown User'}</h3>
                                <p className="customer-utorid">@{transaction.utorid}</p>
                                <div className="customer-stats">
                                    <div className="stat">
                                        <span className="stat-label">{t('transactions:processRedemption.currentPoints')}</span>
                                        <span className="stat-value">{userInfo?.points?.toLocaleString() || 0}</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-label">{t('transactions:processRedemption.accountStatus')}</span>
                                        <span className={`stat-value ${userInfo?.verified ? 'verified' : 'unverified'}`}>
                                            {userInfo?.verified ? `✓ ${t('transactions:processRedemption.verified')}` : `⚠️ ${t('transactions:processRedemption.unverified')}`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="redemption-details">
                        <h2>{t('transactions:processRedemption.redemptionDetails')}</h2>
                        <div className="details-grid">
                            <div className="detail-item">
                                <span className="detail-label">{t('transactions:processRedemption.pointsToRedeem')}</span>
                                <span className="detail-value points-value">{pointsToDeduct.toLocaleString()}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">{t('transactions:processRedemption.requestedOn')}</span>
                                <span className="detail-value">{formatDate(transaction.createdAt)}</span>
                            </div>
                            {transaction.remark && (
                                <div className="detail-item full-width">
                                    <span className="detail-label">{t('transactions:remark')}</span>
                                    <span className="detail-value">{transaction.remark}</span>
                                </div>
                            )}
                            {isProcessed && (
                                <div className="detail-item">
                                    <span className="detail-label">{t('transactions:processRedemption.processedOn')}</span>
                                    <span className="detail-value">{formatDate(transaction.processedAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {!isProcessed && (
                        <div className="action-section">
                            <div className="warning-note">
                                <span className="warning-icon">⚠️</span>
                                <p>{t('transactions:processRedemption.warningMessage', { points: pointsToDeduct.toLocaleString() })}</p>
                            </div>

                            <div className="action-buttons">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="btn btn-secondary"
                                >
                                    {t('common:cancel')}
                                </button>
                                <button
                                    onClick={() => setShowConfirm(true)}
                                    className="btn btn-success btn-process"
                                    disabled={processing}
                                >
                                    {processing ? t('transactions:processRedemption.processing') : t('transactions:processRedemption.processButton')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <ConfirmDialog
                    isOpen={showConfirm}
                    onClose={() => setShowConfirm(false)}
                    onConfirm={handleProcess}
                    title={t('transactions:processRedemption.confirmTitle')}
                    message={
                        <div className="confirm-content">
                            <p>{t('transactions:processRedemption.confirmMessage')}</p>
                            <div className="confirm-summary">
                                <p><strong>{t('transactions:processRedemption.customer')}:</strong> {userInfo?.name} (@{transaction.utorid})</p>
                                <p><strong>{t('transactions:processRedemption.points')}:</strong> {pointsToDeduct.toLocaleString()}</p>
                            </div>
                            <p className="confirm-warning">
                                {t('transactions:processRedemption.confirmWarning')}
                            </p>
                        </div>
                    }
                    confirmText={t('transactions:processRedemption.confirmButton')}
                />
            </div>
        </Layout>
    );
};

export default ProcessRedemptionPage;
