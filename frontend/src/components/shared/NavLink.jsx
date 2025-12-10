import React from 'react';
import { Link } from 'react-router-dom';
import { routePreloads } from '../../routes/config';

/**
 * Navigation Link component with automatic hover-based prefetching.
 * 
 * Automatically looks up the preload function for the target route
 * and triggers it on hover/focus to prefetch the component bundle.
 * 
 * @param {Object} props - Component props
 * @param {string} props.to - The destination path
 * @param {React.ReactNode} props.children - Link content
 * @param {string} [props.className] - CSS classes
 * @param {Function} [props.onClick] - Click handler
 * 
 * @example
 * <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
 */
export function NavLink({
    to,
    children,
    className,
    onClick,
    ...rest
}) {
    const handleMouseEnter = () => {
        // Find matching preload function
        // Handle exact paths first
        const preloadFn = routePreloads[to];
        if (typeof preloadFn === 'function') {
            if (import.meta.env.DEV) {
                console.log(`[NavLink] Preloading route: ${to}`);
            }
            preloadFn();
            return;
        }

        // Handle parameterized routes by finding the pattern
        // e.g., /events/123 should preload EventDetailPage (pattern: /events/:id)
        for (const [pattern, preload] of Object.entries(routePreloads)) {
            if (pattern.includes(':') && typeof preload === 'function') {
                // Convert route pattern to regex
                const regexPattern = pattern.replace(/:[^/]+/g, '[^/]+');
                const regex = new RegExp(`^${regexPattern}$`);
                if (regex.test(to)) {
                    if (import.meta.env.DEV) {
                        console.log(`[NavLink] Preloading pattern route: ${pattern} for ${to}`);
                    }
                    preload();
                    return;
                }
            }
        }

        if (import.meta.env.DEV) {
            console.warn(`[NavLink] No preload function found for route: ${to}`);
        }
    };

    return (
        <Link
            to={to}
            className={className}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onFocus={handleMouseEnter}
            {...rest}
        >
            {children}
        </Link>
    );
}

export default NavLink;
