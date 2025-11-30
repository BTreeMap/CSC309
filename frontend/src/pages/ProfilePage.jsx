import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { LoadingSpinner, ErrorMessage } from '../components/shared';
import './ProfilePage.css';

const ProfilePage = () => {
    const { user, loading } = useAuth();
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user && !loading) {
            setError('Unable to load profile data');
        }
    }, [user, loading]);

    if (loading) {
        return (
            <Layout>
                <LoadingSpinner text="Loading profile..." />
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
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
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
                        <h1>{user?.name || 'No name set'}</h1>
                        <p className="profile-utorid">@{user?.utorid}</p>
                        <div className="profile-badges">
                            <span className={`badge badge-role badge-${user?.role}`}>
                                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                            </span>
                            <span className={`badge ${user?.isVerified ? 'badge-verified' : 'badge-unverified'}`}>
                                {user?.isVerified ? '✓ Verified' : 'Not Verified'}
                            </span>
                        </div>
                    </div>
                    <Link to="/profile/edit" className="edit-profile-button">
                        Edit Profile
                    </Link>
                </div>

                <div className="profile-content">
                    <div className="profile-section">
                        <h2>Account Information</h2>
                        <div className="profile-info-grid">
                            <div className="profile-info-item">
                                <label>UTORid</label>
                                <span>{user?.utorid}</span>
                            </div>
                            <div className="profile-info-item">
                                <label>Email</label>
                                <span>{user?.email}</span>
                            </div>
                            <div className="profile-info-item">
                                <label>Full Name</label>
                                <span>{user?.name || 'Not set'}</span>
                            </div>
                            <div className="profile-info-item">
                                <label>Birthday</label>
                                <span>{formatDate(user?.birthday)}</span>
                            </div>
                            <div className="profile-info-item">
                                <label>Member Since</label>
                                <span>{formatDate(user?.createdAt)}</span>
                            </div>
                            <div className="profile-info-item">
                                <label>Last Login</label>
                                <span>{formatDate(user?.lastLogin)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="profile-section">
                        <h2>Points Summary</h2>
                        <div className="points-summary-card">
                            <div className="points-display">
                                <span className="points-value">{user?.points?.toLocaleString() || 0}</span>
                                <span className="points-label">Available Points</span>
                            </div>
                        </div>
                    </div>

                    <div className="profile-section">
                        <h2>Security</h2>
                        <div className="security-actions">
                            <Link to="/change-password" className="security-action-button">
                                <span className="security-icon">🔒</span>
                                <div className="security-action-content">
                                    <span className="security-action-title">Change Password</span>
                                    <span className="security-action-description">Update your account password</span>
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
