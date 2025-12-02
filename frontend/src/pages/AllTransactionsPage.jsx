import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { transactionsAPI, usersAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, EmptyState, ErrorMessage, Pagination, Modal } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS } from '../utils/constants';
import { ShoppingCart, Gift, Settings, ArrowLeftRight, Calendar, ClipboardList } from 'lucide-react';
import '../styles/design-system.css';
import './AllTransactionsPage.css';

const AllTransactionsPage = () => {
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);

    // Selected transaction for details modal
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [transactionUser, setTransactionUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(false);

    // Parse query params
    const page = parseInt(searchParams.get('page') || '1', 10);
    const type = searchParams.get('type') || '';
    const userId = searchParams.get('userId') || '';
    const promotionId = searchParams.get('promotionId') || '';
    const suspicious = searchParams.get('suspicious') || '';
    const amount = searchParams.get('amount') || '';
    const operator = searchParams.get('operator') || 'gte';
    const relatedId = searchParams.get('relatedId') || '';
    const limit = 10;

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = { page, limit };
            if (type) params.type = type;
            if (userId) params.userId = userId;
            if (promotionId) params.promotionId = promotionId;
            if (suspicious) params.suspicious = suspicious === 'true';
            if (amount) {
                params.amount = parseInt(amount, 10);
                params.operator = operator;
            }
            if (relatedId) params.relatedId = relatedId;

            const data = await transactionsAPI.getTransactions(params);
            setTransactions(data.results || []);
            setTotalCount(data.count || 0);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, [page, type, userId, promotionId, suspicious, amount, operator, relatedId, limit]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

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

    const clearAllFilters = () => {
        setSearchParams({ page: '1' });
    };

    const handleViewDetails = async (transaction) => {
        setSelectedTransaction(transaction);
        setTransactionUser(null);
        setLoadingUser(true);

        try {
            const userData = await usersAPI.getUser(transaction.utorid);
            setTransactionUser(userData);
        } catch {
            // User data optional
        } finally {
            setLoadingUser(false);
        }
    };

    const handleMarkSuspicious = async (transaction) => {
        try {
            await transactionsAPI.markSuspicious(transaction.id, !transaction.suspicious);
            showToast(
                transaction.suspicious ? 'Transaction unmarked as suspicious' : 'Transaction marked as suspicious',
                'success'
            );
            fetchTransactions();
            if (selectedTransaction?.id === transaction.id) {
                setSelectedTransaction({ ...selectedTransaction, suspicious: !transaction.suspicious });
            }
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to update transaction', 'error');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getAmountDisplay = (transaction) => {
        const amount = Math.abs(transaction.amount);
        const isPositive = transaction.amount > 0;
        return {
            value: isPositive ? `+${amount.toLocaleString()}` : `-${amount.toLocaleString()}`,
            className: isPositive ? 'amount-positive' : 'amount-negative',
        };
    };

    const getTransactionIcon = (type) => {
        const icons = {
            purchase: <ShoppingCart size={18} />,
            redemption: <Gift size={18} />,
            adjustment: <Settings size={18} />,
            transfer: <ArrowLeftRight size={18} />,
            event: <Calendar size={18} />,
        };
        return icons[type] || <ClipboardList size={18} />;
    };

    const totalPages = Math.ceil(totalCount / limit);
    const hasActiveFilters = type || userId || promotionId || suspicious || amount || relatedId;

    return (
        <Layout>
            <div className="all-transactions-page">
                <div className="page-header">
                    <h1>All Transactions</h1>
                    <p>View and manage all system transactions</p>
                </div>

                <div className="filters-bar">
                    <div className="filters-row">
                        <div className="filter-group">
                            <label className="form-label">Type</label>
                            <select
                                value={type}
                                onChange={(e) => handleFilterChange('type', e.target.value)}
                                className="form-select"
                            >
                                <option value="">All Types</option>
                                <option value="purchase">Purchase</option>
                                <option value="redemption">Redemption</option>
                                <option value="transfer">Transfer</option>
                                <option value="adjustment">Adjustment</option>
                                <option value="event">Event</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="form-label">User ID</label>
                            <input
                                type="text"
                                value={userId}
                                onChange={(e) => handleFilterChange('userId', e.target.value)}
                                placeholder="e.g. john_doe"
                                className="form-input"
                            />
                        </div>

                        <div className="filter-group">
                            <label className="form-label">Related ID</label>
                            <input
                                type="text"
                                value={relatedId}
                                onChange={(e) => handleFilterChange('relatedId', e.target.value)}
                                placeholder="e.g. transfer user"
                                className="form-input"
                            />
                        </div>

                        <div className="filter-group">
                            <label className="form-label">Suspicious</label>
                            <select
                                value={suspicious}
                                onChange={(e) => handleFilterChange('suspicious', e.target.value)}
                                className="form-select"
                            >
                                <option value="">All</option>
                                <option value="true">Suspicious Only</option>
                                <option value="false">Not Suspicious</option>
                            </select>
                        </div>
                    </div>

                    <div className="filters-row">
                        <div className="filter-group filter-amount">
                            <label className="form-label">Amount</label>
                            <div className="amount-filter">
                                <select
                                    value={operator}
                                    onChange={(e) => handleFilterChange('operator', e.target.value)}
                                    className="form-select operator-select"
                                >
                                    <option value="gte">≥</option>
                                    <option value="lte">≤</option>
                                </select>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => handleFilterChange('amount', e.target.value)}
                                    placeholder="Points"
                                    className="form-input amount-input"
                                />
                            </div>
                        </div>

                        <div className="filter-group">
                            <label className="form-label">Promotion ID</label>
                            <input
                                type="text"
                                value={promotionId}
                                onChange={(e) => handleFilterChange('promotionId', e.target.value)}
                                placeholder="e.g. 123"
                                className="form-input"
                            />
                        </div>

                        {hasActiveFilters && (
                            <button onClick={clearAllFilters} className="btn btn-ghost btn-danger btn-sm">
                                Clear All Filters
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <LoadingSpinner text="Loading transactions..." />
                ) : error ? (
                    <ErrorMessage message={error} onRetry={fetchTransactions} />
                ) : transactions.length === 0 ? (
                    <EmptyState
                        icon={<ClipboardList size={48} strokeWidth={1.5} />}
                        title="No transactions found"
                        description={hasActiveFilters ? "No transactions match your filters." : "No transactions in the system yet."}
                        action={
                            hasActiveFilters && (
                                <button onClick={clearAllFilters} className="btn btn-secondary">
                                    Clear Filters
                                </button>
                            )
                        }
                    />
                ) : (
                    <>
                        <div className="transactions-summary">
                            Showing {transactions.length} of {totalCount.toLocaleString()} transactions
                        </div>

                        <div className="transactions-table-container">
                            <table className="transactions-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Type</th>
                                        <th>User</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((transaction) => {
                                        const amountDisplay = getAmountDisplay(transaction);
                                        return (
                                            <tr
                                                key={transaction.id}
                                                className={transaction.suspicious ? 'suspicious-row' : ''}
                                            >
                                                <td className="cell-id">#{transaction.id}</td>
                                                <td>
                                                    <div className="type-cell">
                                                        <span className="type-icon">{getTransactionIcon(transaction.type)}</span>
                                                        <span
                                                            className="type-label"
                                                            style={{ color: TRANSACTION_TYPE_COLORS[transaction.type] }}
                                                        >
                                                            {TRANSACTION_TYPE_LABELS[transaction.type] || transaction.type}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="cell-user">{transaction.utorid}</td>
                                                <td>
                                                    <span className={`amount ${amountDisplay.className}`}>
                                                        {amountDisplay.value}
                                                    </span>
                                                </td>
                                                <td className="cell-date">{formatDate(transaction.createdAt)}</td>
                                                <td>
                                                    <div className="status-cell">
                                                        {transaction.suspicious && (
                                                            <span className="badge badge-suspicious">⚠️ Suspicious</span>
                                                        )}
                                                        {transaction.type === 'redemption' && (
                                                            <span className={`badge ${transaction.processedAt ? 'badge-processed' : 'badge-pending'}`}>
                                                                {transaction.processedAt ? 'Processed' : 'Pending'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            onClick={() => handleViewDetails(transaction)}
                                                            className="btn-action btn-view"
                                                        >
                                                            View
                                                        </button>
                                                        <button
                                                            onClick={() => handleMarkSuspicious(transaction)}
                                                            className={`btn-action ${transaction.suspicious ? 'btn-unsuspicious' : 'btn-suspicious'}`}
                                                        >
                                                            {transaction.suspicious ? 'Unmark' : 'Flag'}
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

                {/* Transaction Details Modal */}
                <Modal
                    isOpen={!!selectedTransaction}
                    onClose={() => setSelectedTransaction(null)}
                    title="Transaction Details"
                    size="medium"
                >
                    {selectedTransaction && (
                        <div className="transaction-details-modal">
                            <div className="detail-header">
                                <span className="detail-icon" style={{ backgroundColor: TRANSACTION_TYPE_COLORS[selectedTransaction.type] + '20' }}>
                                    {getTransactionIcon(selectedTransaction.type)}
                                </span>
                                <div className="detail-title">
                                    <h3>{TRANSACTION_TYPE_LABELS[selectedTransaction.type] || selectedTransaction.type}</h3>
                                    <span className="detail-id">Transaction #{selectedTransaction.id}</span>
                                </div>
                            </div>

                            <div className="detail-grid">
                                <div className="detail-item">
                                    <label>Amount</label>
                                    <span className={`detail-amount ${selectedTransaction.amount > 0 ? 'amount-positive' : 'amount-negative'}`}>
                                        {selectedTransaction.amount > 0 ? '+' : ''}{selectedTransaction.amount.toLocaleString()} points
                                    </span>
                                </div>

                                <div className="detail-item">
                                    <label>User</label>
                                    <span>{selectedTransaction.utorid}</span>
                                </div>

                                <div className="detail-item">
                                    <label>Created</label>
                                    <span>{formatDate(selectedTransaction.createdAt)}</span>
                                </div>

                                {selectedTransaction.processedAt && (
                                    <div className="detail-item">
                                        <label>Processed</label>
                                        <span>{formatDate(selectedTransaction.processedAt)}</span>
                                    </div>
                                )}

                                {selectedTransaction.promotionIds && selectedTransaction.promotionIds.length > 0 && (
                                    <div className="detail-item">
                                        <label>Promotions Applied</label>
                                        <span>{selectedTransaction.promotionIds.join(', ')}</span>
                                    </div>
                                )}

                                {selectedTransaction.relatedId && (
                                    <div className="detail-item">
                                        <label>Related ID</label>
                                        <span>{selectedTransaction.relatedId}</span>
                                    </div>
                                )}

                                {selectedTransaction.remark && (
                                    <div className="detail-item full-width">
                                        <label>Remark</label>
                                        <span className="remark-text">{selectedTransaction.remark}</span>
                                    </div>
                                )}

                                <div className="detail-item">
                                    <label>Status</label>
                                    <div className="status-badges">
                                        {selectedTransaction.suspicious ? (
                                            <span className="badge badge-suspicious">⚠️ Suspicious</span>
                                        ) : (
                                            <span className="badge badge-normal">✓ Normal</span>
                                        )}
                                        {selectedTransaction.type === 'redemption' && (
                                            <span className={`badge ${selectedTransaction.processedAt ? 'badge-processed' : 'badge-pending'}`}>
                                                {selectedTransaction.processedAt ? 'Processed' : 'Pending'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {loadingUser ? (
                                <div className="user-info loading">Loading user info...</div>
                            ) : transactionUser && (
                                <div className="user-info">
                                    <h4>User Information</h4>
                                    <div className="user-details">
                                        <span><strong>Name:</strong> {transactionUser.name}</span>
                                        <span><strong>Email:</strong> {transactionUser.email}</span>
                                        <span><strong>Current Points:</strong> {transactionUser.points?.toLocaleString()}</span>
                                        <span><strong>Role:</strong> {transactionUser.role}</span>
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button
                                    onClick={() => handleMarkSuspicious(selectedTransaction)}
                                    className={`btn ${selectedTransaction.suspicious ? 'btn-secondary' : 'btn-warning'}`}
                                >
                                    {selectedTransaction.suspicious ? 'Remove Suspicious Flag' : 'Mark as Suspicious'}
                                </button>
                                <button onClick={() => setSelectedTransaction(null)} className="btn btn-secondary">
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </Layout>
    );
};

export default AllTransactionsPage;
