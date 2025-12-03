import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { transactionsAPI, usersAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, ConfirmDialog, QrScanner } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import { parseQrPayload, extractUserIdentifier, QR_PAYLOAD_TYPES } from '../utils/qrPayload';
import './TransferPointsPage.css';

const INITIAL_FORM_STATE = {
    recipientId: '',
    amount: '',
    remark: '',
};

const TransferPointsPage = () => {
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
            setErrors((prev) => ({ ...prev, recipientId: 'Please enter a user ID or UTORid' }));
            return;
        }

        setLookingUpRecipient(true);
        setRecipientInfo(null);

        try {
            // First try to look up by UTORid
            const response = await usersAPI.getUsers({ name: trimmedId, limit: 5 });

            if (response.results?.length > 0) {
                // Find exact match by utorid or id
                const exactMatch = response.results.find(
                    (u) => u.utorid === trimmedId || u.id.toString() === trimmedId
                );

                if (exactMatch) {
                    if (exactMatch.id === user.id) {
                        setErrors((prev) => ({ ...prev, recipientId: 'You cannot transfer points to yourself' }));
                    } else {
                        setRecipientInfo(exactMatch);
                        setErrors((prev) => {
                            const { recipientId: _, ...rest } = prev;
                            return rest;
                        });
                    }
                } else {
                    setErrors((prev) => ({ ...prev, recipientId: 'User not found. Please check the ID or UTORid.' }));
                }
            } else {
                setErrors((prev) => ({ ...prev, recipientId: 'User not found. Please check the ID or UTORid.' }));
            }
        } catch {
            setErrors((prev) => ({ ...prev, recipientId: 'Failed to look up user. Please try again.' }));
        } finally {
            setLookingUpRecipient(false);
        }
    }, [formData.recipientId, user.id]);

    const handleQrScan = useCallback((rawData) => {
        setShowScanner(false);
        if (!rawData) return;

        // Parse the QR payload
        const payload = parseQrPayload(rawData);

        if (!payload.isValid) {
            showToast(payload.error || 'Invalid QR code', 'error');
            return;
        }

        // Validate this is a user QR code
        if (payload.type === QR_PAYLOAD_TYPES.REDEMPTION) {
            showToast('This is a redemption QR code. Please scan a user\'s personal QR code.', 'error');
            return;
        }

        // Extract user identifier
        const identifier = extractUserIdentifier(payload);
        if (!identifier) {
            showToast('Could not extract user information from QR code', 'error');
            return;
        }

        // Set the identifier and lookup
        const identifierStr = String(identifier);
        setFormData((prev) => ({ ...prev, recipientId: identifierStr }));
        lookupRecipient(identifierStr);
    }, [lookupRecipient, showToast]);

    const validateForm = useCallback(() => {
        const newErrors = {};

        if (!recipientInfo) {
            newErrors.recipientId = 'Please look up and verify the recipient';
        } else if (!recipientInfo.verified) {
            newErrors.recipientId = 'Recipient must be verified to receive points';
        }

        const amount = parseInt(formData.amount, 10);
        if (!formData.amount || isNaN(amount) || amount <= 0) {
            newErrors.amount = 'Please enter a valid positive amount';
        } else if (amount > user.points) {
            newErrors.amount = `Insufficient points. You have ${user.points.toLocaleString()} points available.`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [recipientInfo, formData.amount, user.points]);

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
                showToast('Invalid amount', 'error');
                setLoading(false);
                return;
            }
            await transactionsAPI.createTransfer(recipientInfo.id, amount, formData.remark || undefined);

            // Update local user points
            const updatedUser = await usersAPI.getMe();
            updateUser(updatedUser);

            showToast(`Successfully transferred ${amount.toLocaleString()} points to ${recipientInfo.name || recipientInfo.utorid}`, 'success');
            navigate('/transactions');
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to transfer points', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <Layout>
                <LoadingSpinner text="Loading..." />
            </Layout>
        );
    }

    const transferAmount = parseInt(formData.amount, 10);
    const isValidAmount = !isNaN(transferAmount) && transferAmount > 0;

    return (
        <Layout>
            <div className="transfer-points-page">
                <div className="transfer-header">
                    <h1>Transfer Points</h1>
                    <p>Send points to another user</p>
                </div>

                <div className="transfer-content">
                    <div className="points-balance-card">
                        <span className="balance-label">Your Available Points</span>
                        <span className="balance-value">{user?.points?.toLocaleString() || 0}</span>
                    </div>

                    <form onSubmit={handleSubmit} className="transfer-form">
                        <div className="form-group">
                            <label htmlFor="recipientId" className="form-label">Recipient User ID or UTORid</label>
                            <div className="lookup-input-wrapper">
                                <input
                                    type="text"
                                    id="recipientId"
                                    name="recipientId"
                                    value={formData.recipientId}
                                    onChange={handleChange}
                                    placeholder="Enter user ID or UTORid"
                                    disabled={loading}
                                    className="form-input"
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary lookup-button"
                                    onClick={() => lookupRecipient()}
                                    disabled={loading || lookingUpRecipient}
                                >
                                    {lookingUpRecipient ? 'Looking...' : 'Look Up'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost scan-button"
                                    onClick={() => setShowScanner(true)}
                                    disabled={loading}
                                    aria-label="Scan QR Code"
                                >
                                    📷
                                </button>
                            </div>
                            {errors.recipientId && <span className="input-error">{errors.recipientId}</span>}

                            {recipientInfo && (
                                <div className="recipient-info">
                                    {recipientInfo.verified ? (
                                        <span className="recipient-verified">✓ Verified</span>
                                    ) : (
                                        <span className="recipient-unverified">⚠ Unverified</span>
                                    )}
                                    <div className="recipient-details">
                                        <span className="recipient-name">{recipientInfo.name || 'No name'}</span>
                                        <span className="recipient-utorid">@{recipientInfo.utorid}</span>
                                    </div>
                                    {!recipientInfo.verified && (
                                        <div className="recipient-warning">
                                            This user is not verified. Transfers to unverified users are not allowed.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="amount" className="form-label">Amount to Transfer</label>
                            <input
                                type="number"
                                id="amount"
                                name="amount"
                                className="form-input"
                                value={formData.amount}
                                onChange={handleChange}
                                placeholder="Enter amount"
                                min="1"
                                max={user?.points || 0}
                                disabled={loading}
                            />
                            {errors.amount && <span className="input-error">{errors.amount}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="remark" className="form-label">Remark (Optional)</label>
                            <textarea
                                id="remark"
                                name="remark"
                                className="form-textarea"
                                value={formData.remark}
                                onChange={handleChange}
                                placeholder="Add a note for this transfer"
                                rows={3}
                                disabled={loading}
                            />
                        </div>

                        <div className="transfer-summary">
                            <h3>Transfer Summary</h3>
                            <div className="summary-row">
                                <span>To:</span>
                                <span>{recipientInfo ? `${recipientInfo.name || recipientInfo.utorid} (@${recipientInfo.utorid})` : '-'}</span>
                            </div>
                            <div className="summary-row">
                                <span>Amount:</span>
                                <span>{isValidAmount ? `${transferAmount.toLocaleString()} points` : '-'}</span>
                            </div>
                            <div className="summary-row">
                                <span>Your balance after:</span>
                                <span>
                                    {isValidAmount
                                        ? `${(user.points - transferAmount).toLocaleString()} points`
                                        : `${user?.points?.toLocaleString() || 0} points`}
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
                                disabled={loading || !recipientInfo || !recipientInfo?.verified}
                            >
                                {loading ? 'Processing...' : 'Transfer Points'}
                            </button>
                        </div>
                    </form>
                </div>

                <ConfirmDialog
                    isOpen={showConfirm}
                    onClose={() => setShowConfirm(false)}
                    onConfirm={handleConfirmTransfer}
                    title="Confirm Transfer"
                    message={`Are you sure you want to transfer ${transferAmount?.toLocaleString() || 0} points to ${recipientInfo?.name || recipientInfo?.utorid}?`}
                    confirmText="Transfer"
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
