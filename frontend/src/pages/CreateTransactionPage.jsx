import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionsAPI, usersAPI, promotionsAPI } from '../api';
import Layout from '../components/Layout';
import { useToast } from '../components/shared/ToastContext';
import { ConfirmDialog, QrScanner } from '../components/shared';
import './CreateTransactionPage.css';

const CreateTransactionPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [utorid, setUtorid] = useState('');
    const [spent, setSpent] = useState('');
    const [remark, setRemark] = useState('');
    const [promotionIds, setPromotionIds] = useState([]);
    const [availablePromotions, setAvailablePromotions] = useState([]);
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [calculatedPoints, setCalculatedPoints] = useState(null);
    const [error, setError] = useState(null);
    const [showScanner, setShowScanner] = useState(false);

    const handleLookupUser = async () => {
        if (!utorid.trim()) {
            setError('Please enter a UTORid');
            return;
        }

        setLookupLoading(true);
        setError(null);
        setUserInfo(null);

        try {
            const userData = await usersAPI.getUser(utorid.trim());
            setUserInfo(userData);

            // Also fetch available promotions
            const promoData = await promotionsAPI.getPromotions({ started: true, limit: 50 });
            const activePromos = (promoData.results || []).filter((p) => {
                const now = new Date();
                const end = new Date(p.endTime);
                return now <= end && p.type === 'automatic';
            });
            setAvailablePromotions(activePromos);
        } catch (err) {
            setError(err.response?.data?.error || 'User not found');
        } finally {
            setLookupLoading(false);
        }
    };

    const handlePromoToggle = (promoId) => {
        setPromotionIds((prev) =>
            prev.includes(promoId)
                ? prev.filter((id) => id !== promoId)
                : [...prev, promoId]
        );
    };

    const calculateExpectedPoints = () => {
        const basePoints = Math.floor(parseFloat(spent) * 4); // $0.25 = 1 point → $1 = 4 points
        let bonusPoints = 0;

        availablePromotions
            .filter((p) => promotionIds.includes(p.id))
            .forEach((promo) => {
                if (promo.minSpending && parseFloat(spent) < promo.minSpending) {
                    return;
                }
                bonusPoints += Math.floor(basePoints * promo.rate);
            });

        return { basePoints, bonusPoints, total: basePoints + bonusPoints };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!userInfo) {
            setError('Please look up a user first');
            return;
        }

        if (!spent || parseFloat(spent) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        const points = calculateExpectedPoints();
        setCalculatedPoints(points);
        setShowConfirm(true);
    };

    const handleConfirmTransaction = async () => {
        setLoading(true);

        try {
            const payload = {
                utorid: userInfo.utorid,
                spent: parseFloat(spent),
                promotionIds: promotionIds.length > 0 ? promotionIds : undefined,
                remark: remark.trim() || undefined,
            };

            const result = await transactionsAPI.createPurchase(payload);
            showToast(`Purchase recorded! ${result.points} points earned.`, 'success');

            // Reset form
            setUtorid('');
            setSpent('');
            setRemark('');
            setPromotionIds([]);
            setUserInfo(null);
            setShowConfirm(false);
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to create transaction', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleScanQR = () => {
        setShowScanner(true);
    };

    const handleQrScan = (data) => {
        // Close scanner and set the scanned UTORid
        setShowScanner(false);
        if (data) {
            setUtorid(data.trim());
            // Auto-lookup the user after scanning
            setError(null);
            setUserInfo(null);
            setLookupLoading(true);

            usersAPI.getUser(data.trim())
                .then(async (userData) => {
                    setUserInfo(userData);
                    // Also fetch available promotions
                    const promoData = await promotionsAPI.getPromotions({ started: true, limit: 50 });
                    const activePromos = (promoData.results || []).filter((p) => {
                        const now = new Date();
                        const end = new Date(p.endTime);
                        return now <= end && p.type === 'automatic';
                    });
                    setAvailablePromotions(activePromos);
                    showToast('Customer found!', 'success');
                })
                .catch((err) => {
                    setError(err.response?.data?.error || 'User not found');
                })
                .finally(() => {
                    setLookupLoading(false);
                });
        }
    };

    return (
        <Layout>
            <div className="create-transaction-page">
                <div className="page-header">
                    <h1>Create Purchase Transaction</h1>
                    <p>Record a new purchase and award points to a customer</p>
                </div>

                <div className="transaction-form-container">
                    <div className="form-section">
                        <h2>Step 1: Identify Customer</h2>
                        <div className="customer-lookup">
                            <div className="lookup-input-group">
                                <input
                                    type="text"
                                    value={utorid}
                                    onChange={(e) => setUtorid(e.target.value)}
                                    placeholder="Enter UTORid"
                                    className="lookup-input"
                                    onKeyDown={(e) => e.key === 'Enter' && handleLookupUser()}
                                />
                                <button
                                    type="button"
                                    onClick={handleLookupUser}
                                    className="btn-lookup"
                                    disabled={lookupLoading}
                                >
                                    {lookupLoading ? 'Looking up...' : 'Look Up'}
                                </button>
                            </div>

                            <button type="button" onClick={handleScanQR} className="btn-scan">
                                📷 Scan QR Code
                            </button>
                        </div>

                        {error && <div className="alert-error">{error}</div>}

                        {userInfo && (
                            <div className="customer-info">
                                <div className="customer-avatar">
                                    {userInfo.avatarUrl ? (
                                        <img src={userInfo.avatarUrl} alt={userInfo.name} />
                                    ) : (
                                        <span>👤</span>
                                    )}
                                </div>
                                <div className="customer-details">
                                    <h3>{userInfo.name}</h3>
                                    <p className="customer-utorid">@{userInfo.utorid}</p>
                                    <p className="customer-points">
                                        Current Points: <strong>{userInfo.points?.toLocaleString() || 0}</strong>
                                    </p>
                                    {!userInfo.verified && (
                                        <span className="unverified-badge">⚠️ Unverified Account</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {userInfo && (
                        <form onSubmit={handleSubmit}>
                            <div className="form-section">
                                <h2>Step 2: Transaction Details</h2>

                                <div className="form-group">
                                    <label htmlFor="spent" className="form-label">Amount Spent ($) *</label>
                                    <div className="amount-input-wrapper">
                                        <span className="currency-symbol">$</span>
                                        <input
                                            type="number"
                                            id="spent"
                                            value={spent}
                                            onChange={(e) => setSpent(e.target.value)}
                                            step="0.01"
                                            min="0.01"
                                            required
                                            placeholder="0.00"
                                            className="amount-input"
                                        />
                                    </div>
                                    {spent && parseFloat(spent) > 0 && (
                                        <div className="points-preview">
                                            Base points: <strong>{Math.floor(parseFloat(spent) * 4)}</strong>
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="remark" className="form-label">Remark (Optional)</label>
                                    <input
                                        type="text"
                                        id="remark"
                                        value={remark}
                                        onChange={(e) => setRemark(e.target.value)}
                                        placeholder="e.g., Coffee and sandwich"
                                        maxLength={200}
                                    />
                                </div>
                            </div>

                            {availablePromotions.length > 0 && (
                                <div className="form-section">
                                    <h2>Step 3: Apply Promotions (Optional)</h2>
                                    <div className="promotions-list">
                                        {availablePromotions.map((promo) => {
                                            const meetsMinSpending = !promo.minSpending || (spent && parseFloat(spent) >= promo.minSpending);
                                            return (
                                                <label
                                                    key={promo.id}
                                                    className={`promotion-item ${!meetsMinSpending ? 'disabled' : ''}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={promotionIds.includes(promo.id)}
                                                        onChange={() => handlePromoToggle(promo.id)}
                                                        disabled={!meetsMinSpending}
                                                    />
                                                    <div className="promotion-info">
                                                        <span className="promotion-name">{promo.name}</span>
                                                        <span className="promotion-rate">+{(promo.rate * 100).toFixed(0)}% bonus</span>
                                                        {promo.minSpending && (
                                                            <span className={`min-spending ${meetsMinSpending ? 'met' : ''}`}>
                                                                Min: ${promo.minSpending}
                                                            </span>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="form-actions">
                                <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Processing...' : 'Create Transaction'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Confirmation Dialog */}
                <ConfirmDialog
                    isOpen={showConfirm}
                    onClose={() => setShowConfirm(false)}
                    onConfirm={handleConfirmTransaction}
                    title="Confirm Transaction"
                    message={
                        calculatedPoints && (
                            <div className="confirm-details">
                                <p>Customer: <strong>{userInfo?.name}</strong></p>
                                <p>Amount: <strong>${parseFloat(spent).toFixed(2)}</strong></p>
                                <div className="points-breakdown">
                                    <p>Base Points: <strong>{calculatedPoints.basePoints}</strong></p>
                                    {calculatedPoints.bonusPoints > 0 && (
                                        <p>Bonus Points: <strong>+{calculatedPoints.bonusPoints}</strong></p>
                                    )}
                                    <p className="total-points">Total Points: <strong>{calculatedPoints.total}</strong></p>
                                </div>
                            </div>
                        )
                    }
                    confirmText="Confirm Transaction"
                />

                {/* QR Scanner Modal */}
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

export default CreateTransactionPage;
