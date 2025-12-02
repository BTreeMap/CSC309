import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { transactionsAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { LoadingSpinner, EmptyState, ErrorMessage, Pagination } from '../components/shared';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS } from '../utils/constants';
import '../styles/design-system.css';
import './MyTransactionsPage.css';

const MyTransactionsPage = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);

    // Parse query params
    const page = parseInt(searchParams.get('page') || '1', 10);
    const type = searchParams.get('type') || '';
    const limit = 10;

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = { page, limit };
            if (type) params.type = type;

            const data = await transactionsAPI.getMyTransactions(params);
            setTransactions(data.results || []);
            setTotalCount(data.count || 0);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, [page, type, limit]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const handlePageChange = (newPage) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        setSearchParams(params);
    };

    const handleFilterChange = (filterType) => {
        const params = new URLSearchParams(searchParams);
        if (filterType) {
            params.set('type', filterType);
        } else {
            params.delete('type');
        }
        params.set('page', '1');
        setSearchParams(params);
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
        const amount = transaction.amount;
        const isPositive = amount > 0;
        return {
            value: isPositive ? `+${amount.toLocaleString()}` : amount.toLocaleString(),
            className: isPositive ? 'amount-positive' : 'amount-negative',
        };
    };

    const getTransactionIcon = (type) => {
        const icons = {
            purchase: '🛒',
            redemption: '🎁',
            adjustment: '⚙️',
            transfer: '💸',
            event: '📅',
        };
        return icons[type] || '📋';
    };

    const totalPages = Math.ceil(totalCount / limit);

    return (
        <Layout>
            <div className="my-transactions-page">
                <div className="transactions-header">
                    <div className="header-left">
                        <h1>My Transactions</h1>
                        <p>View your transaction history</p>
                    </div>
                    <div className="header-right">
                        <div className="points-badge">
                            <span className="points-label">Current Points</span>
                            <span className="points-value">{user?.points?.toLocaleString() || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="filters-bar">
                    <div className="filter-group">
                        <label className="form-label">Filter by type:</label>
                        <select
                            value={type}
                            onChange={(e) => handleFilterChange(e.target.value)}
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
                </div>

                {loading ? (
                    <LoadingSpinner text="Loading transactions..." />
                ) : error ? (
                    <ErrorMessage message={error} onRetry={fetchTransactions} />
                ) : transactions.length === 0 ? (
                    <EmptyState
                        icon="📋"
                        title="No transactions found"
                        description={type ? `No ${type} transactions found.` : "You don't have any transactions yet."}
                        action={
                            <button
                                className="btn btn-ghost btn-danger btn-sm"
                                onClick={() => handleFilterChange('')}
                            >
                                Clear Filters
                            </button>
                        }
                    />
                ) : (
                    <>
                        <div className="transactions-list">
                            {transactions.map((transaction) => {
                                const amountDisplay = getAmountDisplay(transaction);
                                return (
                                    <div key={transaction.id} className="transaction-card">
                                        <div className="transaction-icon" style={{ backgroundColor: TRANSACTION_TYPE_COLORS[transaction.type] + '20' }}>
                                            <span>{getTransactionIcon(transaction.type)}</span>
                                        </div>

                                        <div className="transaction-main">
                                            <div className="transaction-top">
                                                <span
                                                    className="transaction-type"
                                                    style={{ color: TRANSACTION_TYPE_COLORS[transaction.type] }}
                                                >
                                                    {TRANSACTION_TYPE_LABELS[transaction.type] || transaction.type}
                                                </span>
                                                <span className="transaction-date">{formatDate(transaction.createdAt)}</span>
                                            </div>

                                            <div className="transaction-details">
                                                {transaction.remark && (
                                                    <span className="transaction-remark">{transaction.remark}</span>
                                                )}
                                                {transaction.relatedId && transaction.type === 'transfer' && (
                                                    <span className="transaction-related">
                                                        {transaction.amount > 0 ? 'From' : 'To'} User #{transaction.relatedId}
                                                    </span>
                                                )}
                                                {transaction.type === 'redemption' && !transaction.processedAt && (
                                                    <Link
                                                        to={`/redeem/${transaction.id}/qr`}
                                                        className="view-qr-link"
                                                    >
                                                        View QR Code
                                                    </Link>
                                                )}
                                            </div>
                                        </div>

                                        <div className="transaction-amount-section">
                                            <span className={`transaction-amount ${amountDisplay.className}`}>
                                                {amountDisplay.value}
                                            </span>
                                            <span className="points-text">points</span>
                                            {transaction.type === 'redemption' && (
                                                <span className={`status-badge ${transaction.processedAt ? 'status-processed' : 'status-pending'}`}>
                                                    {transaction.processedAt ? 'Processed' : 'Pending'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
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

export default MyTransactionsPage;
