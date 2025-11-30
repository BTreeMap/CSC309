import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="dashboard-page">
        <div className="dashboard-header">
          <h1>Welcome, {user?.name || user?.utorid}!</h1>
          <p className="dashboard-subtitle">Your loyalty program dashboard</p>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>Current Points</h3>
              <p className="stat-value">{user?.points || 0}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✓</div>
            <div className="stat-content">
              <h3>Account Status</h3>
              <p className="stat-value">
                {user?.isVerified ? 'Verified' : 'Pending Verification'}
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👤</div>
            <div className="stat-content">
              <h3>Role</h3>
              <p className="stat-value">{user?.role || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="dashboard-quick-actions">
          <h2>Quick Actions</h2>
          <div className="quick-actions-grid">
            <a href="/my-points" className="quick-action-card">
              <span className="action-icon">💳</span>
              <span className="action-text">View Points</span>
            </a>
            <a href="/my-transactions" className="quick-action-card">
              <span className="action-icon">📋</span>
              <span className="action-text">My Transactions</span>
            </a>
            <a href="/promotions" className="quick-action-card">
              <span className="action-icon">🎁</span>
              <span className="action-text">Promotions</span>
            </a>
            <a href="/events" className="quick-action-card">
              <span className="action-icon">📅</span>
              <span className="action-text">Events</span>
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;

