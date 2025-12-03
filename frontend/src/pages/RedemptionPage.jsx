import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { transactionsAPI, usersAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, ConfirmDialog } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
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

    const validateForm = () => {
        const newErrors = {};

        const amountNum = parseInt(amount, 10);
        if (!amount || isNaN(amountNum) || amountNum <= 0) {
            newErrors.amount = 'Please enter a valid positive amount';
        } else if (amountNum > user.points) {
            newErrors.amount = `Insufficient points. You have ${user.points} points available.`;
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
                <LoadingSpinner text="Loading..." />
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
                        <h1>Redemption Request Created!</h1>
                        <p>Your redemption request has been submitted successfully.</p>

                        <div className="redemption-details">
                            <div className="detail-row">
                                <span>Request ID:</span>
                                <span>#{redemptionResult.id}</span>
                            </div>
                            <div className="detail-row">
                                <span>Points:</span>
                                <span>{redemptionResult.amount?.toLocaleString() || parseInt(amount, 10).toLocaleString()}</span>
                            </div>
                            <div className="detail-row">
                                <span>Status:</span>
                                <span className="status-pending">Pending Processing</span>
                            </div>
                        </div>

                        <div className="success-actions">
                            <button
                                className="btn btn-primary view-qr-button"
                                onClick={() => navigate(`/redeem/${redemptionResult.id}/qr`)}
                            >
                                <span>📱</span> View QR Code
                            </button>
                            <button
                                className="btn btn-secondary view-transactions-button"
                                onClick={() => navigate('/transactions')}
                            >
                                View My Transactions
                            </button>
                            <button
                                className="btn btn-secondary new-redemption-button"
                                onClick={() => {
                                    setRedemptionResult(null);
                                    setAmount('');
                                    setRemark('');
                                }}
                            >
                                Create Another Redemption
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
                <div className="page-header">
                    <h1 className="page-title">Redeem Points</h1>
                    <p className="page-subtitle">Create a redemption request to spend your points</p>
                </div>

                <div className="redemption-content">
                    <div className="points-balance-card">
                        <span className="balance-label">Your Available Points</span>
                        <span className="balance-value">{user?.points?.toLocaleString() || 0}</span>
                    </div>

                    <form onSubmit={handleSubmit} className="redemption-form">
                        <div className="form-group">
                            <label htmlFor="amount" className="form-label">Points to Redeem</label>
                            <input
                                type="number"
                                id="amount"
                                className="form-input"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    if (errors.amount) setErrors(prev => ({ ...prev, amount: null }));
                                }}
                                placeholder="Enter amount"
                                min="1"
                                max={user?.points || 0}
                                disabled={loading}
                            />
                            {errors.amount && <span className="input-error">{errors.amount}</span>}

                            <div className="quick-amounts">
                                <span className="quick-label">Quick select:</span>
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
                            <label htmlFor="remark" className="form-label">Remark (Optional)</label>
                            <textarea
                                id="remark"
                                className="form-textarea"
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder="Add a note for this redemption"
                                rows={3}
                                disabled={loading}
                            />
                        </div>

                        <div className="redemption-summary">
                            <h3>Redemption Summary</h3>
                            <div className="summary-row">
                                <span>Points to redeem:</span>
                                <span>{amount ? parseInt(amount, 10).toLocaleString() : '-'}</span>
                            </div>
                            <div className="summary-row">
                                <span>Your balance after:</span>
                                <span>
                                    {amount && !isNaN(parseInt(amount, 10))
                                        ? `${(user.points - parseInt(amount, 10)).toLocaleString()} points`
                                        : `${user?.points?.toLocaleString() || 0} points`
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
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading || !amount}
                            >
                                {loading ? 'Processing...' : 'Create Redemption Request'}
                            </button>
                        </div>
                    </form>

                    <div className="redemption-info">
                        <h3>How Redemption Works</h3>
                        <ol>
                            <li>Create a redemption request with the number of points you want to redeem</li>
                            <li>Show the generated QR code to a cashier</li>
                            <li>The cashier will process your request and you'll receive your reward</li>
                        </ol>
                    </div>
                </div>

                <ConfirmDialog
                    isOpen={showConfirm}
                    onClose={() => setShowConfirm(false)}
                    onConfirm={handleConfirmRedemption}
                    title="Confirm Redemption"
                    message={`Are you sure you want to redeem ${parseInt(amount, 10)?.toLocaleString() || 0} points?`}
                    confirmText="Redeem"
                    variant="primary"
                />
            </div>
        </Layout>
    );
};

export default RedemptionPage;
