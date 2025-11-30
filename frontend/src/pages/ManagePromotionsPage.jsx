import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { promotionsAPI } from '../../api';
import Layout from '../../components/Layout';
import { LoadingSpinner, EmptyState, ErrorMessage, Pagination, Modal, ConfirmDialog } from '../../components/shared';
import { useToast } from '../../components/shared/ToastContext';
import './ManagePromotionsPage.css';

const ManagePromotionsPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

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
                showToast('Promotion updated successfully!', 'success');
            } else {
                await promotionsAPI.createPromotion(payload);
                showToast('Promotion created successfully!', 'success');
            }

            setShowCreateModal(false);
            setShowEditModal(false);
            fetchPromotions();
        } catch (err) {
            setFormError(err.response?.data?.error || 'Failed to save promotion');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedPromotion) return;

        try {
            await promotionsAPI.deletePromotion(selectedPromotion.id);
            showToast('Promotion deleted successfully!', 'success');
            setShowDeleteConfirm(false);
            fetchPromotions();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to delete promotion', 'error');
        }
    };

    const getPromotionStatus = (promotion) => {
        const now = new Date();
        const startDate = new Date(promotion.startTime);
        const endDate = new Date(promotion.endTime);

        if (now < startDate) return { label: 'Upcoming', className: 'status-upcoming' };
        if (now > endDate) return { label: 'Ended', className: 'status-ended' };
        return { label: 'Active', className: 'status-active' };
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
                <div className="page-header">
                    <div className="header-left">
                        <h1>Manage Promotions</h1>
                        <p>Create and manage promotional campaigns</p>
                    </div>
                    <div className="header-right">
                        <button onClick={openCreateModal} className="btn-primary">
                            + Create Promotion
                        </button>
                    </div>
                </div>

                {loading ? (
                    <LoadingSpinner text="Loading promotions..." />
                ) : error ? (
                    <ErrorMessage message={error} onRetry={fetchPromotions} />
                ) : promotions.length === 0 ? (
                    <EmptyState
                        icon="🎁"
                        title="No promotions yet"
                        description="Create your first promotion to engage customers."
                        action={
                            <button onClick={openCreateModal} className="btn-primary">
                                Create Promotion
                            </button>
                        }
                    />
                ) : (
                    <>
                        <div className="promotions-table-container">
                            <table className="promotions-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Duration</th>
                                        <th>Benefit</th>
                                        <th>Status</th>
                                        <th>Actions</th>
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
                                                        {promotion.type === 'automatic' ? 'Auto' : 'Code'}
                                                    </span>
                                                </td>
                                                <td className="cell-duration">
                                                    <div>{formatDate(promotion.startTime)}</div>
                                                    <div className="duration-to">to {formatDate(promotion.endTime)}</div>
                                                </td>
                                                <td className="cell-benefit">
                                                    {promotion.type === 'automatic' ? (
                                                        <span className="benefit-text">+{(promotion.rate * 100).toFixed(0)}% rate</span>
                                                    ) : (
                                                        <span className="benefit-text">+{promotion.points} pts</span>
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
                                                            View
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(promotion)}
                                                            className="btn-action btn-edit"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteConfirm(promotion)}
                                                            className="btn-action btn-delete"
                                                        >
                                                            Delete
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
                    title={showEditModal ? 'Edit Promotion' : 'Create Promotion'}
                    size="medium"
                >
                    <form onSubmit={handleSubmit} className="promotion-form">
                        {formError && (
                            <div className="form-error">{formError}</div>
                        )}

                        <div className="form-group">
                            <label htmlFor="name">Promotion Name *</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder="e.g., Summer Sale"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">Description</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder="Describe the promotion..."
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="type">Type *</label>
                            <select
                                id="type"
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="automatic">Automatic (Rate-based)</option>
                                <option value="one-time">One-Time Code</option>
                            </select>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="startTime">Start Date *</label>
                                <input
                                    type="datetime-local"
                                    id="startTime"
                                    name="startTime"
                                    value={formData.startTime}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="endTime">End Date *</label>
                                <input
                                    type="datetime-local"
                                    id="endTime"
                                    name="endTime"
                                    value={formData.endTime}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        {formData.type === 'automatic' ? (
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="rate">Bonus Rate *</label>
                                    <input
                                        type="number"
                                        id="rate"
                                        name="rate"
                                        value={formData.rate}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0"
                                        max="10"
                                        placeholder="e.g., 0.5 for 50%"
                                        required={formData.type === 'automatic'}
                                    />
                                    <span className="input-hint">Enter as decimal (0.5 = 50%)</span>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="minSpending">Min Spending ($)</label>
                                    <input
                                        type="number"
                                        id="minSpending"
                                        name="minSpending"
                                        value={formData.minSpending}
                                        onChange={handleInputChange}
                                        min="0"
                                        step="0.01"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="form-group">
                                <label htmlFor="points">Points *</label>
                                <input
                                    type="number"
                                    id="points"
                                    name="points"
                                    value={formData.points}
                                    onChange={handleInputChange}
                                    min="1"
                                    placeholder="e.g., 100"
                                    required={formData.type === 'one-time'}
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
                                className="btn-secondary"
                                disabled={formLoading}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary" disabled={formLoading}>
                                {formLoading ? 'Saving...' : showEditModal ? 'Update Promotion' : 'Create Promotion'}
                            </button>
                        </div>
                    </form>
                </Modal>

                {/* Delete Confirmation */}
                <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={handleDelete}
                    title="Delete Promotion"
                    message={`Are you sure you want to delete "${selectedPromotion?.name}"? This action cannot be undone.`}
                    confirmText="Delete"
                    confirmVariant="danger"
                />
            </div>
        </Layout>
    );
};

export default ManagePromotionsPage;
