import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NavLink from './shared/NavLink';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, activeRole, switchRole, availableRoles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
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

  const getRoleDisplayName = (role) => {
    const names = {
      regular: 'Regular User',
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

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/dashboard" className="brand-link">
            <span className="brand-icon">🎁</span>
            Loyalty Program
          </Link>
        </div>

        <button
          className="navbar-toggle"
          onClick={() => setShowMenu(!showMenu)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar-menu ${showMenu ? 'active' : ''}`}>
          <div className="navbar-links">
            <NavLink
              to="/dashboard"
              className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
              onClick={() => setShowMenu(false)}
            >
              Dashboard
            </NavLink>

            {/* Regular User Links - Always visible */}
            <div className="nav-group">
              <NavLink
                to="/promotions"
                className={`nav-link ${isActive('/promotions') && !isActive('/promotions/manage') ? 'active' : ''}`}
                onClick={() => setShowMenu(false)}
              >
                Promotions
              </NavLink>
              <NavLink
                to="/events"
                className={`nav-link ${isActive('/events') && !isActive('/events/manage') ? 'active' : ''}`}
                onClick={() => setShowMenu(false)}
              >
                Events
              </NavLink>
              <NavLink
                to="/transactions"
                className={`nav-link ${isActive('/transactions') && !isActive('/transactions/all') ? 'active' : ''}`}
                onClick={() => setShowMenu(false)}
              >
                Transactions
              </NavLink>
            </div>

            {/* Cashier Links */}
            {hasActiveRole('cashier') && (
              <div className="nav-group cashier-links">
                <span className="nav-group-label">Cashier</span>
                <NavLink
                  to="/cashier/transaction"
                  className={`nav-link ${isActive('/cashier/transaction') ? 'active' : ''}`}
                  onClick={() => setShowMenu(false)}
                >
                  Create Transaction
                </NavLink>
                <NavLink
                  to="/cashier/redemption"
                  className={`nav-link ${isActive('/cashier/redemption') ? 'active' : ''}`}
                  onClick={() => setShowMenu(false)}
                >
                  Process Redemption
                </NavLink>
                <NavLink
                  to="/register"
                  className={`nav-link ${isActive('/register') ? 'active' : ''}`}
                  onClick={() => setShowMenu(false)}
                >
                  Register User
                </NavLink>
              </div>
            )}

            {/* Manager Links */}
            {hasActiveRole('manager') && (
              <div className="nav-group manager-links">
                <span className="nav-group-label">Manager</span>
                <NavLink
                  to="/users"
                  className={`nav-link ${isActive('/users') ? 'active' : ''}`}
                  onClick={() => setShowMenu(false)}
                >
                  Users
                </NavLink>
                <NavLink
                  to="/transactions/all"
                  className={`nav-link ${isActive('/transactions/all') ? 'active' : ''}`}
                  onClick={() => setShowMenu(false)}
                >
                  All Transactions
                </NavLink>
                <NavLink
                  to="/promotions/manage"
                  className={`nav-link ${isActive('/promotions/manage') ? 'active' : ''}`}
                  onClick={() => setShowMenu(false)}
                >
                  Manage Promotions
                </NavLink>
                <NavLink
                  to="/events/manage"
                  className={`nav-link ${isActive('/events/manage') ? 'active' : ''}`}
                  onClick={() => setShowMenu(false)}
                >
                  Manage Events
                </NavLink>
              </div>
            )}
          </div>

          <div className="navbar-user">
            {/* Role Switcher - Only show if user has multiple roles */}
            {availableRoles && availableRoles.length > 1 && (
              <div className="role-switcher" ref={roleMenuRef}>
                <button
                  className="role-switcher-button"
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  aria-label="Switch role"
                >
                  <span className="role-icon">🔄</span>
                  <span className="role-name">{getRoleDisplayName(activeRole)}</span>
                  <span className="dropdown-arrow">▼</span>
                </button>

                {showRoleMenu && (
                  <div className="role-menu-dropdown">
                    <div className="role-menu-header">Switch Role</div>
                    {availableRoles.map((role) => (
                      <button
                        key={role}
                        className={`role-menu-item ${activeRole === role ? 'active' : ''}`}
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
            <div className="user-menu-container" ref={userMenuRef}>
              <button
                className="user-menu-button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label="User menu"
              >
                <div className="user-avatar">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name || user.utorid} />
                  ) : (
                    <span>{user?.name?.charAt(0)?.toUpperCase() || user?.utorid?.charAt(0)?.toUpperCase() || 'U'}</span>
                  )}
                </div>
                <div className="user-info">
                  <span className="user-name">{user?.name || user?.utorid}</span>
                  <span className="user-points">{user?.points?.toLocaleString() || 0} pts</span>
                </div>
                <span className="dropdown-arrow">▼</span>
              </button>

              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    <div className="user-menu-avatar">
                      {user?.name?.charAt(0)?.toUpperCase() || user?.utorid?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="user-menu-info">
                      <span className="user-menu-name">{user?.name || user?.utorid}</span>
                      <span className="user-menu-email">{user?.email}</span>
                    </div>
                  </div>
                  <div className="user-menu-divider"></div>
                  <NavLink
                    to="/profile"
                    className="user-menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowMenu(false);
                    }}
                  >
                    <span className="menu-icon">👤</span>
                    View Profile
                  </NavLink>
                  <NavLink
                    to="/my-qr"
                    className="user-menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowMenu(false);
                    }}
                  >
                    <span className="menu-icon">📱</span>
                    My QR Code
                  </NavLink>
                  <NavLink
                    to="/transfer"
                    className="user-menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowMenu(false);
                    }}
                  >
                    <span className="menu-icon">💸</span>
                    Transfer Points
                  </NavLink>
                  <NavLink
                    to="/redeem"
                    className="user-menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowMenu(false);
                    }}
                  >
                    <span className="menu-icon">🎯</span>
                    Redeem Points
                  </NavLink>
                  <div className="user-menu-divider"></div>
                  <NavLink
                    to="/profile/edit"
                    className="user-menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowMenu(false);
                    }}
                  >
                    <span className="menu-icon">✏️</span>
                    Edit Profile
                  </NavLink>
                  <NavLink
                    to="/profile/password"
                    className="user-menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowMenu(false);
                    }}
                  >
                    <span className="menu-icon">🔒</span>
                    Change Password
                  </NavLink>
                  <div className="user-menu-divider"></div>
                  <button
                    className="user-menu-item logout-button"
                    onClick={() => {
                      handleLogout();
                      setShowUserMenu(false);
                      setShowMenu(false);
                    }}
                  >
                    <span className="menu-icon">🚪</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

