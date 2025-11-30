import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usersAPI } from '../../api';
import Layout from '../../components/Layout';
import { LoadingSpinner, EmptyState, ErrorMessage, Pagination, Modal } from '../../components/shared';
import { useToast } from '../../components/shared/ToastContext';
import { ROLE_LABELS } from '../../utils/constants';
import './UsersListPage.css';

const UsersListPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);

    // Selected user for adjustment
    const [selectedUser, setSelectedUser] = useState(null);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustmentAmount, setAdjustmentAmount] = useState('');
    const [adjustmentRemark, setAdjustmentRemark] = useState('');
    const [adjustmentLoading, setAdjustmentLoading] = useState(false);

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
            setError(err.response?.data?.error || 'Failed to load users');
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

    const handleOpenAdjust = (user) => {
        setSelectedUser(user);
        setAdjustmentAmount('');
        setAdjustmentRemark('');
        setShowAdjustModal(true);
    };

    const handleAdjustPoints = async () => {
        if (!adjustmentAmount || parseInt(adjustmentAmount, 10) === 0) {
            showToast('Please enter a valid amount', 'error');
            return;
        }

        setAdjustmentLoading(true);
        try {
            await usersAPI.updateUser(selectedUser.id, {
                points: parseInt(adjustmentAmount, 10),
                remark: adjustmentRemark || undefined,
            });
            showToast('Points adjusted successfully!', 'success');
            setShowAdjustModal(false);
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to adjust points', 'error');
        } finally {
            setAdjustmentLoading(false);
        }
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
                <div className="page-header">
                    <div className="header-left">
                        <h1>User Management</h1>
                        <p>View and manage system users</p>
                    </div>
                    <div className="header-right">
                        <button onClick={() => navigate('/users/create')} className="btn-primary">
                            + Create User
                        </button>
                    </div>
                </div>

                <div className="users-filters">
                    <div className="filters-row">
                        <div className="filter-group search-group">
                            <label>Search</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => handleFilterChange('name', e.target.value)}
                                placeholder="Search by name or UTORid..."
                                className="filter-input"
                            />
                        </div>

                        <div className="filter-group">
                            <label>Role</label>
                            <select
                                value={role}
                                onChange={(e) => handleFilterChange('role', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All Roles</option>
                                <option value="regular">Regular</option>
                                <option value="cashier">Cashier</option>
                                <option value="manager">Manager</option>
                                <option value="superuser">Superuser</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Verified</label>
                            <select
                                value={verified}
                                onChange={(e) => handleFilterChange('verified', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All</option>
                                <option value="true">Verified</option>
                                <option value="false">Unverified</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Activated</label>
                            <select
                                value={activated}
                                onChange={(e) => handleFilterChange('activated', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All</option>
                                <option value="true">Activated</option>
                                <option value="false">Not Activated</option>
                            </select>
                        </div>

                        {hasFilters && (
                            <button onClick={clearFilters} className="clear-filters-btn">
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <LoadingSpinner text="Loading users..." />
                ) : error ? (
                    <ErrorMessage message={error} onRetry={fetchUsers} />
                ) : users.length === 0 ? (
                    <EmptyState
                        icon="👥"
                        title="No users found"
                        description={hasFilters ? "No users match your filters." : "No users in the system."}
                        action={
                            hasFilters && (
                                <button onClick={clearFilters} className="btn-secondary">
                                    Clear Filters
                                </button>
                            )
                        }
                    />
                ) : (
                    <>
                        <div className="users-summary">
                            Showing {users.length} of {totalCount.toLocaleString()} users
                        </div>

                        <div className="users-table-container">
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>UTORid</th>
                                        <th>Role</th>
                                        <th>Points</th>
                                        <th>Status</th>
                                        <th>Actions</th>
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
                                                        {user.verified ? '✓ Verified' : '○ Unverified'}
                                                    </span>
                                                    {!user.lastLogin && (
                                                        <span className="status-badge inactive">Not Activated</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        onClick={() => navigate(`/users/${user.id}`)}
                                                        className="btn-action btn-view"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenAdjust(user)}
                                                        className="btn-action btn-adjust"
                                                    >
                                                        Adjust
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
                    title="Adjust Points"
                    size="small"
                >
                    {selectedUser && (
                        <div className="adjust-modal">
                            <div className="user-summary">
                                <strong>{selectedUser.name}</strong>
                                <span>Current Points: {selectedUser.points?.toLocaleString() || 0}</span>
                            </div>

                            <div className="form-group">
                                <label>Adjustment Amount</label>
                                <input
                                    type="number"
                                    value={adjustmentAmount}
                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                    placeholder="e.g., 100 or -50"
                                    className="adjustment-input"
                                />
                                <span className="input-hint">Positive to add, negative to subtract</span>
                            </div>

                            <div className="form-group">
                                <label>Reason (Optional)</label>
                                <input
                                    type="text"
                                    value={adjustmentRemark}
                                    onChange={(e) => setAdjustmentRemark(e.target.value)}
                                    placeholder="e.g., Bonus for promotion"
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    onClick={() => setShowAdjustModal(false)}
                                    className="btn-secondary"
                                    disabled={adjustmentLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAdjustPoints}
                                    className="btn-primary"
                                    disabled={adjustmentLoading || !adjustmentAmount}
                                >
                                    {adjustmentLoading ? 'Adjusting...' : 'Adjust Points'}
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
