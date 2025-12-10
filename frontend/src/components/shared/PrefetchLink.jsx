import React from 'react';
import { Link } from 'react-router-dom';

/**
 * A Link component that prefetches the target route's component on hover/focus.
 * 
 * This reduces perceived navigation latency by loading the component bundle
 * before the user clicks, making the navigation feel instantaneous.
 * 
 * @param {Object} props - Component props
 * @param {string} props.to - The destination path
 * @param {Function} [props.preload] - The preload function from lazyWithPreload
 * @param {React.ReactNode} props.children - Link content
 * @param {string} [props.className] - CSS classes
 * @param {Object} [props.style] - Inline styles
 * 
 * @example
 * import { DashboardPage } from '../routes/pages';
 * 
 * <PrefetchLink to="/dashboard" preload={DashboardPage.preload}>
 *   Go to Dashboard
 * </PrefetchLink>
 */
export function PrefetchLink({
    to,
    preload,
    children,
    className,
    style,
    ...rest
}) {
    const handleInteraction = () => {
        if (typeof preload === 'function') {
            preload();
        }
    };

    return (
        <Link
            to={to}
            className={className}
            style={style}
            onMouseEnter={handleInteraction}
            onFocus={handleInteraction}
            {...rest}
        >
            {children}
        </Link>
    );
}

export default PrefetchLink;
