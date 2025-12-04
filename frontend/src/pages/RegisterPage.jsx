import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usersAPI } from '../api';
import Layout from '../components/Layout';
import { useToast } from '../components/shared/ToastContext';
import './RegisterPage.css';

const RegisterPage = () => {
    const { t } = useTranslation(['auth', 'validation', 'common', 'users']);
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        utorid: '',
        name: '',
        email: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError(null);
    };

    const validateUtorid = (utorid) => {
        // UTORid should be alphanumeric, 4-8 characters
        const regex = /^[a-zA-Z0-9]{4,8}$/;
        return regex.test(utorid);
    };

    const validateEmail = (email) => {
        // Should be a valid email format, preferably @mail.utoronto.ca or @utoronto.ca
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // Validation
        if (!validateUtorid(formData.utorid)) {
            setError(t('validation:utorid.format'));
            return;
        }

        if (!formData.name.trim()) {
            setError(t('validation:name.required'));
            return;
        }

        if (!validateEmail(formData.email)) {
            setError(t('validation:email.invalid'));
            return;
        }

        setLoading(true);

        try {
            const result = await usersAPI.createUser({
                utorid: formData.utorid.toLowerCase(),
                name: formData.name.trim(),
                email: formData.email.toLowerCase(),
            });

            setSuccess({
                resetToken: result.resetToken,
                user: result,
            });
            showToast(t('auth:register.success'), 'success');
        } catch (err) {
            setError(err.response?.data?.error || t('auth:register.error.generic'));
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterAnother = () => {
        setFormData({ utorid: '', name: '', email: '' });
        setSuccess(null);
        setError(null);
    };

    const copyResetLink = () => {
        const link = `${window.location.origin}/reset-password?token=${success.resetToken}`;
        navigator.clipboard.writeText(link);
        showToast(t('auth:register.linkCopied'), 'success');
    };

    if (success) {
        return (
            <Layout>
                <div className="register-page">
                    <div className="success-card">
                        <div className="success-icon">✓</div>
                        <h1>{t('auth:register.successTitle')}</h1>

                        <div className="user-details">
                            <div className="detail-item">
                                <span className="label">{t('users:fields.name')}</span>
                                <span className="value">{success.user.name}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">{t('users:fields.utorid')}</span>
                                <span className="value">{success.user.utorid}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">{t('users:fields.email')}</span>
                                <span className="value">{success.user.email}</span>
                            </div>
                        </div>

                        <div className="reset-token-section">
                            <h2>{t('auth:register.resetTokenTitle')}</h2>
                            <p className="instruction">
                                {t('auth:register.resetTokenInstruction')}
                            </p>
                            <div className="token-display">
                                <code>{success.resetToken}</code>
                            </div>
                            <button onClick={copyResetLink} className="btn btn-secondary btn-copy">
                                📋 {t('auth:register.copyResetLink')}
                            </button>
                            <p className="warning">
                                ⚠️ {t('auth:register.tokenWarning')}
                            </p>
                        </div>

                        <div className="action-buttons">
                            <button onClick={handleRegisterAnother} className="btn btn-primary">
                                {t('auth:register.registerAnother')}
                            </button>
                            <button onClick={() => navigate('/users')} className="btn btn-secondary">
                                {t('auth:register.backToUsers')}
                            </button>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="register-page">
                <div className="register-card">
                    <div className="card-header">
                        <h1>Register New User</h1>
                        <p>Create a new user account in the system</p>
                    </div>

                    <form onSubmit={handleSubmit} className="register-form">
                        {error && (
                            <div className="alert-error">{error}</div>
                        )}

                        <div className="form-group">
                            <label htmlFor="utorid" className="form-label">UTORid *</label>
                            <input
                                type="text"
                                id="utorid"
                                name="utorid"
                                className="form-input"
                                value={formData.utorid}
                                onChange={handleChange}
                                placeholder="e.g., johnd123"
                                required
                                maxLength={8}
                            />
                            <span className="form-helper">4-8 alphanumeric characters</span>
                        </div>

                        <div className="form-group">
                            <label htmlFor="name" className="form-label">Full Name *</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                className="form-input"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g., John Doe"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">Email Address *</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className="form-input"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="e.g., john.doe@mail.utoronto.ca"
                                required
                            />
                            <span className="form-helper">Preferably a UofT email address</span>
                        </div>

                        <div className="info-box">
                            <span className="info-icon">ℹ️</span>
                            <p>
                                After registration, the user will receive a password reset token to set their initial password.
                                Make sure to share this token with the user securely.
                            </p>
                        </div>

                        <div className="form-actions">
                            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Registering...' : 'Register User'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

export default RegisterPage;
