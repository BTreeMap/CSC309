import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { LoadingSpinner, ErrorMessage } from '../components/shared';
import './ProfilePage.css';

const ProfilePage = () => {
    const { t, i18n } = useTranslation(['users', 'common']);
    const { user, loading } = useAuth();
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user && !loading) {
            setError(t('errors:generic'));
        }
    }, [user, loading, t]);

    if (loading) {
        return (
            <Layout>
                <LoadingSpinner />
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <ErrorMessage message={error} />
            </Layout>
        );
    }

    const formatDate = (dateString) => {
        if (!dateString) return t('common:noData');
        return new Date(dateString).toLocaleDateString(i18n.language, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getRoleDisplayName = (role) => {
        return t(`users:roles.${role}`, { defaultValue: role });
    };

    return (
        <Layout>
            <div className="profile-page">
                <div className="profile-header">
                    <div className="profile-avatar-large">
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name || user.utorid} />
                        ) : (
                            <span>{user?.name?.charAt(0)?.toUpperCase() || user?.utorid?.charAt(0)?.toUpperCase() || 'U'}</span>
                        )}
                    </div>
                    <div className="profile-header-info">
                        <h1>{user?.name || t('common:noData')}</h1>
                        <p className="profile-utorid">@{user?.utorid}</p>
                        <div className="profile-badges">
                            <span className={`badge badge-role badge-${user?.role}`}>
                                {getRoleDisplayName(user?.role)}
                            </span>
                            <span className={`badge ${user?.verified ? 'badge-verified' : 'badge-unverified'}`}>
                                {user?.verified ? t('users:profile.verified') : t('users:profile.notVerified')}
                            </span>
                        </div>
                    </div>
                    <Link to="/profile/edit" className="btn btn-primary">
                        {t('users:edit.title')}
                    </Link>
                </div>

                <div className="profile-content">
                    <div className="profile-section">
                        <h2>{t('users:profile.title')}</h2>
                        <div className="profile-info-grid">
                            <div className="profile-info-item">
                                <label>{t('users:profile.utorid')}</label>
                                <span>{user?.utorid}</span>
                            </div>
                            <div className="profile-info-item">
                                <label>{t('users:profile.email')}</label>
                                <span>{user?.email}</span>
                            </div>
                            <div className="profile-info-item">
                                <label>{t('users:profile.name')}</label>
                                <span>{user?.name || t('common:noData')}</span>
                            </div>
                            <div className="profile-info-item">
                                <label>{t('users:profile.birthday')}</label>
                                <span>{formatDate(user?.birthday)}</span>
                            </div>
                            <div className="profile-info-item">
                                <label>{t('users:profile.createdAt')}</label>
                                <span>{formatDate(user?.createdAt)}</span>
                            </div>
                            <div className="profile-info-item">
                                <label>{t('common:date')}</label>
                                <span>{formatDate(user?.lastLogin)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="profile-section">
                        <h2>{t('users:profile.points')}</h2>
                        <div className="points-summary-card">
                            <div className="points-display">
                                <span className="points-value">{user?.points?.toLocaleString(i18n.language) || 0}</span>
                                <span className="points-label">{t('common:points')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="profile-section">
                        <h2>{t('auth:changePassword.title')}</h2>
                        <div className="security-actions">
                            <Link to="/profile/password" className="security-action-button">
                                <span className="security-icon">🔒</span>
                                <div className="security-action-content">
                                    <span className="security-action-title">{t('auth:changePassword.title')}</span>
                                    <span className="security-action-description">{t('auth:changePassword.submit')}</span>
                                </div>
                                <span className="security-arrow">→</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ProfilePage;
