import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { promotionsAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { LoadingSpinner, EmptyState, ErrorMessage, Pagination } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import { Gift, CalendarDays, Coins, ShoppingCart, Target } from 'lucide-react';
import './PromotionsPage.css';

const PromotionsPage = () => {
    const { t } = useTranslation(['promotions', 'common']);
    const { user, activeRole } = useAuth();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);

    // Parse query params
    const page = parseInt(searchParams.get('page') || '1', 10);
    const type = searchParams.get('type') || '';
    const started = searchParams.get('started') || '';
    const ended = searchParams.get('ended') || '';
    const limit = 10;

    const isManager = ['manager', 'superuser'].includes(activeRole);

    const fetchPromotions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = { page, limit };
            if (type) params.type = type;
            if (started) params.started = started === 'true';
            if (ended) params.ended = ended === 'true';

            const data = await promotionsAPI.getPromotions(params);
            setPromotions(data.results || []);
            setTotalCount(data.count || 0);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load promotions');
        } finally {
            setLoading(false);
        }
    }, [page, type, started, ended, limit]);

    useEffect(() => {
        fetchPromotions();
    }, [fetchPromotions]);

    const handlePageChange = (newPage) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        setSearchParams(params);
    };

    const handleFilterChange = (key, value) => {
        const params = new URLSearchParams(searchParams);
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        params.set('page', '1');
        setSearchParams(params);
    };

    const clearFilters = () => {
        setSearchParams({ page: '1' });
    };

    const getPromotionStatus = (promotion) => {
        const now = new Date();
        const startDate = new Date(promotion.startTime);
        const endDate = new Date(promotion.endTime);

        if (now < startDate) return { label: t('promotions.card.upcoming'), className: 'status-upcoming' };
        if (now > endDate) return { label: t('promotions.card.ended'), className: 'status-ended' };
        return { label: t('promotions.card.active'), className: 'status-active' };
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getTypeLabel = (type) => {
        return type === 'automatic' ? t('promotions.filters.automatic') : t('promotions.filters.oneTime');
    };

    const totalPages = Math.ceil(totalCount / limit);
    const hasFilters = type || started || ended;

    return (
        <Layout>
            <div className="promotions-page">
                <div className="page-header">
                    <div className="header-left">
                        <h1>{t('promotions.title')}</h1>
                        <p>{t('promotions.subtitle')}</p>
                    </div>
                    {isManager && (
                        <div className="header-right">
                            <Link to="/promotions/manage" className="btn btn-primary">
                                {t('promotions.manageTitle')}
                            </Link>
                        </div>
                    )}
                </div>

                <div className="filters-bar">
                    <div className="filter-group">
                        <label className="form-label">{t('promotions.filters.type')}</label>
                        <select
                            value={type}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                            className="form-select"
                        >
                            <option value="">{t('promotions.filters.allTypes')}</option>
                            <option value="automatic">{t('promotions.filters.automatic')}</option>
                            <option value="one-time">{t('promotions.filters.oneTime')}</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="form-label">{t('promotions.filters.status')}</label>
                        <select
                            value={started && !ended ? 'active' : ended === 'true' ? 'ended' : started === 'false' ? 'upcoming' : ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                const params = new URLSearchParams(searchParams);
                                params.delete('started');
                                params.delete('ended');

                                if (val === 'active') {
                                    params.set('started', 'true');
                                } else if (val === 'ended') {
                                    params.set('ended', 'true');
                                } else if (val === 'upcoming') {
                                    params.set('started', 'false');
                                }

                                params.set('page', '1');
                                setSearchParams(params);
                            }}
                            className="form-select"
                        >
                            <option value="">{t('promotions.filters.allStatuses')}</option>
                            <option value="active">{t('promotions.card.active')}</option>
                            <option value="upcoming">{t('promotions.card.upcoming')}</option>
                            <option value="ended">{t('promotions.card.ended')}</option>
                        </select>
                    </div>

                    {hasFilters && (
                        <button onClick={clearFilters} className="btn btn-ghost btn-danger btn-sm">
                            {t('promotions.filters.clearFilters')}
                        </button>
                    )}
                </div>

                {loading ? (
                    <LoadingSpinner text={t('promotions.list.loading')} />
                ) : error ? (
                    <ErrorMessage message={error} onRetry={fetchPromotions} />
                ) : promotions.length === 0 ? (
                    <EmptyState
                        icon={<Gift size={48} strokeWidth={1.5} />}
                        title={t('promotions.list.noPromotions')}
                        description={hasFilters ? t('promotions.list.noPromotionsFiltered') : t('promotions.list.noPromotionsAvailable')}
                        action={
                            hasFilters && (
                                <button onClick={clearFilters} className="btn btn-secondary">
                                    {t('promotions.filters.clearFilters')}
                                </button>
                            )
                        }
                    />
                ) : (
                    <>
                        <div className="promotions-grid">
                            {promotions.map((promotion) => {
                                const status = getPromotionStatus(promotion);
                                return (
                                    <div key={promotion.id} className="promotion-card">
                                        <div className="promotion-header">
                                            <span className={`promotion-status ${status.className}`}>
                                                {status.label}
                                            </span>
                                            <span className="promotion-type">
                                                {getTypeLabel(promotion.type)}
                                            </span>
                                        </div>

                                        <h3 className="promotion-name">{promotion.name}</h3>

                                        {promotion.description && (
                                            <p className="promotion-description">{promotion.description}</p>
                                        )}

                                        <div className="promotion-details">
                                            <div className="detail-row">
                                                <span className="detail-label"><CalendarDays size={14} /> {t('promotions.card.duration')}</span>
                                                <span className="detail-value">
                                                    {formatDate(promotion.startTime)} - {formatDate(promotion.endTime)}
                                                </span>
                                            </div>

                                            {promotion.type === 'automatic' && (
                                                <>
                                                    {promotion.rate && (
                                                        <div className="detail-row">
                                                            <span className="detail-label"><Coins size={14} /> {t('promotions.card.rate')}</span>
                                                            <span className="detail-value bonus">
                                                                {t('promotions.card.bonusPointsRate', { rate: (promotion.rate * 100).toFixed(0) })}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {promotion.minSpending > 0 && (
                                                        <div className="detail-row">
                                                            <span className="detail-label"><ShoppingCart size={14} /> {t('promotions.card.minSpending')}</span>
                                                            <span className="detail-value">${promotion.minSpending}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {promotion.type === 'one-time' && (
                                                <div className="detail-row">
                                                    <span className="detail-label"><Target size={14} /> {t('promotions.card.points')}</span>
                                                    <span className="detail-value bonus">
                                                        +{promotion.points?.toLocaleString()} {t('common:points')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <Link to={`/promotions/${promotion.id}`} className="view-details-link">
                                            {t('promotions.list.viewDetails')}
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>

                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            totalItems={totalCount}
                            itemsPerPage={limit}
                        />
                    </>
                )}
            </div>
        </Layout>
    );
};

export default PromotionsPage;
