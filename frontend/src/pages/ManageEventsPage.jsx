import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventsAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, EmptyState, ErrorMessage, Pagination, Modal, ConfirmDialog, PageHeader } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import { LocationInput } from '../components/maps';
import { CalendarCog, Calendar, Eye, Edit, Trash2, Users } from 'lucide-react';
import './ManageEventsPage.css';

const ManageEventsPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

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

    const { t } = useTranslation(['promotions', 'common']);

    const getEventStatus = (event) => {
        const now = new Date();
        const startDate = new Date(event.startTime);
        const endDate = new Date(event.endTime);

        if (now < startDate) return { label: t('events.manage.statusUpcoming'), className: 'status-upcoming' };
        if (now > endDate) return { label: t('events.manage.statusEnded'), className: 'status-ended' };
        return { label: t('events.manage.statusActive'), className: 'status-active' };
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
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
                    title={t('events.manageTitle')}
                    subtitle={t('events.manageSubtitle')}
                    actions={
                        <button onClick={openCreateModal} className="btn btn-primary">
                            + {t('events.createEvent')}
                        </button>
                    }
                />

                {loading ? (
                    <LoadingSpinner text={t('events.manage.loading')} />
                ) : error ? (
                    <ErrorMessage message={error} onRetry={fetchEvents} />
                ) : events.length === 0 ? (
                    <EmptyState
                        icon={<Calendar size={48} strokeWidth={1.5} />}
                        title={t('events.manage.noEvents')}
                        description={t('events.manage.noEventsYet')}
                        action={
                            <button onClick={openCreateModal} className="btn btn-primary">
                                {t('events.createEvent')}
                            </button>
                        }
                    />
                ) : (
                    <>
                        <div className="events-table-container">
                            <table className="events-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>{t('common:name')}</th>
                                        <th>{t('events.detail.location')}</th>
                                        <th>{t('common:date')}</th>
                                        <th>{t('events.manage.tableCapacity')}</th>
                                        <th>{t('common:points')}</th>
                                        <th>{t('common:status')}</th>
                                        <th>{t('common:actionsLabel')}</th>
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
                                                        <span className="points-available">{event.pointsRemain} {t('events.manage.spotsLeft', { count: event.pointsRemain }).split(' ').pop()}</span>
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
                                                            {t('events.manage.view')}
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(event)}
                                                            className="btn-action btn-edit"
                                                        >
                                                            {t('events.manage.edit')}
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/events/${event.id}`)}
                                                            className="btn-action btn-guests"
                                                        >
                                                            {t('events.manage.details')}
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteConfirm(event)}
                                                            className="btn-action btn-delete"
                                                        >
                                                            {t('events.manage.delete')}
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
                    title={showEditModal ? t('events.edit.title') : t('events.create.title')}
                    size="medium"
                >
                    <form onSubmit={handleSubmit} className="event-form">
                        {formError && (
                            <div className="alert-error">{formError}</div>
                        )}

                        <div className="form-group">
                            <label htmlFor="name" className="form-label">{t('events.create.nameLabel')} *</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder={t('events.create.namePlaceholder')}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description" className="form-label">{t('events.create.descriptionLabel')}</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder={t('events.create.descriptionPlaceholder')}
                                className="form-textarea"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="location" className="form-label">{t('events.create.locationLabel')} *</label>
                            <LocationInput
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                required
                                placeholder={t('events.create.locationPlaceholder')}
                                showSuggestions={true}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="startTime" className="form-label">{t('common:startDate')} *</label>
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
                                <label htmlFor="endTime" className="form-label">{t('common:endDate')} *</label>
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
                                <label htmlFor="capacity" className="form-label">{t('events.create.capacityLabel')}</label>
                                <input
                                    type="number"
                                    id="capacity"
                                    name="capacity"
                                    value={formData.capacity}
                                    onChange={handleInputChange}
                                    min="1"
                                    placeholder={t('events.create.capacityPlaceholder')}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="points" className="form-label">{t('events.create.pointsLabel')}</label>
                                <input
                                    type="number"
                                    id="points"
                                    name="points"
                                    value={formData.points}
                                    onChange={handleInputChange}
                                    min="0"
                                    placeholder={t('events.create.pointsPlaceholder')}
                                    className="form-input"
                                />
                                <span className="form-helper">{t('events.detail.pointsReward')}</span>
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
                                {formLoading ? t('events.edit.submitting') : showEditModal ? t('events.edit.submit') : t('events.create.submit')}
                            </button>
                        </div>
                    </form>
                </Modal>

                {/* Delete Confirmation */}
                <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={handleDelete}
                    title={t('events.delete.title')}
                    message={t('events.delete.message')}
                    confirmText={t('common:delete')}
                    confirmVariant="danger"
                />
            </div>
        </Layout>
    );
};

export default ManageEventsPage;
