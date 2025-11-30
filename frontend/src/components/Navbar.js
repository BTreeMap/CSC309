import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isRegular = hasRole('regular');
  const isCashier = hasRole('cashier');
  const isManager = hasRole('manager');
  const isSuperuser = hasRole('superuser');

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/dashboard" className="brand-link">
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
            {isRegular && (
              <>
                <Link to="/dashboard" className="nav-link" onClick={() => setShowMenu(false)}>
                  Dashboard
                </Link>
                <Link to="/my-points" className="nav-link" onClick={() => setShowMenu(false)}>
                  My Points
                </Link>
                <Link to="/my-qr" className="nav-link" onClick={() => setShowMenu(false)}>
                  My QR Code
                </Link>
                <Link to="/transfer" className="nav-link" onClick={() => setShowMenu(false)}>
                  Transfer Points
                </Link>
                <Link to="/redemption" className="nav-link" onClick={() => setShowMenu(false)}>
                  Redeem Points
                </Link>
                <Link to="/promotions" className="nav-link" onClick={() => setShowMenu(false)}>
                  Promotions
                </Link>
                <Link to="/events" className="nav-link" onClick={() => setShowMenu(false)}>
                  Events
                </Link>
                <Link to="/my-transactions" className="nav-link" onClick={() => setShowMenu(false)}>
                  My Transactions
                </Link>
              </>
            )}

            {isCashier && (
              <>
                <Link to="/create-transaction" className="nav-link" onClick={() => setShowMenu(false)}>
                  Create Transaction
                </Link>
                <Link to="/process-redemption" className="nav-link" onClick={() => setShowMenu(false)}>
                  Process Redemption
                </Link>
              </>
            )}

            {isManager && (
              <>
                <Link to="/users" className="nav-link" onClick={() => setShowMenu(false)}>
                  Users
                </Link>
                <Link to="/all-transactions" className="nav-link" onClick={() => setShowMenu(false)}>
                  All Transactions
                </Link>
                <Link to="/promotions-manage" className="nav-link" onClick={() => setShowMenu(false)}>
                  Manage Promotions
                </Link>
                <Link to="/events-manage" className="nav-link" onClick={() => setShowMenu(false)}>
                  Manage Events
                </Link>
              </>
            )}

            {isSuperuser && (
              <Link to="/user-management" className="nav-link" onClick={() => setShowMenu(false)}>
                User Management
              </Link>
            )}
          </div>

          <div className="navbar-user">
            <div className="user-menu-container">
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
                <span className="user-name">{user?.name || user?.utorid}</span>
                <span className="user-role">{user?.role}</span>
                <span className="dropdown-arrow">▼</span>
              </button>

              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <Link
                    to="/profile"
                    className="user-menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowMenu(false);
                    }}
                  >
                    View Profile
                  </Link>
                  <Link
                    to="/profile/edit"
                    className="user-menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowMenu(false);
                    }}
                  >
                    Edit Profile
                  </Link>
                  <Link
                    to="/change-password"
                    className="user-menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowMenu(false);
                    }}
                  >
                    Change Password
                  </Link>
                  <div className="user-menu-divider"></div>
                  <button
                    className="user-menu-item logout-button"
                    onClick={() => {
                      handleLogout();
                      setShowUserMenu(false);
                      setShowMenu(false);
                    }}
                  >
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

