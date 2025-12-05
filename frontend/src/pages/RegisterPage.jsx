import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usersAPI } from '../api';
import Layout from '../components/Layout';
import { PageHeader } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import { UserPlus } from 'lucide-react';
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
        // UTORid should be alphanumeric, 7-8 characters (matching backend)
        const regex = /^[a-zA-Z0-9]{7,8}$/;
        return regex.test(utorid);
    };

    const validateEmail = (email) => {
        // Must be a valid UofT email (matching backend)
        if (typeof email !== 'string') return false;
        return email.endsWith('@mail.utoronto.ca') || email.endsWith('@utoronto.ca');
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
        const link = `${window.location.origin}/forgot-password?token=${success.resetToken}&utorid=${success.user.utorid}`;
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
                <PageHeader
                    icon={<UserPlus />}
                    title={t('auth:register.title')}
                    subtitle={t('auth:register.subtitle')}
                />

                <div className="register-card">
                    <form onSubmit={handleSubmit} className="register-form">
                        {error && (
                            <div className="alert-error">{error}</div>
                        )}

                        <div className="form-group">
                            <label htmlFor="utorid" className="form-label">{t('auth:register.utoridLabel')} *</label>
                            <input
                                type="text"
                                id="utorid"
                                name="utorid"
                                className="form-input"
                                value={formData.utorid}
                                onChange={handleChange}
                                placeholder={t('auth:register.utoridPlaceholder')}
                                required
                                maxLength={8}
                            />
                            <span className="form-helper">{t('validation:utorid.format')}</span>
                        </div>

                        <div className="form-group">
                            <label htmlFor="name" className="form-label">{t('auth:register.nameLabel')} *</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                className="form-input"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder={t('auth:register.namePlaceholder')}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">{t('auth:register.emailLabel')} *</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className="form-input"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder={t('auth:register.emailPlaceholder')}
                                required
                            />
                            <span className="form-helper">{t('validation:email.hint')}</span>
                        </div>

                        <div className="form-actions">
                            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
                                {t('common:cancel')}
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? t('auth:register.submitting') : t('auth:register.submit')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

export default RegisterPage;
