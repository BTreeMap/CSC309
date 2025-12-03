import React from 'react';
import { useTranslation } from 'react-i18next';
import './Pagination.css';

const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    totalItems = null,
    itemsPerPage = null,
    showInfo = true
}) => {
    const { t } = useTranslation('common');

    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();
    const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="pagination-container">
            {showInfo && totalItems !== null && itemsPerPage !== null && (
                <div className="pagination-info">
                    {t('pagination.showingItems', { start: startItem, end: endItem, total: totalItems })}
                </div>
            )}

            <div className="pagination-controls">
                <button
                    className="pagination-button"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    aria-label={t('pagination.first')}
                >
                    ««
                </button>

                <button
                    className="pagination-button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label={t('previous')}
                >
                    «
                </button>

                {pageNumbers[0] > 1 && (
                    <>
                        <button
                            className="pagination-button"
                            onClick={() => onPageChange(1)}
                        >
                            1
                        </button>
                        {pageNumbers[0] > 2 && <span className="pagination-ellipsis">...</span>}
                    </>
                )}

                {pageNumbers.map(page => (
                    <button
                        key={page}
                        className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                        onClick={() => onPageChange(page)}
                        aria-current={currentPage === page ? 'page' : undefined}
                    >
                        {page}
                    </button>
                ))}

                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                    <>
                        {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                            <span className="pagination-ellipsis">...</span>
                        )}
                        <button
                            className="pagination-button"
                            onClick={() => onPageChange(totalPages)}
                        >
                            {totalPages}
                        </button>
                    </>
                )}

                <button
                    className="pagination-button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label={t('next')}
                >
                    »
                </button>

                <button
                    className="pagination-button"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    aria-label={t('pagination.last')}
                >
                    »»
                </button>
            </div>
        </div>
    );
};

export default Pagination;
