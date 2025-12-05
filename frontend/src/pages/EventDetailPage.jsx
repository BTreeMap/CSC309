import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventsAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { LoadingSpinner, ErrorMessage, ConfirmDialog, PageHeader } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import { EventMap } from '../components/maps';
import { Calendar, MapPin, Clock, Users, Gift, ArrowLeft } from 'lucide-react';
import './EventDetailPage.css';

const EventDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation(['promotions', 'common']);
    const { user, activeRole } = useAuth();
    const { showToast } = useToast();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rsvpLoading, setRsvpLoading] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    const isManager = ['manager', 'superuser'].includes(activeRole);

    const fetchEvent = async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await eventsAPI.getEvent(id);
            setEvent(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load event');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvent();
    }, [id]);

    const handleRSVP = async () => {
        setRsvpLoading(true);
        try {
            await eventsAPI.rsvpEvent(id);
            showToast(t('events.registration.registerSuccess'), 'success');
            fetchEvent();
        } catch (err) {
            showToast(err.response?.data?.error || t('events.registration.error'), 'error');
        } finally {
            setRsvpLoading(false);
        }
    };

    const handleCancelRSVP = async () => {
        setRsvpLoading(true);
        try {
            await eventsAPI.removeGuest(id, user.id);
            showToast(t('events.registration.unregisterSuccess'), 'success');
            setShowCancelConfirm(false);
            fetchEvent();
        } catch (err) {
            showToast(err.response?.data?.error || t('events.registration.error'), 'error');
        } finally {
            setRsvpLoading(false);
        }
    };

    const getEventStatus = () => {
        if (!event) return null;
        const now = new Date();
        const startDate = new Date(event.startTime);
        const endDate = new Date(event.endTime);

        if (now < startDate) return { label: t('events.status.upcoming'), className: 'status-upcoming', canRSVP: true };
        if (now > endDate) return { label: t('events.status.ended'), className: 'status-ended', canRSVP: false };
        return { label: t('events.status.happeningNow'), className: 'status-active', canRSVP: true };
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatShortDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getDuration = () => {
        if (!event) return '';
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        const diff = end - start;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours === 0) return `${minutes} minutes`;
        if (minutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
        return `${hours}h ${minutes}m`;
    };

    const isUserAttending = () => {
        if (!event || !user) return false;
        return event.guests?.some(g => g.utorid === user.utorid);
    };

    const isFull = () => {
        if (!event || !event.capacity) return false;
        return event.numGuests >= event.capacity;
    };

    if (loading) {
        return (
            <Layout>
                <LoadingSpinner text={t('events.list.loading')} />
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <ErrorMessage message={error} onRetry={fetchEvent} />
            </Layout>
        );
    }

    if (!event) {
        return (
            <Layout>
                <div className="empty-state">
                    <div className="empty-state-icon">📅</div>
                    <h2 className="empty-state-title">{t('events.list.noEvents')}</h2>
                    <p className="empty-state-description">{t('events.list.noEventsAvailable')}</p>
                    <button onClick={() => navigate('/events')} className="btn btn-secondary">
                        {t('common:back')}
                    </button>
                </div>
            </Layout>
        );
    }

    const status = getEventStatus();
    const attending = isUserAttending();
    const full = isFull();

    return (
        <Layout>
            <div className="event-detail-page">
                <button onClick={() => navigate('/events')} className="btn btn-ghost back-button">
                    <ArrowLeft size={16} />
                    {t('common:back')}
                </button>

                <PageHeader
                    icon={<Calendar />}
                    title={event.name}
                    subtitle={t('events.detail.title')}
                />

                <div className="event-content">
                    <div className="event-main">
                        <div className="content-section">
                            <div className="event-badges">
                                <span className={`badge ${status.className}`}>
                                    {status.label}
                                </span>
                                {event.pointsRemain > 0 && (
                                    <span className="badge badge-success">
                                        <Gift size={14} />
                                        {t('events.card.points', { points: event.pointsRemain.toLocaleString() })}
                                    </span>
                                )}
                            </div>
                        </div>

                        {event.description && (
                            <div className="content-section">
                                <h2>{t('events.detail.description')}</h2>
                                <p className="event-description">{event.description}</p>
                            </div>
                        )}

                        <div className="content-section">
                            <h2>{t('events.detail.dateTime')}</h2>
                            <div className="event-details-grid">
                                <div className="detail-item">
                                    <div className="detail-icon">
                                        <Calendar size={20} />
                                    </div>
                                    <div className="detail-content">
                                        <span className="label">{t('common:date')}</span>
                                        <span className="value">{formatDate(event.startTime)}</span>
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <div className="detail-icon">
                                        <Clock size={20} />
                                    </div>
                                    <div className="detail-content">
                                        <span className="label">{t('common:duration')}</span>
                                        <span className="value">{getDuration()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="content-section">
                            <h2>{t('events.detail.location')}</h2>
                            <div className="location-display">
                                <MapPin size={20} />
                                <span className="location-text">{event.location}</span>
                            </div>
                            <EventMap
                                location={event.location}
                                eventName={event.name}
                                height={250}
                                className="event-location-map"
                            />
                        </div>

                        {isManager && event.organizers && event.organizers.length > 0 && (
                            <div className="content-section">
                                <h2>{t('events.detail.organizer')}</h2>
                                <div className="organizers-list">
                                    {event.organizers.map((org, index) => (
                                        <div key={index} className="organizer-item">
                                            <span className="organizer-avatar">👤</span>
                                            <span>{org.utorid}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="event-sidebar">
                        <div className="sidebar-card rsvp-card">
                            <div className="attendance-info">
                                <div className="attendance-count">
                                    <Users size={20} />
                                    <span className="count-number">{event.numGuests}</span>
                                    <span className="count-label">{t('events.card.attending')}</span>
                                </div>
                                {event.capacity && (
                                    <div className="capacity-info">
                                        <span className={`capacity-text ${full ? 'full' : ''}`}>
                                            {full ? t('events.registration.eventFull') : t('events.card.spotsLeft', { count: event.capacity - event.numGuests })}
                                        </span>
                                        <div className="capacity-bar">
                                            <div className="capacity-track">
                                                <div
                                                    className="capacity-fill"
                                                    style={{ width: `${Math.min(100, (event.numGuests / event.capacity) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {attending ? (
                                <div className="attending-section">
                                    <div className="attending-badge">
                                        ✓ {t('events.registration.alreadyRegistered')}
                                    </div>
                                    {status.canRSVP && (
                                        <button
                                            onClick={() => setShowCancelConfirm(true)}
                                            className="btn btn-danger-outline btn-block"
                                            disabled={rsvpLoading}
                                        >
                                            {t('events.registration.unregister')}
                                        </button>
                                    )}
                                </div>
                            ) : status.canRSVP && !full ? (
                                <button
                                    onClick={handleRSVP}
                                    className="btn btn-primary btn-block"
                                    disabled={rsvpLoading}
                                >
                                    {rsvpLoading ? t('events.registration.registering') : t('events.registration.register')}
                                </button>
                            ) : full ? (
                                <div className="full-notice">
                                    {t('events.registration.eventFull')}
                                </div>
                            ) : (
                                <div className="ended-notice">
                                    {t('events.registration.registrationClosed')}
                                </div>
                            )}

                            {event.pointsRemain > 0 && event.pointsAwarded > 0 && (
                                <div className="points-info">
                                    <Gift size={16} />
                                    <span>{t('events.detail.pointsReward')}: <strong>{event.pointsAwarded}</strong></span>
                                </div>
                            )}
                        </div>

                        {isManager && (
                            <div className="sidebar-card manager-card">
                                <h3>{t('common:actions')}</h3>
                                <div className="manager-actions">
                                    <button
                                        onClick={() => navigate('/events/manage')}
                                        className="btn btn-secondary btn-block"
                                    >
                                        {t('events.manage.edit')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <ConfirmDialog
                    isOpen={showCancelConfirm}
                    onClose={() => setShowCancelConfirm(false)}
                    onConfirm={handleCancelRSVP}
                    title={t('events.registration.unregister')}
                    message={t('events.delete.message')}
                    confirmText={t('events.registration.unregister')}
                    confirmVariant="danger"
                />
            </div>
        </Layout>
    );
};

export default EventDetailPage;
