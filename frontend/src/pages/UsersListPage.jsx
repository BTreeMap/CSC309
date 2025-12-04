import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usersAPI, transactionsAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { LoadingSpinner, EmptyState, ErrorMessage, Pagination, Modal, PageHeader } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import { ROLE_LABELS, ROLE_HIERARCHY } from '../utils/constants';
import { Users } from 'lucide-react';
import '../styles/design-system.css';
import './UsersListPage.css';

const UsersListPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user: currentUser } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const { t } = useTranslation(['users', 'common']);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);

    const [selectedUser, setSelectedUser] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [adjustmentAmount, setAdjustmentAmount] = useState('');
    const [adjustmentRemark, setAdjustmentRemark] = useState('');
    const [adjustmentLoading, setAdjustmentLoading] = useState(false);

    const [editForm, setEditForm] = useState({
        verified: false,
        role: 'regular',
    });
    const [editLoading, setEditLoading] = useState(false);

    // Parse query params
    const page = parseInt(searchParams.get('page') || '1', 10);
    const name = searchParams.get('name') || '';
    const role = searchParams.get('role') || '';
    const verified = searchParams.get('verified') || '';
    const activated = searchParams.get('activated') || '';
    const limit = 10;

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = { page, limit };
            if (name) params.name = name;
            if (role) params.role = role;
            if (verified) params.verified = verified === 'true';
            if (activated) params.activated = activated === 'true';

            const data = await usersAPI.getUsers(params);
            setUsers(data.results || []);
            setTotalCount(data.count || 0);
        } catch (err) {
            setError(err.response?.data?.error || t('users:toast.errorLoadUsers'));
        } finally {
            setLoading(false);
        }
    }, [page, name, role, verified, activated, limit]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

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

    const handleOpenView = (user) => {
        setSelectedUser(user);
        setShowViewModal(true);
    };

    const handleOpenAdjust = (user) => {
        setSelectedUser(user);
        setAdjustmentAmount('');
        setAdjustmentRemark('');
        setShowAdjustModal(true);
    };

    const handleOpenEdit = (user) => {
        if (!canEditUser(user)) {
            showToast(t('users:toast.noPermission'), 'error');
            return;
        }

        setSelectedUser(user);
        const availableRoles = getAvailableRoleOptions();
        const currentRole = user.role || 'regular';

        let initialRole = currentRole;
        if (!availableRoles.includes(currentRole) && availableRoles.length > 0) {
            initialRole = availableRoles[0];
        }

        setEditForm({
            verified: user.verified || false,
            role: initialRole,
        });
        setShowEditModal(true);
    };

    const handleEditUser = async () => {
        if (!selectedUser) return;

        const updates = {};
        if (editForm.verified !== selectedUser.verified) {
            if (editForm.verified) {
                updates.verified = true;
            }
        }
        if (editForm.role !== selectedUser.role) {
            updates.role = editForm.role;
        }

        if (Object.keys(updates).length === 0) {
            showToast(t('users:toast.noChanges'), 'info');
            return;
        }

        setEditLoading(true);
        try {
            await usersAPI.updateUser(selectedUser.id, updates);
            showToast(t('users:toast.userUpdated'), 'success');
            setShowEditModal(false);
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.error || t('users:toast.errorUpdateUser'), 'error');
        } finally {
            setEditLoading(false);
        }
    };

    const handleAdjustPoints = async () => {
        if (!adjustmentAmount || parseInt(adjustmentAmount, 10) === 0) {
            showToast(t('users:toast.invalidAmount'), 'error');
            return;
        }

        setAdjustmentLoading(true);
        try {
            await transactionsAPI.createAdjustment({
                utorid: selectedUser.utorid,
                amount: parseInt(adjustmentAmount, 10),
                remark: adjustmentRemark || undefined,
            });
            showToast(t('users:toast.pointsAdjusted'), 'success');
            setShowAdjustModal(false);
            setAdjustmentAmount('');
            setAdjustmentRemark('');
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.error || t('users:toast.errorAdjustPoints'), 'error');
        } finally {
            setAdjustmentLoading(false);
        }
    };

    const canEditUser = (targetUser) => {
        if (!currentUser || !targetUser) return false;

        const currentUserRole = currentUser.role;

        if (currentUserRole === 'superuser') {
            return true;
        }

        if (currentUserRole === 'manager') {
            const targetRoleLevel = ROLE_HIERARCHY[targetUser.role] ?? 0;
            const managerLevel = ROLE_HIERARCHY['manager'] ?? 0;
            return targetRoleLevel < managerLevel;
        }

        return false;
    };

    const getAvailableRoleOptions = () => {
        if (!currentUser) return ['regular'];

        const currentUserRole = currentUser.role;
        if (currentUserRole === 'superuser') {
            return ['regular', 'cashier', 'manager', 'superuser'];
        } else if (currentUserRole === 'manager') {
            return ['regular', 'cashier'];
        }
        return ['regular'];
    };

    const getRoleColor = (role) => {
        const colors = {
            regular: '#9e9e9e',
            cashier: '#2196f3',
            manager: '#ff9800',
            superuser: '#f44336',
        };
        return colors[role] || '#9e9e9e';
    };

    const totalPages = Math.ceil(totalCount / limit);
    const hasFilters = name || role || verified || activated;

    return (
        <Layout>
            <div className="users-list-page">
                <PageHeader
                    icon={<Users />}
                    title={t('users:management.title')}
                    subtitle={t('users:management.subtitle')}
                    actions={
                        <button onClick={() => navigate('/register')} className="btn btn-primary">
                            + {t('users:management.createUser')}
                        </button>
                    }
                />

                <div className="filters-bar">
                    <div className="filters-row">
                        <div className="filter-group search-group">
                            <label className="form-label">{t('users:filters.search')}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => handleFilterChange('name', e.target.value)}
                                placeholder={t('users:filters.searchPlaceholder')}
                                className="form-input"
                            />
                        </div>

                        <div className="filter-group">
                            <label className="form-label">{t('users:filters.role')}</label>
                            <select
                                value={role}
                                onChange={(e) => handleFilterChange('role', e.target.value)}
                                className="form-select"
                            >
                                <option value="">{t('users:filters.allRoles')}</option>
                                <option value="regular">{t('users:roles.regular')}</option>
                                <option value="cashier">{t('users:roles.cashier')}</option>
                                <option value="manager">{t('users:roles.manager')}</option>
                                <option value="superuser">{t('users:roles.superuser')}</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="form-label">{t('users:filters.verified')}</label>
                            <select
                                value={verified}
                                onChange={(e) => handleFilterChange('verified', e.target.value)}
                                className="form-select"
                            >
                                <option value="">{t('users:filters.all')}</option>
                                <option value="true">{t('users:status.verified')}</option>
                                <option value="false">{t('users:status.unverified')}</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="form-label">{t('users:filters.activated')}</label>
                            <select
                                value={activated}
                                onChange={(e) => handleFilterChange('activated', e.target.value)}
                                className="form-select"
                            >
                                <option value="">{t('users:filters.all')}</option>
                                <option value="true">{t('users:filters.activated')}</option>
                                <option value="false">{t('users:filters.notActivated')}</option>
                            </select>
                        </div>

                        {hasFilters && (
                            <button onClick={clearFilters} className="btn btn-ghost btn-danger btn-sm">
                                {t('users:filters.clear')}
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <LoadingSpinner text={t('users:management.loading')} />
                ) : error ? (
                    <ErrorMessage message={error} onRetry={fetchUsers} />
                ) : users.length === 0 ? (
                    <EmptyState
                        icon={<Users size={48} strokeWidth={1.5} />}
                        title={t('users:management.noUsersFound')}
                        description={hasFilters ? t('users:management.noUsersFiltered') : t('users:management.noUsersInSystem')}
                        action={
                            hasFilters && (
                                <button onClick={clearFilters} className="btn btn-secondary">
                                    {t('common:clearFilters')}
                                </button>
                            )
                        }
                    />
                ) : (
                    <>
                        <div className="users-summary">
                            {t('users:management.showingUsers', { count: users.length, total: totalCount.toLocaleString() })}
                        </div>

                        <div className="users-table-container">
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>{t('users:table.user')}</th>
                                        <th>{t('users:table.utorid')}</th>
                                        <th>{t('users:table.role')}</th>
                                        <th>{t('users:table.points')}</th>
                                        <th>{t('users:table.status')}</th>
                                        <th>{t('users:table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td>
                                                <div className="user-cell">
                                                    <div className="user-avatar">
                                                        {user.avatarUrl ? (
                                                            <img src={user.avatarUrl} alt={user.name} />
                                                        ) : (
                                                            <span>{user.name?.charAt(0).toUpperCase() || '?'}</span>
                                                        )}
                                                    </div>
                                                    <div className="user-info">
                                                        <span className="user-name">{user.name}</span>
                                                        <span className="user-email">{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="cell-utorid">{user.utorid}</td>
                                            <td>
                                                <span
                                                    className="role-badge"
                                                    style={{ backgroundColor: getRoleColor(user.role) + '20', color: getRoleColor(user.role) }}
                                                >
                                                    {ROLE_LABELS[user.role] || user.role}
                                                </span>
                                            </td>
                                            <td className="cell-points">{user.points?.toLocaleString() || 0}</td>
                                            <td>
                                                <div className="status-badges">
                                                    <span className={`status-badge ${user.verified ? 'verified' : 'unverified'}`}>
                                                        {user.verified ? `✓ ${t('users:status.verified')}` : `○ ${t('users:status.unverified')}`}
                                                    </span>
                                                    {!user.lastLogin && (
                                                        <span className="status-badge inactive">{t('users:filters.notActivated')}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        onClick={() => handleOpenView(user)}
                                                        className="btn-action btn-view"
                                                    >
                                                        {t('users:actions.view')}
                                                    </button>
                                                    {canEditUser(user) ? (
                                                        <button
                                                            onClick={() => handleOpenEdit(user)}
                                                            className="btn-action btn-edit"
                                                        >
                                                            {t('users:actions.edit')}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled
                                                            className="btn-action btn-edit"
                                                            title={t('users:actions.noPermission')}
                                                        >
                                                            {t('users:actions.edit')}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleOpenAdjust(user)}
                                                        className="btn-action btn-adjust"
                                                    >
                                                        {t('users:actions.adjust')}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
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

                {/* Points Adjustment Modal */}
                <Modal
                    isOpen={showAdjustModal}
                    onClose={() => setShowAdjustModal(false)}
                    title={t('users:modal.adjustPoints')}
                    size="small"
                >
                    {selectedUser && (
                        <div className="adjust-modal">
                            <div className="user-summary">
                                <strong>{selectedUser.name}</strong>
                                <span>{t('users:modal.currentPoints')}: {selectedUser.points?.toLocaleString() || 0}</span>
                            </div>

                            <div className="form-group">
                                <label>{t('users:modal.adjustmentAmount')}</label>
                                <input
                                    type="number"
                                    value={adjustmentAmount}
                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                    placeholder={t('users:modal.adjustmentPlaceholder')}
                                    className="adjustment-input"
                                />
                                <span className="input-hint">{t('users:modal.adjustmentHint')}</span>
                            </div>

                            <div className="form-group">
                                <label>{t('users:modal.reason')}</label>
                                <input
                                    type="text"
                                    value={adjustmentRemark}
                                    onChange={(e) => setAdjustmentRemark(e.target.value)}
                                    placeholder={t('users:modal.reasonPlaceholder')}
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    onClick={() => setShowAdjustModal(false)}
                                    className="btn btn-secondary"
                                    disabled={adjustmentLoading}
                                >
                                    {t('common:cancel')}
                                </button>
                                <button
                                    onClick={handleAdjustPoints}
                                    className="btn btn-primary"
                                    disabled={adjustmentLoading || !adjustmentAmount}
                                >
                                    {adjustmentLoading ? t('users:adjustPoints.adjusting') : t('users:modal.adjustPoints')}
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* User Details Modal */}
                <Modal
                    isOpen={showViewModal}
                    onClose={() => setShowViewModal(false)}
                    title={t('users:modal.userDetails')}
                    size="medium"
                >
                    {selectedUser && (
                        <div className="user-details-modal">
                            <div className="user-detail-header">
                                <div className="user-avatar-large">
                                    {selectedUser.avatarUrl ? (
                                        <img src={selectedUser.avatarUrl} alt={selectedUser.name} />
                                    ) : (
                                        <span>{selectedUser.name?.charAt(0).toUpperCase() || '?'}</span>
                                    )}
                                </div>
                                <div className="user-basic-info">
                                    <h3>{selectedUser.name}</h3>
                                    <p className="user-email">{selectedUser.email}</p>
                                </div>
                            </div>

                            <div className="user-detail-grid">
                                <div className="detail-item">
                                    <label>{t('users:modal.utoridLabel')}</label>
                                    <span>{selectedUser.utorid}</span>
                                </div>
                                <div className="detail-item">
                                    <label>{t('users:table.role')}</label>
                                    <span
                                        className="role-badge"
                                        style={{ backgroundColor: getRoleColor(selectedUser.role) + '20', color: getRoleColor(selectedUser.role) }}
                                    >
                                        {ROLE_LABELS[selectedUser.role] || selectedUser.role}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <label>{t('users:table.points')}</label>
                                    <span className="points-value">{selectedUser.points?.toLocaleString() || 0}</span>
                                </div>
                                <div className="detail-item">
                                    <label>{t('users:modal.verificationStatus')}</label>
                                    <span className={`status-badge ${selectedUser.verified ? 'verified' : 'unverified'}`}>
                                        {selectedUser.verified ? `✓ ${t('users:status.verified')}` : `○ ${t('users:status.unverified')}`}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <label>{t('users:modal.createdAt')}</label>
                                    <span>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <label>{t('users:modal.lastLogin')}</label>
                                    <span>{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleDateString() : t('users:modal.never')}</span>
                                </div>
                            </div>

                            <div className="modal-actions">
                                {canEditUser(selectedUser) && (
                                    <button
                                        onClick={() => {
                                            setShowViewModal(false);
                                            handleOpenEdit(selectedUser);
                                        }}
                                        className="btn btn-secondary"
                                    >
                                        {t('users:actions.editUser')}
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        handleOpenAdjust(selectedUser);
                                    }}
                                    className="btn btn-secondary"
                                >
                                    {t('users:actions.adjustPoints')}
                                </button>
                                <button
                                    onClick={() => setShowViewModal(false)}
                                    className="btn btn-primary"
                                >
                                    {t('common:close')}
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* Edit User Modal */}
                <Modal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    title={t('users:modal.editUser')}
                    size="medium"
                >
                    {selectedUser && (
                        <div className="edit-user-modal">
                            <div className="user-summary">
                                <strong>{selectedUser.name}</strong>
                                <span>{t('users:modal.utoridLabel')}: {selectedUser.utorid}</span>
                            </div>

                            <div className="form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={editForm.verified}
                                        onChange={(e) => setEditForm({ ...editForm, verified: e.target.checked })}
                                        disabled={selectedUser.verified}
                                    />
                                    <span>{t('users:status.verified')}</span>
                                </label>
                                {selectedUser.verified && (
                                    <span className="input-hint">{t('users:modal.alreadyVerified')}</span>
                                )}
                                {!selectedUser.verified && (
                                    <span className="input-hint">{t('users:modal.verifyUser')}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label>{t('users:table.role')}</label>
                                {(() => {
                                    const availableRoles = getAvailableRoleOptions();
                                    const userCurrentRole = selectedUser.role;
                                    const canSetCurrentRole = availableRoles.includes(userCurrentRole);

                                    return (
                                        <>
                                            <select
                                                value={editForm.role}
                                                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                                className="form-select"
                                            >
                                                {availableRoles.map((roleOption) => (
                                                    <option key={roleOption} value={roleOption}>
                                                        {ROLE_LABELS[roleOption] || roleOption}
                                                    </option>
                                                ))}
                                            </select>
                                            {!canSetCurrentRole && (
                                                <span className="input-hint" style={{ color: 'var(--color-warning)' }}>
                                                    {t('users:modal.roleCannotSet', { role: ROLE_LABELS[userCurrentRole] || userCurrentRole })}
                                                </span>
                                            )}
                                            <span className="input-hint">
                                                {currentUser?.role === 'manager'
                                                    ? t('users:modal.roleHintManager')
                                                    : currentUser?.role === 'superuser'
                                                        ? t('users:modal.roleHintSuperuser')
                                                        : ''}
                                            </span>
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="modal-actions">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="btn btn-secondary"
                                    disabled={editLoading}
                                >
                                    {t('common:cancel')}
                                </button>
                                <button
                                    onClick={handleEditUser}
                                    className="btn btn-primary"
                                    disabled={editLoading}
                                >
                                    {editLoading ? t('common:saving') : t('users:modal.saveChanges')}
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </Layout>
    );
};

export default UsersListPage;
