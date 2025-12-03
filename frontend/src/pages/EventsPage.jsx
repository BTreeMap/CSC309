import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventsAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { LoadingSpinner, EmptyState, ErrorMessage, Pagination } from '../components/shared';
import { Calendar, CheckCircle, Radio, MapPin, CalendarDays, Users, Gift } from 'lucide-react';
import './EventsPage.css';

const EventsPage = () => {
    const { t } = useTranslation(['promotions', 'common']);
    const { activeRole } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);

    // Parse query params
    const page = parseInt(searchParams.get('page') || '1', 10);
    const name = searchParams.get('name') || '';
    const location = searchParams.get('location') || '';
    const started = searchParams.get('started') || '';
    const ended = searchParams.get('ended') || '';
    const showFull = searchParams.get('showFull') || '';
    const limit = 10;

    const isManager = ['manager', 'superuser'].includes(activeRole);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = { page, limit };
            if (name) params.name = name;
            if (location) params.location = location;
            if (started) params.started = started === 'true';
            if (ended) params.ended = ended === 'true';
            if (showFull) params.showFull = showFull === 'true';

            const data = await eventsAPI.getEvents(params);
            setEvents(data.results || []);
            setTotalCount(data.count || 0);
        } catch (err) {
            setError(err.response?.data?.error || t('events.list.error'));
        } finally {
            setLoading(false);
        }
    }, [page, name, location, started, ended, showFull, limit]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

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

    const handleSearch = (e) => {
        e.preventDefault();
        // Already handled by onChange
    };

    const clearFilters = () => {
        setSearchParams({ page: '1' });
    };

    const getEventStatus = (event) => {
        const now = new Date();
        const startDate = new Date(event.startTime);
        const endDate = new Date(event.endTime);

        if (now < startDate) return { label: t('events.status.upcoming'), className: 'status-upcoming', icon: <Calendar size={14} /> };
        if (now > endDate) return { label: t('events.status.ended'), className: 'status-ended', icon: <CheckCircle size={14} /> };
        return { label: t('events.status.happeningNow'), className: 'status-active', icon: <Radio size={14} /> };
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getCapacityDisplay = (event) => {
        if (!event.capacity) return { text: t('events.card.unlimited'), className: '' };
        const spotsLeft = event.capacity - event.numGuests;
        if (spotsLeft === 0) return { text: t('events.card.full'), className: 'capacity-full' };
        if (spotsLeft <= 5) return { text: t('events.card.spotsLeft', { count: spotsLeft }), className: 'capacity-low' };
        return { text: t('events.card.spotsLeft', { count: spotsLeft }), className: '' };
    };

    const totalPages = Math.ceil(totalCount / limit);
    const hasFilters = name || location || started || ended || showFull;

    return (
        <Layout>
            <div className="events-page">
                <div className="page-header">
                    <div className="header-left">
                        <h1>{t('events.title')}</h1>
                        <p>{t('events.subtitle')}</p>
                    </div>
                    {isManager && (
                        <div className="header-right">
                            <Link to="/events/manage" className="btn btn-primary">
                                {t('events.manageTitle')}
                            </Link>
                        </div>
                    )}
                </div>

                <form className="filters-bar" onSubmit={handleSearch}>
                    <div className="filters-row">
                        <div className="filter-group search-group">
                            <label className="form-label">{t('events.filters.search')}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => handleFilterChange('name', e.target.value)}
                                placeholder={t('events.filters.searchName')}
                                className="form-input"
                            />
                        </div>

                        <div className="filter-group">
                            <label className="form-label">{t('events.filters.location')}</label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => handleFilterChange('location', e.target.value)}
                                placeholder={t('events.filters.searchLocation')}
                                className="form-input"
                            />
                        </div>

                        <div className="filter-group">
                            <label className="form-label">{t('events.filters.status')}</label>
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
                                <option value="">{t('events.filters.allEvents')}</option>
                                <option value="active">{t('events.filters.happeningNow')}</option>
                                <option value="upcoming">{t('events.filters.upcoming')}</option>
                                <option value="ended">{t('events.filters.ended')}</option>
                            </select>
                        </div>

                        <div className="filter-group checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={showFull === 'true'}
                                    onChange={(e) => handleFilterChange('showFull', e.target.checked ? 'true' : '')}
                                />
                                <span>{t('events.filters.showFull')}</span>
                            </label>
                        </div>
                    </div>

                    {hasFilters && (
                        <button type="button" onClick={clearFilters} className="btn btn-ghost btn-danger btn-sm">
                            {t('events.filters.clearFilters')}
                        </button>
                    )}
                </form>

                {loading ? (
                    <LoadingSpinner text={t('events.list.loading')} />
                ) : error ? (
                    <ErrorMessage message={error} onRetry={fetchEvents} />
                ) : events.length === 0 ? (
                    <EmptyState
                        icon={<Calendar size={48} strokeWidth={1.5} />}
                        title={t('events.list.noEvents')}
                        description={hasFilters ? t('events.list.noEventsFiltered') : t('events.list.noEventsAvailable')}
                        action={
                            hasFilters && (
                                <button onClick={clearFilters} className="btn btn-secondary">
                                    {t('events.filters.clearFilters')}
                                </button>
                            )
                        }
                    />
                ) : (
                    <>
                        <div className="events-grid">
                            {events.map((event) => {
                                const status = getEventStatus(event);
                                const capacity = getCapacityDisplay(event);
                                return (
                                    <Link to={`/events/${event.id}`} key={event.id} className="event-card">
                                        <div className="event-header">
                                            <span className={`event-status ${status.className}`}>
                                                {status.icon} {status.label}
                                            </span>
                                            {event.pointsRemain > 0 && (
                                                <span className="points-badge">
                                                    <Gift size={14} /> {event.pointsRemain.toLocaleString()} pts
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="event-name">{event.name}</h3>

                                        {event.description && (
                                            <p className="event-description">{event.description}</p>
                                        )}

                                        <div className="event-details">
                                            <div className="detail-item">
                                                <span className="detail-icon"><MapPin size={14} /></span>
                                                <span className="detail-text">{event.location}</span>
                                            </div>

                                            <div className="detail-item">
                                                <span className="detail-icon"><CalendarDays size={14} /></span>
                                                <span className="detail-text">{formatDate(event.startTime)}</span>
                                            </div>

                                            <div className="detail-item">
                                                <span className="detail-icon"><Users size={14} /></span>
                                                <span className={`detail-text ${capacity.className}`}>
                                                    {event.numGuests} {t('events.card.attending')} {capacity.text && `· ${capacity.text}`}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="event-footer">
                                            <span className="view-details">{t('events.list.viewDetails')}</span>
                                        </div>
                                    </Link>
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

export default EventsPage;
