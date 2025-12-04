import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { promotionsAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { LoadingSpinner, ErrorMessage } from '../components/shared';
import './PromotionDetailPage.css';

const PromotionDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { activeRole } = useAuth();
    const { t, i18n } = useTranslation(['promotions', 'common']);

    const [promotion, setPromotion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isManager = ['manager', 'superuser'].includes(activeRole);

    const fetchPromotion = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await promotionsAPI.getPromotion(id);
            setPromotion(data);
        } catch (err) {
            setError(err.response?.data?.error || t('promotions:promotions.toast.errorLoad'));
        } finally {
            setLoading(false);
        }
    }, [id, t]);

    useEffect(() => {
        fetchPromotion();
    }, [fetchPromotion]);

    const getPromotionStatus = (promotion) => {
        const now = new Date();
        const startDate = new Date(promotion.startTime);
        const endDate = new Date(promotion.endTime);

        if (now < startDate) return { label: t('promotions:promotions.status.upcoming'), className: 'status-upcoming', icon: '🕐' };
        if (now > endDate) return { label: t('promotions:promotions.status.ended'), className: 'status-ended', icon: '✓' };
        return { label: t('promotions:promotions.status.active'), className: 'status-active', icon: '🔥' };
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(i18n.language, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTypeLabel = (type) => {
        return type === 'automatic' ? t('promotions:promotions.types.automatic') : t('promotions:promotions.types.oneTime');
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
                <ErrorMessage message={error} onRetry={fetchPromotion} />
            </Layout>
        );
    }

    if (!promotion) {
        return (
            <Layout>
                <div className="not-found">
                    <h2>{t('promotions:promotions.detail.notFound')}</h2>
                    <p>{t('promotions:promotions.detail.notFoundDesc')}</p>
                    <button onClick={() => navigate('/promotions')} className="btn btn-secondary">
                        {t('promotions:promotions.detail.backToPromotions')}
                    </button>
                </div>
            </Layout>
        );
    }

    const status = getPromotionStatus(promotion);
    const daysRemaining = status.label === t('promotions:promotions.status.active') ? getDaysRemaining(promotion.endTime) : null;

    return (
        <Layout>
            <div className="promotion-detail-page">
                <button onClick={() => navigate(-1)} className="back-button">
                    ← {t('promotions:promotions.detail.backToPromotions')}
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
                            <h2>{t('promotions:promotions.detail.description')}</h2>
                            <p>{promotion.description}</p>
                        </div>
                    )}

                    <div className="promotion-info-grid">
                        <div className="info-card">
                            <div className="info-icon">📅</div>
                            <div className="info-content">
                                <h3>{t('promotions:promotions.detail.startDate')}</h3>
                                <p>{formatDate(promotion.startTime)}</p>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-icon">🏁</div>
                            <div className="info-content">
                                <h3>{t('promotions:promotions.detail.endDate')}</h3>
                                <p>{formatDate(promotion.endTime)}</p>
                            </div>
                        </div>

                        {promotion.type === 'automatic' && (
                            <>
                                <div className="info-card highlight">
                                    <div className="info-icon">💰</div>
                                    <div className="info-content">
                                        <h3>{t('promotions:promotions.detail.bonusRate')}</h3>
                                        <p className="bonus-value">+{(promotion.rate * 100).toFixed(0)}%</p>
                                        <span className="bonus-note">{t('promotions:promotions.detail.bonusRateNote')}</span>
                                    </div>
                                </div>

                                {promotion.minSpending > 0 && (
                                    <div className="info-card">
                                        <div className="info-icon">🛒</div>
                                        <div className="info-content">
                                            <h3>{t('promotions:promotions.detail.minSpending')}</h3>
                                            <p>${promotion.minSpending.toLocaleString()}</p>
                                            <span className="info-note">{t('promotions:promotions.detail.minSpendingNote')}</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {promotion.type === 'one-time' && (
                            <div className="info-card highlight">
                                <div className="info-icon">🎯</div>
                                <div className="info-content">
                                    <h3>{t('promotions:promotions.detail.pointsReward')}</h3>
                                    <p className="bonus-value">+{promotion.points?.toLocaleString()}</p>
                                    <span className="bonus-note">{t('promotions:promotions.detail.pointsRewardNote')}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="how-it-works">
                        <h2>{t('promotions:promotions.detail.howItWorks')}</h2>
                        {promotion.type === 'automatic' ? (
                            <ol className="steps-list">
                                <li>{t('promotions:promotions.detail.automaticSteps.step1')}</li>
                                {promotion.minSpending > 0 && (
                                    <li>{t('promotions:promotions.detail.automaticSteps.step2', { amount: promotion.minSpending })}</li>
                                )}
                                <li>{t('promotions:promotions.detail.automaticSteps.step3', { rate: (promotion.rate * 100).toFixed(0) })}</li>
                                <li>{t('promotions:promotions.detail.automaticSteps.step4')}</li>
                            </ol>
                        ) : (
                            <ol className="steps-list">
                                <li>{t('promotions:promotions.detail.oneTimeSteps.step1')}</li>
                                <li>{t('promotions:promotions.detail.oneTimeSteps.step2')}</li>
                                <li>{t('promotions:promotions.detail.oneTimeSteps.step3', { points: promotion.points?.toLocaleString() })}</li>
                                <li>{t('promotions:promotions.detail.oneTimeSteps.step4')}</li>
                            </ol>
                        )}
                    </div>

                    {isManager && (
                        <div className="manager-actions">
                            <h2>{t('promotions:promotions.detail.managerActions')}</h2>
                            <div className="action-buttons">
                                <button
                                    onClick={() => navigate('/promotions/manage')}
                                    className="btn btn-secondary"
                                >
                                    ⚙️ {t('promotions:promotions.detail.managePromotions')}
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
