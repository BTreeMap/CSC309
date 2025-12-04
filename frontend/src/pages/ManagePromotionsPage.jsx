import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { promotionsAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, EmptyState, ErrorMessage, Pagination, Modal, ConfirmDialog, PageHeader } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import { Tag } from 'lucide-react';
import './ManagePromotionsPage.css';

const ManagePromotionsPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const { t } = useTranslation(['promotions', 'common']);

    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedPromotion, setSelectedPromotion] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'automatic',
        startTime: '',
        endTime: '',
        minSpending: '',
        rate: '',
        points: '',
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState(null);

    // Parse query params
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 10;

    const fetchPromotions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = { page, limit };
            const data = await promotionsAPI.getPromotions(params);
            setPromotions(data.results || []);
            setTotalCount(data.count || 0);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load promotions');
        } finally {
            setLoading(false);
        }
    }, [page, limit]);

    useEffect(() => {
        fetchPromotions();
    }, [fetchPromotions]);

    const handlePageChange = (newPage) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        setSearchParams(params);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            type: 'automatic',
            startTime: '',
            endTime: '',
            minSpending: '',
            rate: '',
            points: '',
        });
        setFormError(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowCreateModal(true);
    };

    const openEditModal = (promotion) => {
        setSelectedPromotion(promotion);
        setFormData({
            name: promotion.name,
            description: promotion.description || '',
            type: promotion.type,
            startTime: new Date(promotion.startTime).toISOString().slice(0, 16),
            endTime: new Date(promotion.endTime).toISOString().slice(0, 16),
            minSpending: promotion.minSpending?.toString() || '',
            rate: promotion.rate?.toString() || '',
            points: promotion.points?.toString() || '',
        });
        setFormError(null);
        setShowEditModal(true);
    };

    const openDeleteConfirm = (promotion) => {
        setSelectedPromotion(promotion);
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
                type: formData.type,
                startTime: new Date(formData.startTime).toISOString(),
                endTime: new Date(formData.endTime).toISOString(),
            };

            if (formData.type === 'automatic') {
                if (formData.minSpending) payload.minSpending = parseFloat(formData.minSpending);
                if (formData.rate) payload.rate = parseFloat(formData.rate);
            } else {
                if (formData.points) payload.points = parseInt(formData.points, 10);
            }

            if (showEditModal && selectedPromotion) {
                await promotionsAPI.updatePromotion(selectedPromotion.id, payload);
                showToast(t('promotions:promotions.toast.updated'), 'success');
            } else {
                await promotionsAPI.createPromotion(payload);
                showToast(t('promotions:promotions.toast.created'), 'success');
            }

            setShowCreateModal(false);
            setShowEditModal(false);
            fetchPromotions();
        } catch (err) {
            setFormError(err.response?.data?.error || t('promotions:promotions.toast.errorSave'));
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedPromotion) return;

        try {
            await promotionsAPI.deletePromotion(selectedPromotion.id);
            showToast(t('promotions:promotions.toast.deleted'), 'success');
            setShowDeleteConfirm(false);
            fetchPromotions();
        } catch (err) {
            showToast(err.response?.data?.error || t('promotions:promotions.toast.errorDelete'), 'error');
        }
    };

    const getPromotionStatus = (promotion) => {
        const now = new Date();
        const startDate = new Date(promotion.startTime);
        const endDate = new Date(promotion.endTime);

        if (now < startDate) return { label: t('promotions:promotions.status.upcoming'), className: 'status-upcoming' };
        if (now > endDate) return { label: t('promotions:promotions.status.ended'), className: 'status-ended' };
        return { label: t('promotions:promotions.status.active'), className: 'status-active' };
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const totalPages = Math.ceil(totalCount / limit);

    return (
        <Layout>
            <div className="manage-promotions-page">
                <PageHeader
                    icon={<Tag />}
                    title={t('promotions.manageTitle')}
                    subtitle={t('promotions.manageSubtitle')}
                    actions={
                        <button onClick={openCreateModal} className="btn btn-primary">
                            + {t('promotions.createPromotion')}
                        </button>
                    }
                />

                {loading ? (
                    <LoadingSpinner text={t('promotions:promotions.loading')} />
                ) : error ? (
                    <ErrorMessage message={error} onRetry={fetchPromotions} />
                ) : promotions.length === 0 ? (
                    <EmptyState
                        icon={<Gift size={48} strokeWidth={1.5} />}
                        title={t('promotions:promotions.noPromotions')}
                        description={t('promotions:promotions.noPromotionsDesc')}
                        action={
                            <button onClick={openCreateModal} className="btn btn-primary">
                                {t('promotions:promotions.createPromotion')}
                            </button>
                        }
                    />
                ) : (
                    <>
                        <div className="promotions-table-container">
                            <table className="promotions-table">
                                <thead>
                                    <tr>
                                        <th>{t('promotions:promotions.table.id')}</th>
                                        <th>{t('promotions:promotions.table.name')}</th>
                                        <th>{t('promotions:promotions.table.type')}</th>
                                        <th>{t('promotions:promotions.table.duration')}</th>
                                        <th>{t('promotions:promotions.table.benefit')}</th>
                                        <th>{t('promotions:promotions.table.status')}</th>
                                        <th>{t('promotions:promotions.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {promotions.map((promotion) => {
                                        const status = getPromotionStatus(promotion);
                                        return (
                                            <tr key={promotion.id}>
                                                <td className="cell-id">#{promotion.id}</td>
                                                <td className="cell-name">{promotion.name}</td>
                                                <td>
                                                    <span className={`type-badge ${promotion.type}`}>
                                                        {promotion.type === 'automatic' ? t('promotions:promotions.table.auto') : t('promotions:promotions.table.code')}
                                                    </span>
                                                </td>
                                                <td className="cell-duration">
                                                    <div>{formatDate(promotion.startTime)}</div>
                                                    <div className="duration-to">{t('promotions:promotions.table.to')} {formatDate(promotion.endTime)}</div>
                                                </td>
                                                <td className="cell-benefit">
                                                    {promotion.type === 'automatic' ? (
                                                        <span className="benefit-text">{t('promotions:promotions.table.rate', { rate: (promotion.rate * 100).toFixed(0) })}</span>
                                                    ) : (
                                                        <span className="benefit-text">{t('promotions:promotions.table.points', { points: promotion.points })}</span>
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
                                                            onClick={() => navigate(`/promotions/${promotion.id}`)}
                                                            className="btn-action btn-view"
                                                        >
                                                            {t('promotions:promotions.actions.view')}
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(promotion)}
                                                            className="btn-action btn-edit"
                                                        >
                                                            {t('promotions:promotions.actions.edit')}
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteConfirm(promotion)}
                                                            className="btn-action btn-delete"
                                                        >
                                                            {t('promotions:promotions.actions.delete')}
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
                    title={showEditModal ? t('promotions:promotions.form.editTitle') : t('promotions:promotions.form.title')}
                    size="medium"
                >
                    <form onSubmit={handleSubmit} className="promotion-form">
                        {formError && (
                            <div className="alert-error">{formError}</div>
                        )}

                        <div className="form-group">
                            <label htmlFor="name" className="form-label">{t('promotions:promotions.form.nameLabel')} *</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder={t('promotions:promotions.form.namePlaceholder')}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description" className="form-label">{t('promotions:promotions.form.descriptionLabel')}</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder={t('promotions:promotions.form.descriptionPlaceholder')}
                                className="form-textarea"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="type" className="form-label">{t('promotions:promotions.form.typeLabel')} *</label>
                            <select
                                id="type"
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                required
                                className="form-select"
                            >
                                <option value="automatic">{t('promotions:promotions.form.typeAutomatic')}</option>
                                <option value="one-time">{t('promotions:promotions.form.typeOneTime')}</option>
                            </select>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="startTime" className="form-label">{t('promotions:promotions.form.startDateLabel')} *</label>
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
                                <label htmlFor="endTime" className="form-label">{t('promotions:promotions.form.endDateLabel')} *</label>
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

                        {formData.type === 'automatic' ? (
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="rate" className="form-label">{t('promotions:promotions.form.rateLabel')} *</label>
                                    <input
                                        type="number"
                                        id="rate"
                                        name="rate"
                                        value={formData.rate}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0"
                                        max="10"
                                        placeholder={t('promotions:promotions.form.ratePlaceholder')}
                                        required={formData.type === 'automatic'}
                                        className="form-input"
                                    />
                                    <span className="form-helper">{t('promotions:promotions.form.rateHint')}</span>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="minSpending" className="form-label">{t('promotions:promotions.form.minSpendingLabel')}</label>
                                    <input
                                        type="number"
                                        id="minSpending"
                                        name="minSpending"
                                        value={formData.minSpending}
                                        onChange={handleInputChange}
                                        min="0"
                                        step="0.01"
                                        placeholder="0"
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="form-group">
                                <label htmlFor="points" className="form-label">{t('promotions:promotions.form.pointsLabel')} *</label>
                                <input
                                    type="number"
                                    id="points"
                                    name="points"
                                    value={formData.points}
                                    onChange={handleInputChange}
                                    min="1"
                                    placeholder={t('promotions:promotions.form.pointsPlaceholder')}
                                    required={formData.type === 'one-time'}
                                    className="form-input"
                                />
                            </div>
                        )}

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
                                {formLoading ? t('promotions:promotions.form.saving') : showEditModal ? t('promotions:promotions.form.update') : t('promotions:promotions.form.create')}
                            </button>
                        </div>
                    </form>
                </Modal>

                {/* Delete Confirmation */}
                <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={handleDelete}
                    title={t('promotions:promotions.delete.title')}
                    message={t('promotions:promotions.delete.message', { name: selectedPromotion?.name })}
                    confirmText={t('promotions:promotions.delete.confirm')}
                    confirmVariant="danger"
                />
            </div>
        </Layout>
    );
};

export default ManagePromotionsPage;
