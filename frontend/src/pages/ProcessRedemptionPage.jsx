import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { transactionsAPI, usersAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, ErrorMessage, ConfirmDialog, QrScanner } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import './ProcessRedemptionPage.css';

const ProcessRedemptionPage = () => {
    const { transactionId } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [transaction, setTransaction] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [manualId, setManualId] = useState('');

    useEffect(() => {
        if (transactionId) {
            fetchTransactionData(transactionId);
        }
    }, [transactionId]);

    const fetchTransactionData = async (id) => {
        setLoading(true);
        setError(null);

        try {
            // Fetch transaction details
            const txn = await transactionsAPI.getTransaction(id);

            // Verify it's a redemption transaction
            if (txn.type !== 'redemption') {
                setError('This is not a redemption transaction');
                setLoading(false);
                return;
            }

            setTransaction(txn);

            // Fetch user info
            const user = await usersAPI.getUser(txn.utorid);
            setUserInfo(user);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load transaction');
        } finally {
            setLoading(false);
        }
    };

    const handleQrScan = (data) => {
        setShowScanner(false);
        if (data) {
            // Navigate to the scanned transaction ID
            const scannedId = data.trim();
            navigate(`/cashier/redemption/${scannedId}`);
        }
    };

    const handleManualLookup = () => {
        if (!manualId.trim()) {
            showToast('Please enter a redemption ID', 'error');
            return;
        }
        navigate(`/cashier/redemption/${manualId.trim()}`);
    };

    const handleProcess = async () => {
        setProcessing(true);

        try {
            await transactionsAPI.processRedemption(transaction.id);
            showToast('Redemption processed successfully!', 'success');
            navigate('/cashier/redemption');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to process redemption', 'error');
        } finally {
            setProcessing(false);
            setShowConfirm(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
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
                    <div className="page-header">
                        <h1>Process Redemption</h1>
                        <p>Scan a customer's QR code to process their redemption request</p>
                    </div>

                    <div className="scanner-section">
                        <button
                            className="btn btn-primary btn-lg scan-qr-btn"
                            onClick={() => setShowScanner(true)}
                        >
                            <span className="btn-icon">📷</span>
                            Scan QR Code
                        </button>

                        <div className="manual-lookup">
                            <p className="divider-text">or enter redemption ID manually</p>
                            <div className="manual-input-group">
                                <input
                                    type="text"
                                    value={manualId}
                                    onChange={(e) => setManualId(e.target.value)}
                                    placeholder="Enter Redemption ID"
                                    className="form-input"
                                    onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                                />
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleManualLookup}
                                >
                                    Look Up
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
                <LoadingSpinner text="Loading redemption details..." />
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="process-redemption-page">
                    <ErrorMessage message={error} />
                    <button onClick={() => navigate('/cashier/redemption')} className="btn btn-secondary">
                        ← Go Back
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
                        <h2>Redemption Not Found</h2>
                        <p>The redemption request could not be found.</p>
                        <button onClick={() => navigate('/cashier/redemption')} className="btn btn-secondary">
                            ← Go Back
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    const isProcessed = !!transaction.processedAt;
    const pointsToDeduct = Math.abs(transaction.amount);

    return (
        <Layout>
            <div className="process-redemption-page">
                <button onClick={() => navigate('/cashier/redemption')} className="btn btn-ghost back-button">
                    ← Back
                </button>

                <div className="page-header">
                    <h1>Process Redemption</h1>
                    <p>Review and process this redemption request</p>
                </div>

                <div className="redemption-card">
                    {isProcessed && (
                        <div className="processed-banner">
                            ✓ This redemption has already been processed
                        </div>
                    )}

                    <div className="redemption-header">
                        <div className="redemption-id">
                            <span className="label">Redemption ID</span>
                            <span className="value">#{transaction.id}</span>
                        </div>
                        <span className={`status-badge ${isProcessed ? 'processed' : 'pending'}`}>
                            {isProcessed ? 'Processed' : 'Pending'}
                        </span>
                    </div>

                    <div className="customer-section">
                        <h2>Customer Information</h2>
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
                                        <span className="stat-label">Current Points</span>
                                        <span className="stat-value">{userInfo?.points?.toLocaleString() || 0}</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-label">Account Status</span>
                                        <span className={`stat-value ${userInfo?.verified ? 'verified' : 'unverified'}`}>
                                            {userInfo?.verified ? '✓ Verified' : '⚠️ Unverified'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="redemption-details">
                        <h2>Redemption Details</h2>
                        <div className="details-grid">
                            <div className="detail-item">
                                <span className="detail-label">Points to Redeem</span>
                                <span className="detail-value points-value">{pointsToDeduct.toLocaleString()}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Requested On</span>
                                <span className="detail-value">{formatDate(transaction.createdAt)}</span>
                            </div>
                            {transaction.remark && (
                                <div className="detail-item full-width">
                                    <span className="detail-label">Remark</span>
                                    <span className="detail-value">{transaction.remark}</span>
                                </div>
                            )}
                            {isProcessed && (
                                <div className="detail-item">
                                    <span className="detail-label">Processed On</span>
                                    <span className="detail-value">{formatDate(transaction.processedAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {!isProcessed && (
                        <div className="action-section">
                            <div className="warning-note">
                                <span className="warning-icon">⚠️</span>
                                <p>Processing this redemption will deduct <strong>{pointsToDeduct.toLocaleString()} points</strong> from the customer's balance. Make sure to provide the equivalent value.</p>
                            </div>

                            <div className="action-buttons">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => setShowConfirm(true)}
                                    className="btn btn-success btn-process"
                                    disabled={processing}
                                >
                                    {processing ? 'Processing...' : 'Process Redemption'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <ConfirmDialog
                    isOpen={showConfirm}
                    onClose={() => setShowConfirm(false)}
                    onConfirm={handleProcess}
                    title="Confirm Redemption Processing"
                    message={
                        <div className="confirm-content">
                            <p>You are about to process this redemption:</p>
                            <div className="confirm-summary">
                                <p><strong>Customer:</strong> {userInfo?.name} (@{transaction.utorid})</p>
                                <p><strong>Points:</strong> {pointsToDeduct.toLocaleString()}</p>
                            </div>
                            <p className="confirm-warning">
                                Make sure you have provided the customer with their redeemed value before confirming.
                            </p>
                        </div>
                    }
                    confirmText="Confirm Processing"
                />
            </div>
        </Layout>
    );
};

export default ProcessRedemptionPage;
