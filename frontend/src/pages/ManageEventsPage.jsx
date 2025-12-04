import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventsAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, EmptyState, ErrorMessage, Pagination, Modal, ConfirmDialog, PageHeader } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import { CalendarCog } from 'lucide-react';
import './ManageEventsPage.css';

const ManageEventsPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const { t } = useTranslation(['events', 'common']);

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location: '',
        startTime: '',
        endTime: '',
        capacity: '',
        points: '',
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState(null);

    // Parse query params
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 10;

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = { page, limit, showFull: true };
            const data = await eventsAPI.getEvents(params);
            setEvents(data.results || []);
            setTotalCount(data.count || 0);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load events');
        } finally {
            setLoading(false);
        }
    }, [page, limit]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handlePageChange = (newPage) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        setSearchParams(params);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            location: '',
            startTime: '',
            endTime: '',
            capacity: '',
            points: '',
        });
        setFormError(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowCreateModal(true);
    };

    const openEditModal = (event) => {
        setSelectedEvent(event);
        setFormData({
            name: event.name,
            description: event.description || '',
            location: event.location,
            startTime: new Date(event.startTime).toISOString().slice(0, 16),
            endTime: new Date(event.endTime).toISOString().slice(0, 16),
            capacity: event.capacity?.toString() || '',
            points: event.pointsAwarded?.toString() || '',
        });
        setFormError(null);
        setShowEditModal(true);
    };

    const openDeleteConfirm = (event) => {
        setSelectedEvent(event);
        setShowDeleteConfirm(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        try {
            const payload = {
                name: formData.name,
                description: formData.description || undefined,
                location: formData.location,
                startTime: new Date(formData.startTime).toISOString(),
                endTime: new Date(formData.endTime).toISOString(),
            };

            if (formData.capacity) payload.capacity = parseInt(formData.capacity, 10);
            if (formData.points) payload.points = parseInt(formData.points, 10);

            if (showEditModal && selectedEvent) {
                await eventsAPI.updateEvent(selectedEvent.id, payload);
                showToast('Event updated successfully!', 'success');
            } else {
                await eventsAPI.createEvent(payload);
                showToast('Event created successfully!', 'success');
            }

            setShowCreateModal(false);
            setShowEditModal(false);
            fetchEvents();
        } catch (err) {
            setFormError(err.response?.data?.error || 'Failed to save event');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedEvent) return;

        try {
            await eventsAPI.deleteEvent(selectedEvent.id);
            showToast('Event deleted successfully!', 'success');
            setShowDeleteConfirm(false);
            fetchEvents();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to delete event', 'error');
        }
    };

    const getEventStatus = (event) => {
        const now = new Date();
        const startDate = new Date(event.startTime);
        const endDate = new Date(event.endTime);

        if (now < startDate) return { label: t('events:events.status.upcoming'), className: 'status-upcoming' };
        if (now > endDate) return { label: t('events:events.status.past'), className: 'status-ended' };
        return { label: t('events:events.status.ongoing'), className: 'status-active' };
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const totalPages = Math.ceil(totalCount / limit);

    return (
        <Layout>
            <div className="manage-events-page">
                <PageHeader
                    icon={<CalendarCog />}
                    title={t('events:events.manageTitle')}
                    subtitle={t('events:events.manageSubtitle')}
                    actions={
                        <button onClick={openCreateModal} className="btn btn-primary">
                            + {t('events:events.createEvent')}
                        </button>
                    }
                />

                {loading ? (
                    <LoadingSpinner text={t('events:events.loading')} />
                ) : error ? (
                    <ErrorMessage message={error} onRetry={fetchEvents} />
                ) : events.length === 0 ? (
                    <EmptyState
                        icon={<Calendar size={48} strokeWidth={1.5} />}
                        title={t('events:events.noEvents')}
                        description={t('events:events.noEventsDesc')}
                        action={
                            <button onClick={openCreateModal} className="btn btn-primary">
                                {t('events:events.createEvent')}
                            </button>
                        }
                    />
                ) : (
                    <>
                        <div className="events-table-container">
                            <table className="events-table">
                                <thead>
                                    <tr>
                                        <th>{t('events:events.table.id')}</th>
                                        <th>{t('events:events.table.name')}</th>
                                        <th>{t('events:events.table.location')}</th>
                                        <th>{t('events:events.table.dateTime')}</th>
                                        <th>{t('events:events.table.guests')}</th>
                                        <th>{t('events:events.table.points')}</th>
                                        <th>{t('events:events.table.status')}</th>
                                        <th>{t('events:events.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map((event) => {
                                        const status = getEventStatus(event);
                                        return (
                                            <tr key={event.id}>
                                                <td className="cell-id">#{event.id}</td>
                                                <td className="cell-name">{event.name}</td>
                                                <td className="cell-location">{event.location}</td>
                                                <td className="cell-date">{formatDate(event.startTime)}</td>
                                                <td className="cell-attendance">
                                                    {event.numGuests}{event.capacity ? ` / ${event.capacity}` : ''}
                                                </td>
                                                <td className="cell-points">
                                                    {event.pointsRemain > 0 ? (
                                                        <span className="points-available">{event.pointsRemain} left</span>
                                                    ) : (
                                                        <span className="points-none">—</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${status.className}`}>
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            onClick={() => navigate(`/events/${event.id}`)}
                                                            className="btn-action btn-view"
                                                        >
                                                            {t('events:events.actions.view')}
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(event)}
                                                            className="btn-action btn-edit"
                                                        >
                                                            {t('events:events.actions.edit')}
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/events/${event.id}`)}
                                                            className="btn-action btn-guests"
                                                        >
                                                            {t('common:details')}
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteConfirm(event)}
                                                            className="btn-action btn-delete"
                                                        >
                                                            {t('events:events.actions.delete')}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
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

                {/* Create/Edit Modal */}
                <Modal
                    isOpen={showCreateModal || showEditModal}
                    onClose={() => {
                        setShowCreateModal(false);
                        setShowEditModal(false);
                    }}
                    title={showEditModal ? t('events:events.form.editTitle') : t('events:events.form.title')}
                    size="medium"
                >
                    <form onSubmit={handleSubmit} className="event-form">
                        {formError && (
                            <div className="alert-error">{formError}</div>
                        )}

                        <div className="form-group">
                            <label htmlFor="name" className="form-label">{t('events:events.form.nameLabel')} *</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder={t('events:events.form.namePlaceholder')}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description" className="form-label">{t('events:events.form.descriptionLabel')}</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder={t('events:events.form.descriptionPlaceholder')}
                                className="form-textarea"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="location" className="form-label">{t('events:events.form.locationLabel')} *</label>
                            <input
                                type="text"
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                required
                                placeholder={t('events:events.form.locationPlaceholder')}
                                className="form-input"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="startTime" className="form-label">{t('events:events.form.startTimeLabel')} *</label>
                                <input
                                    type="datetime-local"
                                    id="startTime"
                                    name="startTime"
                                    value={formData.startTime}
                                    onChange={handleInputChange}
                                    required
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="endTime" className="form-label">{t('events:events.form.endTimeLabel')} *</label>
                                <input
                                    type="datetime-local"
                                    id="endTime"
                                    name="endTime"
                                    value={formData.endTime}
                                    onChange={handleInputChange}
                                    required
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="capacity" className="form-label">{t('events:events.form.capacityLabel')}</label>
                                <input
                                    type="number"
                                    id="capacity"
                                    name="capacity"
                                    value={formData.capacity}
                                    onChange={handleInputChange}
                                    min="1"
                                    placeholder={t('events:events.form.capacityUnlimited')}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="points" className="form-label">{t('events:events.form.pointsLabel')}</label>
                                <input
                                    type="number"
                                    id="points"
                                    name="points"
                                    value={formData.points}
                                    onChange={handleInputChange}
                                    min="0"
                                    placeholder="0"
                                    className="form-input"
                                />
                                <span className="form-helper">{t('events:events.form.pointsHelper')}</span>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setShowEditModal(false);
                                }}
                                className="btn btn-secondary"
                                disabled={formLoading}
                            >
                                {t('common:cancel')}
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={formLoading}>
                                {formLoading ? t('events:events.form.saving') : showEditModal ? t('events:events.form.update') : t('events:events.form.create')}
                            </button>
                        </div>
                    </form>
                </Modal>

                {/* Delete Confirmation */}
                <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={handleDelete}
                    title={t('events:events.delete.title')}
                    message={t('events:events.delete.message', { name: selectedEvent?.name })}
                    confirmText={t('events:events.delete.confirm')}
                    confirmVariant="danger"
                />
            </div>
        </Layout>
    );
};

export default ManageEventsPage;
