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
    // Cache the import promise to avoid duplicate fetches
    let modulePromise = null;

    // Create a wrapper that caches the import
    const load = () => {
        if (!modulePromise) {
            modulePromise = importFn();
        }
        return modulePromise;
    };

    // Store the lazy component using the cached loader
    const LazyComponent = lazy(load);

    // Add preload method that triggers the import
    LazyComponent.preload = () => {
        if (import.meta.env.DEV) {
            console.log('[Preload] Prefetching module...');
        }
        load();
    };

    return LazyComponent;
}

export default lazyWithPreload;
