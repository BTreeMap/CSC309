import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { promotionsAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import { LoadingSpinner, ErrorMessage } from '../../components/shared';
import './PromotionDetailPage.css';

const PromotionDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { activeRole } = useAuth();

    const [promotion, setPromotion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isManager = ['manager', 'superuser'].includes(activeRole);

    useEffect(() => {
        const fetchPromotion = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await promotionsAPI.getPromotion(id);
                setPromotion(data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load promotion');
            } finally {
                setLoading(false);
            }
        };

        fetchPromotion();
    }, [id]);

    const getPromotionStatus = (promotion) => {
        const now = new Date();
        const startDate = new Date(promotion.startTime);
        const endDate = new Date(promotion.endTime);

        if (now < startDate) return { label: 'Upcoming', className: 'status-upcoming', icon: '🕐' };
        if (now > endDate) return { label: 'Ended', className: 'status-ended', icon: '✓' };
        return { label: 'Active', className: 'status-active', icon: '🔥' };
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

    const getTypeLabel = (type) => {
        return type === 'automatic' ? 'Automatic' : 'One-Time Code';
    };

    const getDaysRemaining = (endTime) => {
        const now = new Date();
        const end = new Date(endTime);
        const diff = end - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return null;
        if (days === 0) return 'Ends today!';
        if (days === 1) return '1 day remaining';
        return `${days} days remaining`;
    };

    if (loading) {
        return (
            <Layout>
                <LoadingSpinner text="Loading promotion..." />
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <ErrorMessage message={error} onRetry={() => window.location.reload()} />
            </Layout>
        );
    }

    if (!promotion) {
        return (
            <Layout>
                <div className="not-found">
                    <h2>Promotion Not Found</h2>
                    <p>The promotion you're looking for doesn't exist or has been removed.</p>
                    <button onClick={() => navigate('/promotions')} className="btn-back">
                        Back to Promotions
                    </button>
                </div>
            </Layout>
        );
    }

    const status = getPromotionStatus(promotion);
    const daysRemaining = status.label === 'Active' ? getDaysRemaining(promotion.endTime) : null;

    return (
        <Layout>
            <div className="promotion-detail-page">
                <button onClick={() => navigate(-1)} className="back-button">
                    ← Back to Promotions
                </button>

                <div className="promotion-detail-card">
                    <div className="promotion-header">
                        <div className="header-top">
                            <span className={`promotion-status ${status.className}`}>
                                {status.icon} {status.label}
                            </span>
                            <span className="promotion-type-badge">{getTypeLabel(promotion.type)}</span>
                        </div>

                        <h1 className="promotion-title">{promotion.name}</h1>

                        {daysRemaining && (
                            <div className="days-remaining">{daysRemaining}</div>
                        )}
                    </div>

                    {promotion.description && (
                        <div className="promotion-description-section">
                            <h2>Description</h2>
                            <p>{promotion.description}</p>
                        </div>
                    )}

                    <div className="promotion-info-grid">
                        <div className="info-card">
                            <div className="info-icon">📅</div>
                            <div className="info-content">
                                <h3>Start Date</h3>
                                <p>{formatDate(promotion.startTime)}</p>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-icon">🏁</div>
                            <div className="info-content">
                                <h3>End Date</h3>
                                <p>{formatDate(promotion.endTime)}</p>
                            </div>
                        </div>

                        {promotion.type === 'automatic' && (
                            <>
                                <div className="info-card highlight">
                                    <div className="info-icon">💰</div>
                                    <div className="info-content">
                                        <h3>Bonus Rate</h3>
                                        <p className="bonus-value">+{(promotion.rate * 100).toFixed(0)}%</p>
                                        <span className="bonus-note">bonus points on purchases</span>
                                    </div>
                                </div>

                                {promotion.minSpending > 0 && (
                                    <div className="info-card">
                                        <div className="info-icon">🛒</div>
                                        <div className="info-content">
                                            <h3>Minimum Spending</h3>
                                            <p>${promotion.minSpending.toLocaleString()}</p>
                                            <span className="info-note">per transaction</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {promotion.type === 'one-time' && (
                            <div className="info-card highlight">
                                <div className="info-icon">🎯</div>
                                <div className="info-content">
                                    <h3>Points Reward</h3>
                                    <p className="bonus-value">+{promotion.points?.toLocaleString()}</p>
                                    <span className="bonus-note">one-time bonus points</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="how-it-works">
                        <h2>How It Works</h2>
                        {promotion.type === 'automatic' ? (
                            <ol className="steps-list">
                                <li>Make a purchase during the promotion period</li>
                                {promotion.minSpending > 0 && (
                                    <li>Ensure your purchase is at least ${promotion.minSpending}</li>
                                )}
                                <li>Earn +{(promotion.rate * 100).toFixed(0)}% bonus points automatically</li>
                                <li>Bonus points are added to your transaction</li>
                            </ol>
                        ) : (
                            <ol className="steps-list">
                                <li>Get the promotional code from a cashier</li>
                                <li>Redeem the code during checkout</li>
                                <li>Receive +{promotion.points?.toLocaleString()} bonus points</li>
                                <li>Each code can only be used once</li>
                            </ol>
                        )}
                    </div>

                    {isManager && (
                        <div className="manager-actions">
                            <h2>Manager Actions</h2>
                            <div className="action-buttons">
                                <button
                                    onClick={() => navigate(`/promotions/${promotion.id}/edit`)}
                                    className="btn-edit"
                                >
                                    ✏️ Edit Promotion
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default PromotionDetailPage;
