import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { LoadingSpinner, ErrorMessage, ConfirmDialog } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import './EventDetailPage.css';

const EventDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
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
            showToast('Successfully RSVP\'d to event!', 'success');
            fetchEvent();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to RSVP', 'error');
        } finally {
            setRsvpLoading(false);
        }
    };

    const handleCancelRSVP = async () => {
        setRsvpLoading(true);
        try {
            await eventsAPI.removeGuest(id, user.id);
            showToast('RSVP cancelled successfully', 'success');
            setShowCancelConfirm(false);
            fetchEvent();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to cancel RSVP', 'error');
        } finally {
            setRsvpLoading(false);
        }
    };

    const getEventStatus = () => {
        if (!event) return null;
        const now = new Date();
        const startDate = new Date(event.startTime);
        const endDate = new Date(event.endTime);

        if (now < startDate) return { label: 'Upcoming', className: 'status-upcoming', canRSVP: true };
        if (now > endDate) return { label: 'Ended', className: 'status-ended', canRSVP: false };
        return { label: 'Happening Now', className: 'status-active', canRSVP: true };
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatShortDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
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
                <LoadingSpinner text="Loading event..." />
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
                <div className="not-found">
                    <h2>Event Not Found</h2>
                    <p>The event you're looking for doesn't exist or has been removed.</p>
                    <button onClick={() => navigate('/events')} className="btn btn-secondary">
                        Back to Events
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
                <button onClick={() => navigate(-1)} className="back-button">
                    ← Back to Events
                </button>

                <div className="event-detail-card">
                    <div className="event-hero">
                        <div className="hero-content">
                            <div className="event-badges">
                                <span className={`event-status ${status.className}`}>
                                    {status.label}
                                </span>
                                {event.pointsRemain > 0 && (
                                    <span className="points-badge">
                                        🎁 {event.pointsRemain.toLocaleString()} points available
                                    </span>
                                )}
                            </div>

                            <h1 className="event-title">{event.name}</h1>

                            <div className="event-quick-info">
                                <div className="quick-item">
                                    <span className="quick-icon">📍</span>
                                    <span>{event.location}</span>
                                </div>
                                <div className="quick-item">
                                    <span className="quick-icon">🗓️</span>
                                    <span>{formatShortDate(event.startTime)}</span>
                                </div>
                                <div className="quick-item">
                                    <span className="quick-icon">⏱️</span>
                                    <span>{getDuration()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="event-body">
                        <div className="event-main">
                            {event.description && (
                                <div className="section">
                                    <h2>About This Event</h2>
                                    <p className="description-text">{event.description}</p>
                                </div>
                            )}

                            <div className="section">
                                <h2>Date & Time</h2>
                                <div className="datetime-grid">
                                    <div className="datetime-item">
                                        <span className="datetime-label">Starts</span>
                                        <span className="datetime-value">{formatDate(event.startTime)}</span>
                                    </div>
                                    <div className="datetime-item">
                                        <span className="datetime-label">Ends</span>
                                        <span className="datetime-value">{formatDate(event.endTime)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="section">
                                <h2>Location</h2>
                                <div className="location-display">
                                    <span className="location-icon">📍</span>
                                    <span className="location-text">{event.location}</span>
                                </div>
                            </div>

                            {isManager && event.organizers && event.organizers.length > 0 && (
                                <div className="section">
                                    <h2>Organizers</h2>
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
                            <div className="rsvp-card">
                                <div className="attendance-info">
                                    <div className="attendance-count">
                                        <span className="count-number">{event.numGuests}</span>
                                        <span className="count-label">attending</span>
                                    </div>
                                    {event.capacity && (
                                        <div className="capacity-info">
                                            <span className={`capacity-text ${full ? 'full' : ''}`}>
                                                {full ? 'Event is full' : `${event.capacity - event.numGuests} spots left`}
                                            </span>
                                            <div className="capacity-bar">
                                                <div
                                                    className="capacity-fill"
                                                    style={{ width: `${Math.min(100, (event.numGuests / event.capacity) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {attending ? (
                                    <div className="attending-section">
                                        <div className="attending-badge">
                                            ✓ You're attending
                                        </div>
                                        {status.canRSVP && (
                                            <button
                                                onClick={() => setShowCancelConfirm(true)}
                                                className="btn btn-danger-outline"
                                                disabled={rsvpLoading}
                                            >
                                                Cancel RSVP
                                            </button>
                                        )}
                                    </div>
                                ) : status.canRSVP && !full ? (
                                    <button
                                        onClick={handleRSVP}
                                        className="btn btn-primary btn-block"
                                        disabled={rsvpLoading}
                                    >
                                        {rsvpLoading ? 'Processing...' : 'RSVP Now'}
                                    </button>
                                ) : full ? (
                                    <div className="full-notice">
                                        This event is at capacity
                                    </div>
                                ) : (
                                    <div className="ended-notice">
                                        This event has ended
                                    </div>
                                )}

                                {event.pointsRemain > 0 && event.pointsAwarded > 0 && (
                                    <div className="points-info">
                                        <span className="points-icon">🎁</span>
                                        <span>Earn up to <strong>{event.pointsAwarded}</strong> points by attending!</span>
                                    </div>
                                )}
                            </div>

                            {isManager && (
                                <div className="manager-card">
                                    <h3>Manager Actions</h3>
                                    <div className="manager-actions">
                                        <button
                                            onClick={() => navigate(`/events/${event.id}/edit`)}
                                            className="btn btn-secondary btn-block"
                                        >
                                            ✏️ Edit Event
                                        </button>
                                        <button
                                            onClick={() => navigate(`/events/${event.id}/guests`)}
                                            className="btn btn-secondary btn-block"
                                        >
                                            👥 Manage Guests
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <ConfirmDialog
                    isOpen={showCancelConfirm}
                    onClose={() => setShowCancelConfirm(false)}
                    onConfirm={handleCancelRSVP}
                    title="Cancel RSVP"
                    message="Are you sure you want to cancel your RSVP for this event?"
                    confirmText="Cancel RSVP"
                    confirmVariant="danger"
                />
            </div>
        </Layout>
    );
};

export default EventDetailPage;
