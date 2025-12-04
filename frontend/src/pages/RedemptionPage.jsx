import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { transactionsAPI, usersAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, ConfirmDialog, PageHeader } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import { Target } from 'lucide-react';
import './RedemptionPage.css';

const RedemptionPage = () => {
    const { user, loading: authLoading, updateUser } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [amount, setAmount] = useState('');
    const [remark, setRemark] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showConfirm, setShowConfirm] = useState(false);
    const [redemptionResult, setRedemptionResult] = useState(null);

    const quickAmounts = [100, 500, 1000, 2500, 5000];
    const { t } = useTranslation(['transactions', 'common']);

    const validateForm = () => {
        const newErrors = {};

        const amountNum = parseInt(amount, 10);
        if (!amount || isNaN(amountNum) || amountNum <= 0) {
            newErrors.amount = t('redemption.error.invalidAmount');
        } else if (amountNum > user.points) {
            newErrors.amount = t('redemption.error.insufficientPoints');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setShowConfirm(true);
    };

    const handleConfirmRedemption = async () => {
        setShowConfirm(false);
        setLoading(true);

        try {
            const amountNum = parseInt(amount, 10);
            const result = await transactionsAPI.createRedemption(amountNum, remark || undefined);

            // Update local user points
            const updatedUser = await usersAPI.getMe();
            updateUser(updatedUser);

            setRedemptionResult(result);
            showToast('Redemption request created successfully!', 'success');
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to create redemption request', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAmount = (quickAmount) => {
        if (quickAmount <= user.points) {
            setAmount(quickAmount.toString());
            setErrors(prev => ({ ...prev, amount: null }));
        }
    };

    if (authLoading) {
        return (
            <Layout>
                <LoadingSpinner text={t('common:loading')} />
            </Layout>
        );
    }

    // Show success view with QR code link
    if (redemptionResult) {
        return (
            <Layout>
                <div className="redemption-page">
                    <div className="redemption-success">
                        <div className="success-content">
                            <span className="success-icon">✅</span>
                            <h2>{t('redemption.successTitle')}</h2>
                            <p>{t('redemption.successMessage')}</p>
                            <div className="redemption-details">
                                <div className="detail-row">
                                    <span>{t('redemption.transactionId')}:</span>
                                    <span>#{redemptionResult.id}</span>
                                </div>
                                <div className="detail-row">
                                    <span>{t('common:points')}:</span>
                                    <span>{redemptionResult.amount?.toLocaleString() || parseInt(amount, 10).toLocaleString()}</span>
                                </div>
                                <div className="detail-row">
                                    <span>{t('common:status')}:</span>
                                    <span className="status-pending">{t('redemption.pendingProcessing')}</span>
                                </div>
                            </div>

                            <div className="success-actions">
                                <button
                                    className="btn btn-primary view-qr-button"
                                    onClick={() => navigate(`/redeem/${redemptionResult.id}/qr`)}
                                >
                                    <span>📱</span> {t('redemption.viewQRCode')}
                                </button>
                                <button
                                    className="btn btn-secondary view-transactions-button"
                                    onClick={() => navigate('/transactions')}
                                >
                                    {t('redemption.viewMyTransactions')}
                                </button>
                                <button
                                    className="btn btn-secondary new-redemption-button"
                                    onClick={() => {
                                        setRedemptionResult(null);
                                        setAmount('');
                                        setRemark('');
                                    }}
                                >
                                    {t('redemption.createAnother')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="redemption-page">
                <PageHeader
                    icon={<Target />}
                    title={t('transactions:redeem.title')}
                    subtitle={t('transactions:redeem.subtitle')}
                />

                <div className="redemption-content">
                    <div className="points-balance-card">
                        <span className="balance-label">{t('transactions:redeem.yourAvailablePoints')}</span>
                        <span className="balance-value">{user?.points?.toLocaleString() || 0}</span>
                    </div>

                    <form onSubmit={handleSubmit} className="redemption-form">
                        <div className="form-group">
                            <label htmlFor="amount" className="form-label">{t('transactions:redeem.pointsToRedeem')}</label>
                            <input
                                type="number"
                                id="amount"
                                className="form-input"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    if (errors.amount) setErrors(prev => ({ ...prev, amount: null }));
                                }}
                                placeholder={t('redemption.enterAmount')}
                                min="1"
                                max={user?.points || 0}
                                disabled={loading}
                            />
                            {errors.amount && <span className="input-error">{errors.amount}</span>}

                            <div className="quick-amounts">
                                <span className="quick-label">{t('redemption.quickSelect')}</span>
                                {quickAmounts.map(qa => (
                                    <button
                                        key={qa}
                                        type="button"
                                        className={`quick-amount-button ${amount === qa.toString() ? 'active' : ''} ${qa > user.points ? 'disabled' : ''}`}
                                        onClick={() => handleQuickAmount(qa)}
                                        disabled={qa > user.points}
                                    >
                                        {qa.toLocaleString()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="remark" className="form-label">{t('redemption.remarkLabel')}</label>
                            <textarea
                                id="remark"
                                className="form-textarea"
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder={t('redemption.remarkPlaceholder')}
                                rows={3}
                                disabled={loading}
                            />
                        </div>

                        <div className="redemption-summary">
                            <h3>{t('redemption.summary')}</h3>
                            <div className="summary-row">
                                <span>{t('redemption.pointsToRedeemSummary')}</span>
                                <span>{amount ? parseInt(amount, 10).toLocaleString() : '-'}</span>
                            </div>
                            <div className="summary-row">
                                <span>{t('redemption.balanceAfter')}</span>
                                <span>
                                    {amount && !isNaN(parseInt(amount, 10))
                                        ? `${(user.points - parseInt(amount, 10)).toLocaleString()} ${t('common:points')}`
                                        : `${user?.points?.toLocaleString() || 0} ${t('common:points')}`
                                    }
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
                                disabled={loading || !amount}
                            >
                                {loading ? t('common:processing') : t('redemption.createRequest')}
                            </button>
                        </div>
                    </form>

                    <div className="redemption-info">
                        <h3>{t('redemption.howItWorks.title')}</h3>
                        <ol>
                            <li>{t('redemption.howItWorks.step1')}</li>
                            <li>{t('redemption.howItWorks.step2')}</li>
                            <li>{t('redemption.howItWorks.step3')}</li>
                        </ol>
                    </div>
                </div>

                <ConfirmDialog
                    isOpen={showConfirm}
                    onClose={() => setShowConfirm(false)}
                    onConfirm={handleConfirmRedemption}
                    title={t('redemption.confirmTitle')}
                    message={t('redemption.confirmMessage', { points: parseInt(amount, 10)?.toLocaleString() || 0 })}
                    confirmText={t('common:redeem')}
                    variant="primary"
                />
            </div>
        </Layout>
    );
};

export default RedemptionPage;
