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
    let isPreloaded = false;

    // Create a wrapper that caches the import
    const load = () => {
        if (!modulePromise) {
            if (import.meta.env.DEV) {
                console.log('[Preload] Starting dynamic import...');
            }
            modulePromise = importFn();
            // Log when the import completes
            modulePromise.then(
                (module) => {
                    if (import.meta.env.DEV) {
                        console.log('[Preload] Module loaded successfully:', module);
                    }
                },
                (error) => {
                    if (import.meta.env.DEV) {
                        console.error('[Preload] Module failed to load:', error);
                    }
                }
            );
        }
        return modulePromise;
    };

    // Store the lazy component using the cached loader
    const LazyComponent = lazy(load);

    // Add preload method that triggers the import
    LazyComponent.preload = () => {
        if (isPreloaded) {
            if (import.meta.env.DEV) {
                console.log('[Preload] Module already preloaded, skipping');
            }
            return modulePromise;
        }
        isPreloaded = true;
        if (import.meta.env.DEV) {
            console.log('[Preload] Calling preload(), importFn type:', typeof importFn);
        }
        return load();
    };

    return LazyComponent;
}

export default lazyWithPreload;
