import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transactionsAPI, usersAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, EmptyState, ErrorMessage, Pagination, Modal, PageHeader } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS } from '../utils/constants';
import { ShoppingCart, Gift, Settings, ArrowLeftRight, Calendar, ClipboardList, BarChart3 } from 'lucide-react';
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

    // Adjustment transaction modal
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [adjustmentAmount, setAdjustmentAmount] = useState('');
    const [adjustmentRemark, setAdjustmentRemark] = useState('');
    const [adjustmentLoading, setAdjustmentLoading] = useState(false);

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
            const userData = await usersAPI.lookupUser(transaction.utorid);
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

    const handleOpenAdjustment = () => {
        setAdjustmentAmount('');
        setAdjustmentRemark('');
        setShowAdjustmentModal(true);
    };

    const handleCreateAdjustment = async () => {
        if (!selectedTransaction) return;

        if (!adjustmentAmount || parseInt(adjustmentAmount, 10) === 0) {
            showToast('Please enter a valid amount', 'error');
            return;
        }

        setAdjustmentLoading(true);
        try {
            await transactionsAPI.createAdjustment({
                utorid: selectedTransaction.utorid,
                amount: parseInt(adjustmentAmount, 10),
                relatedId: selectedTransaction.id,
                remark: adjustmentRemark.trim() || undefined,
            });
            showToast('Adjustment transaction created successfully!', 'success');
            setShowAdjustmentModal(false);
            setAdjustmentAmount('');
            setAdjustmentRemark('');
            fetchTransactions();
            setSelectedTransaction(null);
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to create adjustment transaction', 'error');
        } finally {
            setAdjustmentLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getAmountDisplay = (transaction) => {
        let amount = transaction.amount ?? 0;
        if (transaction.type === 'redemption' && transaction.redeemed !== undefined) {
            amount = -transaction.redeemed;
        }
        const absAmount = Math.abs(amount);
        const isPositive = amount > 0;
        return {
            value: isPositive ? `+${absAmount.toLocaleString()}` : `-${absAmount.toLocaleString()}`,
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
    const { t } = useTranslation(['transactions', 'common']);

    return (
        <Layout>
            <div className="all-transactions-page">
                <PageHeader
                    icon={<BarChart3 />}
                    title={t('transactions:allTransactions.title')}
                    subtitle={t('transactions:allTransactions.subtitle')}
                />

                <div className="filters-bar">
                    <div className="filters-row">
                        <div className="filter-group">
                            <label className="form-label">{t('transactions:allTransactions.filterType')}</label>
                            <select
                                value={type}
                                onChange={(e) => handleFilterChange('type', e.target.value)}
                                className="form-select"
                            >
                                <option value="">{t('transactions:allTransactions.allTypes')}</option>
                                <option value="purchase">{t('transactions:types.purchase')}</option>
                                <option value="redemption">{t('transactions:types.redemption')}</option>
                                <option value="transfer">{t('transactions:types.transfer')}</option>
                                <option value="adjustment">{t('transactions:types.adjustment')}</option>
                                <option value="event">{t('transactions:types.event')}</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="form-label">{t('transactions:allTransactions.userId')}</label>
                            <input
                                type="text"
                                value={userId}
                                onChange={(e) => handleFilterChange('userId', e.target.value)}
                                placeholder={t('transactions:allTransactions.userIdPlaceholder')}
                                className="form-input"
                            />
                        </div>

                        <div className="filter-group">
                            <label className="form-label">{t('transactions:allTransactions.relatedId')}</label>
                            <input
                                type="text"
                                value={relatedId}
                                onChange={(e) => handleFilterChange('relatedId', e.target.value)}
                                placeholder={t('transactions:allTransactions.relatedIdPlaceholder')}
                                className="form-input"
                            />
                        </div>

                        <div className="filter-group">
                            <label className="form-label">{t('transactions:allTransactions.suspicious')}</label>
                            <select
                                value={suspicious}
                                onChange={(e) => handleFilterChange('suspicious', e.target.value)}
                                className="form-select"
                            >
                                <option value="">{t('common:all')}</option>
                                <option value="true">{t('transactions:allTransactions.suspiciousOnly')}</option>
                                <option value="false">{t('transactions:allTransactions.notSuspicious')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="filters-row">
                        <div className="filter-group filter-amount">
                            <label className="form-label">{t('transactions:allTransactions.amount')}</label>
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
                                    placeholder={t('common:points')}
                                    className="form-input amount-input"
                                />
                            </div>
                        </div>

                        <div className="filter-group">
                            <label className="form-label">{t('transactions:allTransactions.promotionId')}</label>
                            <input
                                type="text"
                                value={promotionId}
                                onChange={(e) => handleFilterChange('promotionId', e.target.value)}
                                placeholder={t('transactions:allTransactions.promotionIdPlaceholder')}
                                className="form-input"
                            />
                        </div>

                        {hasActiveFilters && (
                            <button onClick={clearAllFilters} className="btn btn-ghost btn-danger btn-sm">
                                {t('transactions:allTransactions.clearAllFilters')}
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <LoadingSpinner text={t('transactions:allTransactions.loading')} />
                ) : error ? (
                    <ErrorMessage message={error} onRetry={fetchTransactions} />
                ) : transactions.length === 0 ? (
                    <EmptyState
                        icon={<ClipboardList size={48} strokeWidth={1.5} />}
                        title={t('transactions:allTransactions.noTransactions')}
                        description={hasActiveFilters ? t('transactions:allTransactions.noTransactionsFiltered') : t('transactions:allTransactions.noTransactionsYet')}
                        action={
                            hasActiveFilters && (
                                <button onClick={clearAllFilters} className="btn btn-secondary">
                                    {t('transactions:allTransactions.clearFilters')}
                                </button>
                            )
                        }
                    />
                ) : (
                    <>
                        <div className="transactions-summary">
                            {t('transactions:allTransactions.showingCount', { showing: transactions.length, total: totalCount.toLocaleString() })}
                        </div>

                        <div className="transactions-table-container">
                            <table className="transactions-table">
                                <thead>
                                    <tr>
                                        <th>{t('transactions:allTransactions.tableId')}</th>
                                        <th>{t('transactions:allTransactions.tableType')}</th>
                                        <th>{t('transactions:allTransactions.tableUser')}</th>
                                        <th>{t('transactions:allTransactions.tableAmount')}</th>
                                        <th>{t('transactions:allTransactions.tableDate')}</th>
                                        <th>{t('transactions:allTransactions.tableStatus')}</th>
                                        <th>{t('transactions:allTransactions.tableActions')}</th>
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
                                                                {transaction.processedAt ? t('transactions:allTransactions.processed') : t('transactions:allTransactions.pending')}
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
                                                            {t('transactions:allTransactions.view')}
                                                        </button>
                                                        <button
                                                            onClick={() => handleMarkSuspicious(transaction)}
                                                            className={`btn-action ${transaction.suspicious ? 'btn-unsuspicious' : 'btn-suspicious'}`}
                                                        >
                                                            {transaction.suspicious ? t('transactions:allTransactions.unmark') : t('transactions:allTransactions.flag')}
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
                    title={t('transactions:allTransactions.modal.title')}
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
                                    <span className="detail-id">{t('transactions:allTransactions.modal.transactionId', { id: selectedTransaction.id })}</span>
                                </div>
                            </div>

                            <div className="detail-grid">
                                <div className="detail-item">
                                    <label>{t('transactions:allTransactions.modal.amount')}</label>
                                    <span className={`detail-amount ${(() => {
                                        let amount = selectedTransaction.amount ?? 0;
                                        if (selectedTransaction.type === 'redemption' && selectedTransaction.redeemed !== undefined) {
                                            amount = -selectedTransaction.redeemed;
                                        }
                                        return amount > 0 ? 'amount-positive' : 'amount-negative';
                                    })()}`}>
                                        {(() => {
                                            let amount = selectedTransaction.amount ?? 0;
                                            if (selectedTransaction.type === 'redemption' && selectedTransaction.redeemed !== undefined) {
                                                amount = -selectedTransaction.redeemed;
                                            }
                                            return (amount > 0 ? '+' : '') + amount.toLocaleString() + ' ' + t('common:points');
                                        })()}
                                    </span>
                                </div>

                                <div className="detail-item">
                                    <label>{t('transactions:allTransactions.modal.user')}</label>
                                    <span>{selectedTransaction.utorid}</span>
                                </div>

                                <div className="detail-item">
                                    <label>{t('transactions:allTransactions.modal.created')}</label>
                                    <span>{formatDate(selectedTransaction.createdAt)}</span>
                                </div>

                                {selectedTransaction.processedAt && (
                                    <div className="detail-item">
                                        <label>{t('transactions:allTransactions.modal.processed')}</label>
                                        <span>{formatDate(selectedTransaction.processedAt)}</span>
                                    </div>
                                )}

                                {selectedTransaction.promotionIds && selectedTransaction.promotionIds.length > 0 && (
                                    <div className="detail-item">
                                        <label>{t('transactions:allTransactions.modal.promotionsApplied')}</label>
                                        <span>{selectedTransaction.promotionIds.join(', ')}</span>
                                    </div>
                                )}

                                {selectedTransaction.relatedId && (
                                    <div className="detail-item">
                                        <label>{t('transactions:allTransactions.modal.relatedId')}</label>
                                        <span>{selectedTransaction.relatedId}</span>
                                    </div>
                                )}

                                {selectedTransaction.remark && (
                                    <div className="detail-item full-width">
                                        <label>{t('transactions:allTransactions.modal.remark')}</label>
                                        <span className="remark-text">{selectedTransaction.remark}</span>
                                    </div>
                                )}

                                <div className="detail-item">
                                    <label>{t('transactions:allTransactions.modal.status')}</label>
                                    <div className="status-badges">
                                        {selectedTransaction.suspicious ? (
                                            <span className="badge badge-suspicious">⚠️ {t('transactions:allTransactions.modal.suspicious')}</span>
                                        ) : (
                                            <span className="badge badge-normal">✓ {t('transactions:allTransactions.modal.normal')}</span>
                                        )}
                                        {selectedTransaction.type === 'redemption' && (
                                            <span className={`badge ${selectedTransaction.processedAt ? 'badge-processed' : 'badge-pending'}`}>
                                                {selectedTransaction.processedAt ? t('transactions:allTransactions.processed') : t('transactions:allTransactions.pending')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {loadingUser ? (
                                <div className="user-info loading">{t('transactions:allTransactions.modal.loadingUserInfo')}</div>
                            ) : transactionUser && (
                                <div className="user-info">
                                    <h4>{t('transactions:allTransactions.modal.userInfo')}</h4>
                                    <div className="user-details">
                                        <span><strong>{t('transactions:allTransactions.modal.name')}:</strong> {transactionUser.name}</span>
                                        <span><strong>{t('transactions:allTransactions.modal.email')}:</strong> {transactionUser.email}</span>
                                        <span><strong>{t('transactions:allTransactions.modal.currentPoints')}:</strong> {transactionUser.points?.toLocaleString()}</span>
                                        <span><strong>{t('transactions:allTransactions.modal.role')}:</strong> {transactionUser.role}</span>
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button
                                    onClick={handleOpenAdjustment}
                                    className="btn btn-primary"
                                >
                                    <Settings size={16} />
                                    Create Adjustment
                                </button>
                                <button
                                    onClick={() => handleMarkSuspicious(selectedTransaction)}
                                    className={`btn ${selectedTransaction.suspicious ? 'btn-secondary' : 'btn-warning'}`}
                                >
                                    {selectedTransaction.suspicious ? t('transactions:allTransactions.modal.removeSuspiciousFlag') : t('transactions:allTransactions.modal.markAsSuspicious')}
                                </button>
                                <button onClick={() => setSelectedTransaction(null)} className="btn btn-secondary">
                                    {t('transactions:allTransactions.modal.close')}
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* Create Adjustment Modal */}
                <Modal
                    isOpen={showAdjustmentModal}
                    onClose={() => setShowAdjustmentModal(false)}
                    title="Create Adjustment Transaction"
                    size="small"
                >
                    {selectedTransaction && (
                        <div className="adjustment-modal">
                            <div className="transaction-summary">
                                <p><strong>Related Transaction:</strong> #{selectedTransaction.id}</p>
                                <p><strong>User:</strong> {selectedTransaction.utorid}</p>
                                <p><strong>Type:</strong> {TRANSACTION_TYPE_LABELS[selectedTransaction.type] || selectedTransaction.type}</p>
                            </div>

                            <div className="form-group">
                                <label htmlFor="adjustmentAmount" className="form-label">Adjustment Amount *</label>
                                <input
                                    type="number"
                                    id="adjustmentAmount"
                                    value={adjustmentAmount}
                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                    placeholder="Enter positive or negative amount"
                                    className="form-input"
                                    required
                                />
                                <span className="form-helper">
                                    Positive values add points, negative values subtract points
                                </span>
                            </div>

                            <div className="form-group">
                                <label htmlFor="adjustmentRemark" className="form-label">Remark (Optional)</label>
                                <input
                                    type="text"
                                    id="adjustmentRemark"
                                    value={adjustmentRemark}
                                    onChange={(e) => setAdjustmentRemark(e.target.value)}
                                    placeholder="Enter reason for adjustment"
                                    className="form-input"
                                    maxLength={200}
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    onClick={() => setShowAdjustmentModal(false)}
                                    className="btn btn-secondary"
                                    disabled={adjustmentLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateAdjustment}
                                    className="btn btn-primary"
                                    disabled={adjustmentLoading || !adjustmentAmount}
                                >
                                    {adjustmentLoading ? 'Creating...' : 'Create Adjustment'}
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
