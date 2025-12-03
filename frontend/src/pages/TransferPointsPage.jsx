import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { transactionsAPI, usersAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, ConfirmDialog, QrScanner, PageHeader } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import { parseQrPayload, extractUserIdentifier, QR_PAYLOAD_TYPES } from '../utils/qrPayload';
import { ArrowLeftRight } from 'lucide-react';
import './TransferPointsPage.css';

const INITIAL_FORM_STATE = {
    recipientId: '',
    amount: '',
    remark: '',
};

const TransferPointsPage = () => {
    const { t } = useTranslation(['transactions', 'common']);
    const { user, loading: authLoading, updateUser } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [recipientInfo, setRecipientInfo] = useState(null);
    const [lookingUpRecipient, setLookingUpRecipient] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showConfirm, setShowConfirm] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // Clear field-specific error
        setErrors((prev) => {
            if (prev[name]) {
                const { [name]: _, ...rest } = prev;
                return rest;
            }
            return prev;
        });

        // Clear recipient info when ID changes
        if (name === 'recipientId') {
            setRecipientInfo(null);
        }
    }, []);

    const lookupRecipient = useCallback(async (identifier = formData.recipientId) => {
        const trimmedId = identifier?.trim();
        if (!trimmedId) {
            setErrors((prev) => ({ ...prev, recipientId: t('transfer.error.enterRecipient') }));
            return;
        }

        setLookingUpRecipient(true);
        setRecipientInfo(null);

        try {
            const foundUser = await usersAPI.lookupUser(trimmedId);

            if (foundUser) {
                if (foundUser.id === user.id) {
                    setErrors((prev) => ({ ...prev, recipientId: t('transfer.error.selfTransfer') }));
                } else {
                    setRecipientInfo(foundUser);
                    setErrors((prev) => {
                        const { recipientId: _, ...rest } = prev;
                        return rest;
                    });
                }
            } else {
                setErrors((prev) => ({ ...prev, recipientId: t('transfer.error.userNotFound') }));
            }
        } catch (err) {
            if (err.response?.status === 404) {
                setErrors((prev) => ({ ...prev, recipientId: t('transfer.error.userNotFound') }));
            } else {
                setErrors((prev) => ({ ...prev, recipientId: t('transfer.error.lookupFailed') }));
            }
        } finally {
            setLookingUpRecipient(false);
        }
    }, [formData.recipientId, user.id, t]);

    const handleQrScan = useCallback((rawData) => {
        setShowScanner(false);
        if (!rawData) return;

        // Parse the QR payload
        const payload = parseQrPayload(rawData);

        if (!payload.isValid) {
            showToast(payload.error || t('transfer.error.invalidQr'), 'error');
            return;
        }

        // Validate this is a user QR code
        if (payload.type === QR_PAYLOAD_TYPES.REDEMPTION) {
            showToast(t('transfer.error.redemptionQr'), 'error');
            return;
        }

        // Extract user identifier
        const identifier = extractUserIdentifier(payload);
        if (!identifier) {
            showToast(t('transfer.error.qrExtractFailed'), 'error');
            return;
        }

        // Set the identifier and lookup
        const identifierStr = String(identifier);
        setFormData((prev) => ({ ...prev, recipientId: identifierStr }));
        lookupRecipient(identifierStr);
    }, [lookupRecipient, showToast, t]);

    const validateForm = useCallback(() => {
        const newErrors = {};

        if (!recipientInfo) {
            newErrors.recipientId = t('transfer.error.verifyRecipient');
        } else if (!recipientInfo.verified) {
            newErrors.recipientId = t('transfer.error.recipientNotVerified');
        }

        const amount = parseInt(formData.amount, 10);
        if (!formData.amount || isNaN(amount) || amount <= 0) {
            newErrors.amount = t('transfer.error.invalidAmount');
        } else if (amount > user.points) {
            newErrors.amount = t('transfer.error.insufficientPoints', { points: user.points.toLocaleString() });
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [recipientInfo, formData.amount, user.points, t]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            setShowConfirm(true);
        }
    };

    const handleConfirmTransfer = async () => {
        setShowConfirm(false);
        setLoading(true);

        try {
            const amount = parseInt(formData.amount, 10);
            if (isNaN(amount) || amount <= 0) {
                showToast(t('transfer.error.invalidAmount'), 'error');
                setLoading(false);
                return;
            }
            await transactionsAPI.createTransfer(recipientInfo.id, amount, formData.remark || undefined);

            // Update local user points
            const updatedUser = await usersAPI.getMe();
            updateUser(updatedUser);

            showToast(t('transfer.success', { points: amount.toLocaleString(), recipient: recipientInfo.name || recipientInfo.utorid }), 'success');
            navigate('/transactions');
        } catch (error) {
            showToast(error.response?.data?.error || t('transfer.error.generic'), 'error');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <Layout>
                <LoadingSpinner text={t('common:loading')} />
            </Layout>
        );
    }

    const transferAmount = parseInt(formData.amount, 10);
    const isValidAmount = !isNaN(transferAmount) && transferAmount > 0;

    return (
        <Layout>
            <div className="transfer-points-page">
                <PageHeader
                    icon={<ArrowLeftRight />}
                    title={t('transfer.title')}
                    subtitle={t('transfer.subtitle')}
                />

                <div className="transfer-content">
                    <div className="points-balance-card">
                        <span className="balance-label">{t('transfer.yourAvailablePoints')}</span>
                        <span className="balance-value">{user?.points?.toLocaleString() || 0}</span>
                    </div>

                    <form onSubmit={handleSubmit} className="transfer-form">
                        <div className="form-group">
                            <label htmlFor="recipientId" className="form-label">{t('transfer.recipientLabel')}</label>
                            <div className="lookup-input-wrapper">
                                <input
                                    type="text"
                                    id="recipientId"
                                    name="recipientId"
                                    value={formData.recipientId}
                                    onChange={handleChange}
                                    placeholder={t('transfer.recipientPlaceholder')}
                                    disabled={loading}
                                    className="form-input"
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary lookup-button"
                                    onClick={() => lookupRecipient()}
                                    disabled={loading || lookingUpRecipient}
                                >
                                    {lookingUpRecipient ? t('transfer.lookingUp') : t('transfer.lookUp')}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost scan-button"
                                    onClick={() => setShowScanner(true)}
                                    disabled={loading}
                                    aria-label={t('transfer.scanQr')}
                                >
                                    📷
                                </button>
                            </div>
                            {errors.recipientId && <span className="input-error">{errors.recipientId}</span>}

                            {recipientInfo && (
                                <div className="recipient-info">
                                    {recipientInfo.verified ? (
                                        <span className="recipient-verified">✓ {t('transfer.verified')}</span>
                                    ) : (
                                        <span className="recipient-unverified">⚠ {t('transfer.unverified')}</span>
                                    )}
                                    <div className="recipient-details">
                                        <span className="recipient-name">{recipientInfo.name || t('transfer.noName')}</span>
                                        <span className="recipient-utorid">@{recipientInfo.utorid}</span>
                                    </div>
                                    {!recipientInfo.verified && (
                                        <div className="recipient-warning">
                                            {t('transfer.unverifiedWarning')}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="amount" className="form-label">{t('transfer.amountLabel')}</label>
                            <input
                                type="number"
                                id="amount"
                                name="amount"
                                className="form-input"
                                value={formData.amount}
                                onChange={handleChange}
                                placeholder={t('transfer.amountPlaceholder')}
                                min="1"
                                max={user?.points || 0}
                                disabled={loading}
                            />
                            {errors.amount && <span className="input-error">{errors.amount}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="remark" className="form-label">{t('transfer.remarkLabel')}</label>
                            <textarea
                                id="remark"
                                name="remark"
                                className="form-textarea"
                                value={formData.remark}
                                onChange={handleChange}
                                placeholder={t('transfer.remarkPlaceholder')}
                                rows={3}
                                disabled={loading}
                            />
                        </div>

                        <div className="transfer-summary">
                            <h3>{t('transfer.summary')}</h3>
                            <div className="summary-row">
                                <span>{t('transfer.to')}</span>
                                <span>{recipientInfo ? `${recipientInfo.name || recipientInfo.utorid} (@${recipientInfo.utorid})` : '-'}</span>
                            </div>
                            <div className="summary-row">
                                <span>{t('transfer.amount')}</span>
                                <span>{isValidAmount ? `${transferAmount.toLocaleString()} ${t('common:points')}` : '-'}</span>
                            </div>
                            <div className="summary-row">
                                <span>{t('transfer.balanceAfter')}</span>
                                <span>
                                    {isValidAmount
                                        ? `${(user.points - transferAmount).toLocaleString()} ${t('common:points')}`
                                        : `${user?.points?.toLocaleString() || 0} ${t('common:points')}`}
                                </span>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate(-1)}
                                disabled={loading}
                            >
                                {t('common:cancel')}
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading || !recipientInfo || !recipientInfo?.verified}
                            >
                                {loading ? t('transfer.submitting') : t('transfer.submit')}
                            </button>
                        </div>
                    </form>
                </div>

                <ConfirmDialog
                    isOpen={showConfirm}
                    onClose={() => setShowConfirm(false)}
                    onConfirm={handleConfirmTransfer}
                    title={t('transfer.confirmTitle')}
                    message={t('transfer.confirmMessage', { points: transferAmount?.toLocaleString() || 0, recipient: recipientInfo?.name || recipientInfo?.utorid })}
                    confirmText={t('common:confirm')}
                    variant="primary"
                />

                <QrScanner
                    isOpen={showScanner}
                    onScan={handleQrScan}
                    onClose={() => setShowScanner(false)}
                    onError={(err) => console.warn('QR Scanner error:', err)}
                />
            </div>
        </Layout>
    );
};

export default TransferPointsPage;
