import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { LoadingSpinner, PageHeader } from '../components/shared';
import { usersAPI } from '../api';
import { getQuickActionsByRole } from '../config/quickActions';
import {
  Coins,
  ShieldCheck,
  User,
  BadgeCheck,
  Settings,
  Pencil,
  Lock,
  LayoutDashboard
} from 'lucide-react';
import './DashboardPage.css';

const DashboardPage = () => {
  const { t } = useTranslation(['dashboard', 'nav', 'common']);
  const { user, activeRole, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await usersAPI.getMe();
        updateUser(userData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [updateUser]);

  // Memoize quick actions based on role
  const quickActions = useMemo(
    () => getQuickActionsByRole(activeRole),
    [activeRole]
  );

  const getRoleDisplayName = (role) => {
    return t(`nav:roles.${role}`, { defaultValue: role });
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard-page">
        <PageHeader
          icon={<LayoutDashboard />}
          title={t('dashboard:welcome', { name: user?.name || user?.utorid })}
          subtitle={activeRole !== 'regular' ? t('dashboard:actingAs', { role: getRoleDisplayName(activeRole) }) : undefined}
        />

        <div className="dashboard-stats">
          <div className="stat-card points-card">
            <div className="stat-icon"><Coins size={28} /></div>
            <div className="stat-content">
              <h3>{t('dashboard:stats.currentPoints')}</h3>
              <p className="stat-value">{user?.points?.toLocaleString() || 0}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><ShieldCheck size={28} /></div>
            <div className="stat-content">
              <h3>{t('dashboard:stats.accountStatus')}</h3>
              <p className={`stat-value ${user?.verified ? 'verified' : 'pending'}`}>
                {user?.verified ? t('dashboard:stats.verified') : t('dashboard:stats.pendingVerification')}
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><User size={28} /></div>
            <div className="stat-content">
              <h3>{t('dashboard:stats.accountRole')}</h3>
              <p className="stat-value">{getRoleDisplayName(user?.role)}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><BadgeCheck size={28} /></div>
            <div className="stat-content">
              <h3>{t('dashboard:stats.utorid')}</h3>
              <p className="stat-value utorid">{user?.utorid}</p>
            </div>
          </div>
        </div>

        <div className="dashboard-quick-actions">
          <h2>{t('dashboard:quickActions.title')}</h2>
          <div className="quick-actions-grid">
            {quickActions.map(({ to, Icon, i18nKey }) => (
              <Link key={to} to={to} className="quick-action-card">
                <span className="action-icon"><Icon size={24} /></span>
                <span className="action-text">{t(i18nKey)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Profile Quick Link */}
        <div className="dashboard-profile-section">
          <h2>{t('dashboard:profile.title')}</h2>
          <div className="profile-actions">
            <Link to="/profile" className="profile-link">
              <span className="profile-icon"><Settings size={20} /></span>
              <span>{t('dashboard:profile.viewProfile')}</span>
            </Link>
            <Link to="/profile/edit" className="profile-link">
              <span className="profile-icon"><Pencil size={20} /></span>
              <span>{t('dashboard:profile.editProfile')}</span>
            </Link>
            <Link to="/profile/password" className="profile-link">
              <span className="profile-icon"><Lock size={20} /></span>
              <span>{t('dashboard:profile.changePassword')}</span>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;

