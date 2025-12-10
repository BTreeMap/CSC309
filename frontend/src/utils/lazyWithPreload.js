import { lazy } from 'react';

/**
 * Creates a lazy-loaded component with a preload method.
 * 
 * This wraps React.lazy to return a component that exposes a `.preload()` method,
 * enabling prefetching of the module before the user navigates to the route.
 * 
 * @param {Function} importFn - A function that returns a dynamic import promise
 * @returns {React.LazyExoticComponent} A lazy component with a preload method
 * 
 * @example
 * const DashboardPage = lazyWithPreload(() => import('../pages/DashboardPage'));
 * 
 * // Preload on hover
 * <Link onMouseEnter={() => DashboardPage.preload()} to="/dashboard">Dashboard</Link>
 */
export function lazyWithPreload(importFn) {
    // Store the lazy component
    const LazyComponent = lazy(importFn);

    // Add preload method that triggers the import
    LazyComponent.preload = () => {
        importFn();
    };

    return LazyComponent;
}

export default lazyWithPreload;
