import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Custom hook for paginated data fetching with URL-based filter state.
 * 
 * @param {Function} fetchFn - Async function that fetches data. Receives params object.
 * @param {Object} options - Configuration options
 * @param {number} [options.limit=10] - Items per page
 * @param {string[]} [options.filterKeys=[]] - URL param keys to extract as filters
 * @param {Object} [options.filterTransforms={}] - Transform functions for filter values
 * @returns {Object} Paginated data state and handlers
 */
export function usePaginatedData(fetchFn, options = {}) {
    const { limit = 10, filterKeys = [], filterTransforms = {} } = options;

    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);

    // Parse page from URL
    const page = parseInt(searchParams.get('page') || '1', 10);

    // Extract filters from URL params
    const filters = filterKeys.reduce((acc, key) => {
        const value = searchParams.get(key);
        if (value) {
            // Apply transform if defined, otherwise use raw value
            const transform = filterTransforms[key];
            acc[key] = transform ? transform(value) : value;
        }
        return acc;
    }, {});

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = { page, limit, ...filters };
            const result = await fetchFn(params);
            setData(result.results || []);
            setTotalCount(result.count || 0);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [fetchFn, page, limit, JSON.stringify(filters)]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePageChange = useCallback((newPage) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        setSearchParams(params);
    }, [searchParams, setSearchParams]);

    const handleFilterChange = useCallback((key, value) => {
        const params = new URLSearchParams(searchParams);
        if (value !== '' && value !== null && value !== undefined) {
            params.set(key, String(value));
        } else {
            params.delete(key);
        }
        params.set('page', '1'); // Reset to first page on filter change
        setSearchParams(params);
    }, [searchParams, setSearchParams]);

    const clearFilters = useCallback(() => {
        setSearchParams({ page: '1' });
    }, [setSearchParams]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
        // Data state
        data,
        loading,
        error,
        totalCount,
        totalPages,

        // Pagination
        page,
        limit,

        // Filters
        filters,
        searchParams,

        // Handlers
        handlePageChange,
        handleFilterChange,
        clearFilters,
        refetch: fetchData,
    };
}

export default usePaginatedData;
