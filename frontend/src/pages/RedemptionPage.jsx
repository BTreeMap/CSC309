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
            newErrors.amount = t('transactions:redeem.error.invalidAmount');
        } else if (amountNum > user.points) {
            newErrors.amount = t('transactions:redeem.error.insufficientPoints', { points: user.points });
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
            showToast(t('transactions:redeem.success.message'), 'success');
        } catch (error) {
            showToast(error.response?.data?.error || t('transactions:redeem.error.generic'), 'error');
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
                        <div className="success-icon">✓</div>
                        <h1>{t('transactions:redeem.success.title')}</h1>
                        <p>{t('transactions:redeem.success.message')}</p>

                        <div className="redemption-details">
                            <div className="detail-row">
                                <span>{t('transactions:redeem.success.requestId')}</span>
                                <span>#{redemptionResult.id}</span>
                            </div>
                            <div className="detail-row">
                                <span>{t('transactions:redeem.success.points')}</span>
                                <span>{redemptionResult.amount?.toLocaleString() || parseInt(amount, 10).toLocaleString()}</span>
                            </div>
                            <div className="detail-row">
                                <span>{t('transactions:redeem.success.status')}</span>
                                <span className="status-pending">{t('transactions:redeem.success.pendingProcessing')}</span>
                            </div>
                        </div>

                        <div className="success-actions">
                            <button
                                className="btn btn-primary view-qr-button"
                                onClick={() => navigate(`/redeem/${redemptionResult.id}/qr`)}
                            >
                                <span>📱</span> {t('transactions:redeem.success.viewQr')}
                            </button>
                            <button
                                className="btn btn-secondary view-transactions-button"
                                onClick={() => navigate('/transactions')}
                            >
                                {t('transactions:redeem.success.viewTransactions')}
                            </button>
                            <button
                                className="btn btn-secondary new-redemption-button"
                                onClick={() => {
                                    setRedemptionResult(null);
                                    setAmount('');
                                    setRemark('');
                                }}
                            >
                                {t('transactions:redeem.success.createAnother')}
                            </button>
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
                                placeholder={t('transactions:redeem.enterAmount')}
                                min="1"
                                max={user?.points || 0}
                                disabled={loading}
                            />
                            {errors.amount && <span className="input-error">{errors.amount}</span>}

                            <div className="quick-amounts">
                                <span className="quick-label">{t('transactions:redeem.quickSelect')}</span>
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
                            <label htmlFor="remark" className="form-label">{t('transactions:redeem.remarkLabel')}</label>
                            <textarea
                                id="remark"
                                className="form-textarea"
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder={t('transactions:redeem.remarkPlaceholder')}
                                rows={3}
                                disabled={loading}
                            />
                        </div>

                        <div className="redemption-summary">
                            <h3>{t('transactions:redeem.summary.title')}</h3>
                            <div className="summary-row">
                                <span>{t('transactions:redeem.summary.pointsToRedeem')}</span>
                                <span>{amount ? parseInt(amount, 10).toLocaleString() : '-'}</span>
                            </div>
                            <div className="summary-row">
                                <span>{t('transactions:redeem.summary.balanceAfter')}</span>
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
                                {loading ? t('transactions:redeem.submitting') : t('transactions:redeem.submit')}
                            </button>
                        </div>
                    </form>

                    <div className="redemption-info">
                        <h3>{t('transactions:redeem.howItWorks.title')}</h3>
                        <ol>
                            <li>{t('transactions:redeem.howItWorks.step1')}</li>
                            <li>{t('transactions:redeem.howItWorks.step2')}</li>
                            <li>{t('transactions:redeem.howItWorks.step3')}</li>
                        </ol>
                    </div>
                </div>

                <ConfirmDialog
                    isOpen={showConfirm}
                    onClose={() => setShowConfirm(false)}
                    onConfirm={handleConfirmRedemption}
                    title={t('transactions:redeem.confirmTitle')}
                    message={t('transactions:redeem.confirmMessage', { points: parseInt(amount, 10)?.toLocaleString() || 0 })}
                    confirmText={t('transactions:redeem.confirmButton')}
                    variant="primary"
                />
            </div>
        </Layout>
    );
};

export default RedemptionPage;
