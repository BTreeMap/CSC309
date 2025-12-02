import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
    const { user, logout, activeRole, switchRole, availableRoles } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const userMenuRef = useRef(null);
    const roleMenuRef = useRef(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
            if (roleMenuRef.current && !roleMenuRef.current.contains(event.target)) {
                setShowRoleMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    // Close mobile menu on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setMobileOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const getRoleDisplayName = (role) => {
        const names = {
            regular: 'Regular',
            cashier: 'Cashier',
            manager: 'Manager',
            superuser: 'Superuser'
        };
        return names[role] || role;
    };

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    const handleRoleSwitch = (role) => {
        switchRole(role);
        setShowRoleMenu(false);
        navigate('/dashboard');
    };

    // Check if current active role meets minimum role requirement
    const hasActiveRole = (minRole) => {
        const roleHierarchy = { regular: 1, cashier: 2, manager: 3, superuser: 4 };
        return roleHierarchy[activeRole] >= roleHierarchy[minRole];
    };

    const NavLink = ({ to, icon, children, exact }) => {
        const active = exact ? location.pathname === to : isActive(to);
        return (
            <Link
                to={to}
                className={`sidebar-link ${active ? 'active' : ''}`}
                title={collapsed ? children : undefined}
            >
                <span className="sidebar-link-icon">{icon}</span>
                <span className="sidebar-link-text">{children}</span>
            </Link>
        );
    };

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                className="sidebar-mobile-toggle"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle navigation"
            >
                <span className={`hamburger ${mobileOpen ? 'open' : ''}`}>
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
                {/* Brand Header */}
                <div className="sidebar-header">
                    <Link to="/dashboard" className="sidebar-brand">
                        <span className="sidebar-brand-icon">🎁</span>
                        <span className="sidebar-brand-text">Loyalty</span>
                    </Link>
                    <button
                        className="sidebar-collapse-btn hide-mobile"
                        onClick={() => setCollapsed(!collapsed)}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? '→' : '←'}
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="sidebar-nav">
                    {/* Main Section */}
                    <div className="sidebar-section">
                        <div className="sidebar-section-title">Main</div>
                        <NavLink to="/dashboard" icon="📊" exact>Dashboard</NavLink>
                        <NavLink to="/promotions" icon="🏷️">Promotions</NavLink>
                        <NavLink to="/events" icon="📅">Events</NavLink>
                        <NavLink to="/transactions" icon="💳">Transactions</NavLink>
                    </div>

                    {/* Cashier Section */}
                    {hasActiveRole('cashier') && (
                        <div className="sidebar-section">
                            <div className="sidebar-section-title">Cashier</div>
                            <NavLink to="/cashier/transaction" icon="➕">Create Transaction</NavLink>
                            <NavLink to="/cashier/redemption" icon="✅">Process Redemption</NavLink>
                            <NavLink to="/register" icon="👤">Register User</NavLink>
                        </div>
                    )}

                    {/* Manager Section */}
                    {hasActiveRole('manager') && (
                        <div className="sidebar-section">
                            <div className="sidebar-section-title">Manager</div>
                            <NavLink to="/users" icon="👥">Users</NavLink>
                            <NavLink to="/transactions/all" icon="📋">All Transactions</NavLink>
                            <NavLink to="/promotions/manage" icon="🎯">Manage Promotions</NavLink>
                            <NavLink to="/events/manage" icon="🗓️">Manage Events</NavLink>
                        </div>
                    )}

                    {/* Personal Section */}
                    <div className="sidebar-section">
                        <div className="sidebar-section-title">Personal</div>
                        <NavLink to="/my-qr" icon="📱">My QR Code</NavLink>
                        <NavLink to="/transfer" icon="💸">Transfer Points</NavLink>
                        <NavLink to="/redeem" icon="🎁">Redeem Points</NavLink>
                    </div>
                </nav>

                {/* Sidebar Footer */}
                <div className="sidebar-footer">
                    {/* Role Switcher */}
                    {availableRoles && availableRoles.length > 1 && (
                        <div className="sidebar-role-switcher" ref={roleMenuRef}>
                            <button
                                className="sidebar-role-btn"
                                onClick={() => setShowRoleMenu(!showRoleMenu)}
                                title={collapsed ? `Role: ${getRoleDisplayName(activeRole)}` : undefined}
                            >
                                <span className="sidebar-role-icon">🔄</span>
                                <span className="sidebar-role-text">{getRoleDisplayName(activeRole)}</span>
                                <span className="sidebar-role-arrow">▼</span>
                            </button>

                            {showRoleMenu && (
                                <div className="sidebar-dropdown">
                                    <div className="sidebar-dropdown-header">Switch Role</div>
                                    {availableRoles.map((role) => (
                                        <button
                                            key={role}
                                            className={`sidebar-dropdown-item ${activeRole === role ? 'active' : ''}`}
                                            onClick={() => handleRoleSwitch(role)}
                                        >
                                            {getRoleDisplayName(role)}
                                            {activeRole === role && <span className="check-mark">✓</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* User Menu */}
                    <div className="sidebar-user" ref={userMenuRef}>
                        <button
                            className="sidebar-user-btn"
                            onClick={() => setShowUserMenu(!showUserMenu)}
                        >
                            <div className="sidebar-user-avatar">
                                {user?.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.name || user.utorid} />
                                ) : (
                                    <span>{user?.name?.charAt(0)?.toUpperCase() || user?.utorid?.charAt(0)?.toUpperCase() || 'U'}</span>
                                )}
                            </div>
                            <div className="sidebar-user-info">
                                <span className="sidebar-user-name">{user?.name || user?.utorid}</span>
                                <span className="sidebar-user-points">{user?.points?.toLocaleString() || 0} pts</span>
                            </div>
                            <span className="sidebar-user-arrow">▼</span>
                        </button>

                        {showUserMenu && (
                            <div className="sidebar-dropdown sidebar-dropdown-up">
                                <div className="sidebar-dropdown-header">
                                    <div className="sidebar-dropdown-user">
                                        <span className="sidebar-dropdown-name">{user?.name || user?.utorid}</span>
                                        <span className="sidebar-dropdown-email">{user?.email}</span>
                                    </div>
                                </div>
                                <div className="sidebar-dropdown-divider"></div>
                                <Link
                                    to="/profile"
                                    className="sidebar-dropdown-item"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    <span className="menu-icon">👤</span>
                                    View Profile
                                </Link>
                                <Link
                                    to="/profile/edit"
                                    className="sidebar-dropdown-item"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    <span className="menu-icon">✏️</span>
                                    Edit Profile
                                </Link>
                                <Link
                                    to="/profile/password"
                                    className="sidebar-dropdown-item"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    <span className="menu-icon">🔒</span>
                                    Change Password
                                </Link>
                                <div className="sidebar-dropdown-divider"></div>
                                <button
                                    className="sidebar-dropdown-item danger"
                                    onClick={() => {
                                        handleLogout();
                                        setShowUserMenu(false);
                                    }}
                                >
                                    <span className="menu-icon">🚪</span>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
