import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { getMe } from '../api/auth';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user, activeRole, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await getMe();
        updateUser(userData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [updateUser]);

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  // Role-specific quick actions
  const getQuickActions = () => {
    const baseActions = [
      { to: '/my-qr', icon: '📱', text: 'My QR Code' },
      { to: '/transactions', icon: '📋', text: 'My Transactions' },
      { to: '/promotions', icon: '🎁', text: 'Promotions' },
      { to: '/events', icon: '📅', text: 'Events' },
      { to: '/transfer', icon: '💸', text: 'Transfer Points' },
      { to: '/redeem', icon: '🎯', text: 'Redeem Points' },
    ];

    const cashierActions = [
      { to: '/cashier/transaction', icon: '💳', text: 'Create Transaction' },
      { to: '/cashier/redemption', icon: '✅', text: 'Process Redemption' },
      { to: '/register', icon: '👤', text: 'Register User' },
    ];

    const managerActions = [
      { to: '/users', icon: '👥', text: 'Manage Users' },
      { to: '/transactions/all', icon: '📊', text: 'All Transactions' },
      { to: '/promotions/manage', icon: '🏷️', text: 'Manage Promotions' },
      { to: '/events/manage', icon: '🗓️', text: 'Manage Events' },
    ];

    if (activeRole === 'superuser' || activeRole === 'manager') {
      return [...baseActions, ...cashierActions, ...managerActions];
    } else if (activeRole === 'cashier') {
      return [...baseActions, ...cashierActions];
    }
    return baseActions;
  };

  const getRoleDisplayName = (role) => {
    const names = {
      regular: 'Regular User',
      cashier: 'Cashier',
      manager: 'Manager',
      superuser: 'Superuser'
    };
    return names[role] || role;
  };

  return (
    <Layout>
      <div className="dashboard-page">
        <div className="dashboard-header">
          <h1>Welcome, {user?.name || user?.utorid}!</h1>
          <p className="dashboard-subtitle">
            {activeRole !== 'regular' && (
              <span className="active-role-badge">
                Acting as: {getRoleDisplayName(activeRole)}
              </span>
            )}
          </p>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card points-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>Current Points</h3>
              <p className="stat-value">{user?.points?.toLocaleString() || 0}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✓</div>
            <div className="stat-content">
              <h3>Account Status</h3>
              <p className={`stat-value ${user?.verified ? 'verified' : 'pending'}`}>
                {user?.verified ? 'Verified' : 'Pending Verification'}
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👤</div>
            <div className="stat-content">
              <h3>Account Role</h3>
              <p className="stat-value">{getRoleDisplayName(user?.role)}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🆔</div>
            <div className="stat-content">
              <h3>UTORid</h3>
              <p className="stat-value utorid">{user?.utorid}</p>
            </div>
          </div>
        </div>

        <div className="dashboard-quick-actions">
          <h2>Quick Actions</h2>
          <div className="quick-actions-grid">
            {getQuickActions().map((action, index) => (
              <Link key={index} to={action.to} className="quick-action-card">
                <span className="action-icon">{action.icon}</span>
                <span className="action-text">{action.text}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Profile Quick Link */}
        <div className="dashboard-profile-section">
          <h2>Profile</h2>
          <div className="profile-actions">
            <Link to="/profile" className="profile-link">
              <span className="profile-icon">⚙️</span>
              <span>View Profile</span>
            </Link>
            <Link to="/profile/edit" className="profile-link">
              <span className="profile-icon">✏️</span>
              <span>Edit Profile</span>
            </Link>
            <Link to="/profile/password" className="profile-link">
              <span className="profile-icon">🔒</span>
              <span>Change Password</span>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;

