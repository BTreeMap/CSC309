import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { transactionsAPI, usersAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, useToast, ConfirmDialog } from '../components/shared';
import './TransferPointsPage.css';

const TransferPointsPage = () => {
    const { user, loading: authLoading, updateUser } = useAuth();
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    const [formData, setFormData] = useState({
        recipientId: '',
        amount: '',
        remark: '',
    });
    const [recipientInfo, setRecipientInfo] = useState(null);
    const [lookingUpRecipient, setLookingUpRecipient] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showConfirm, setShowConfirm] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
        // Clear recipient info when ID changes
        if (name === 'recipientId') {
            setRecipientInfo(null);
        }
    };

    const lookupRecipient = async () => {
        if (!formData.recipientId.trim()) {
            setErrors(prev => ({ ...prev, recipientId: 'Please enter a user ID or UTORid' }));
            return;
        }

        setLookingUpRecipient(true);
        setRecipientInfo(null);

        try {
            // First try to look up by UTORid
            const response = await usersAPI.getUsers({ name: formData.recipientId, limit: 5 });

            if (response.results && response.results.length > 0) {
                // Find exact match by utorid or id
                const exactMatch = response.results.find(
                    u => u.utorid === formData.recipientId || u.id.toString() === formData.recipientId
                );

                if (exactMatch) {
                    if (exactMatch.id === user.id) {
                        setErrors(prev => ({ ...prev, recipientId: 'You cannot transfer points to yourself' }));
                    } else {
                        setRecipientInfo(exactMatch);
                        setErrors(prev => ({ ...prev, recipientId: null }));
                    }
                } else {
                    setErrors(prev => ({ ...prev, recipientId: 'User not found. Please check the ID or UTORid.' }));
                }
            } else {
                setErrors(prev => ({ ...prev, recipientId: 'User not found. Please check the ID or UTORid.' }));
            }
        } catch (error) {
            setErrors(prev => ({ ...prev, recipientId: 'Failed to look up user. Please try again.' }));
        } finally {
            setLookingUpRecipient(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!recipientInfo) {
            newErrors.recipientId = 'Please look up and verify the recipient';
        }

        const amount = parseInt(formData.amount, 10);
        if (!formData.amount || isNaN(amount) || amount <= 0) {
            newErrors.amount = 'Please enter a valid positive amount';
        } else if (amount > user.points) {
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

    const handleConfirmTransfer = async () => {
        setShowConfirm(false);
        setLoading(true);

        try {
            const amount = parseInt(formData.amount, 10);
            await transactionsAPI.createTransfer(recipientInfo.id, amount, formData.remark || undefined);

            // Update local user points
            const updatedUser = await usersAPI.getMe();
            updateUser(updatedUser);

            showSuccess(`Successfully transferred ${amount} points to ${recipientInfo.name || recipientInfo.utorid}`);
            navigate('/my-transactions');
        } catch (error) {
            showError(error.response?.data?.error || 'Failed to transfer points');
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
                            <label htmlFor="recipientId">Recipient User ID or UTORid</label>
                            <div className="lookup-input-wrapper">
                                <input
                                    type="text"
                                    id="recipientId"
                                    name="recipientId"
                                    value={formData.recipientId}
                                    onChange={handleChange}
                                    placeholder="Enter user ID or UTORid"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="lookup-button"
                                    onClick={lookupRecipient}
                                    disabled={loading || lookingUpRecipient}
                                >
                                    {lookingUpRecipient ? 'Looking...' : 'Look Up'}
                                </button>
                            </div>
                            {errors.recipientId && <span className="input-error">{errors.recipientId}</span>}

                            {recipientInfo && (
                                <div className="recipient-info">
                                    <span className="recipient-verified">✓ Verified</span>
                                    <div className="recipient-details">
                                        <span className="recipient-name">{recipientInfo.name || 'No name'}</span>
                                        <span className="recipient-utorid">@{recipientInfo.utorid}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="amount">Amount to Transfer</label>
                            <input
                                type="number"
                                id="amount"
                                name="amount"
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
                            <label htmlFor="remark">Remark (Optional)</label>
                            <textarea
                                id="remark"
                                name="remark"
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
                                <span>{formData.amount ? `${parseInt(formData.amount, 10).toLocaleString()} points` : '-'}</span>
                            </div>
                            <div className="summary-row">
                                <span>Your balance after:</span>
                                <span>
                                    {formData.amount && !isNaN(parseInt(formData.amount, 10))
                                        ? `${(user.points - parseInt(formData.amount, 10)).toLocaleString()} points`
                                        : `${user?.points?.toLocaleString() || 0} points`
                                    }
                                </span>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="cancel-button"
                                onClick={() => navigate(-1)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="transfer-button"
                                disabled={loading || !recipientInfo}
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
                    message={`Are you sure you want to transfer ${parseInt(formData.amount, 10)?.toLocaleString() || 0} points to ${recipientInfo?.name || recipientInfo?.utorid}?`}
                    confirmText="Transfer"
                    variant="primary"
                />
            </div>
        </Layout>
    );
};

export default TransferPointsPage;
