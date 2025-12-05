import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usersAPI } from '../api';
import Layout from '../components/Layout';
import { PageHeader } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import { Lock } from 'lucide-react';
import './ChangePasswordPage.css';

const ChangePasswordPage = () => {
    const { t } = useTranslation(['auth', 'validation', 'common']);
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validatePassword = (password) => {
        const errors = [];
        if (password.length < 8) errors.push(t('validation:password.minLength'));
        if (password.length > 20) errors.push(t('validation:password.maxLength'));
        if (!/[A-Z]/.test(password)) errors.push(t('validation:password.uppercase'));
        if (!/[a-z]/.test(password)) errors.push(t('validation:password.lowercase'));
        if (!/[0-9]/.test(password)) errors.push(t('validation:password.number'));
        if (!/[^A-Za-z0-9]/.test(password)) errors.push(t('validation:password.special'));
        return errors;
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.currentPassword) {
            newErrors.currentPassword = t('validation:password.currentRequired');
        }

        const passwordErrors = validatePassword(formData.newPassword);
        if (passwordErrors.length > 0) {
            newErrors.newPassword = `${t('validation:password.mustContain')}: ${passwordErrors.join(', ')}`;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = t('validation:password.mismatch');
        }

        if (formData.currentPassword === formData.newPassword) {
            newErrors.newPassword = t('validation:password.mustBeDifferent');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            await usersAPI.updatePassword(formData.currentPassword, formData.newPassword);
            showToast(t('auth:changePassword.success'), 'success');
            navigate('/profile');
        } catch (error) {
            const errorMessage = error.response?.data?.error || t('auth:changePassword.error');
            if (errorMessage.toLowerCase().includes('incorrect') || errorMessage.toLowerCase().includes('invalid')) {
                setErrors({ currentPassword: t('validation:password.currentIncorrect') });
            } else {
                showToast(errorMessage, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const getPasswordStrength = () => {
        const password = formData.newPassword;
        if (!password) return null;

        const errors = validatePassword(password);
        const strength = 6 - errors.length;

        if (strength <= 2) return { level: 'weak', label: t('validation:password.strength.weak'), color: '#f44336' };
        if (strength <= 4) return { level: 'medium', label: t('validation:password.strength.medium'), color: '#ff9800' };
        return { level: 'strong', label: t('validation:password.strength.strong'), color: '#4caf50' };
    };

    const passwordStrength = getPasswordStrength();

    return (
        <Layout>
            <div className="change-password-page">
                <PageHeader
                    icon={<Lock />}
                    title={t('auth:changePassword.title')}
                    subtitle={t('auth:changePassword.subtitle')}
                />

                <form onSubmit={handleSubmit} className="change-password-form">
                    <div className="form-group">
                        <label htmlFor="currentPassword" className="form-label">{t('auth:changePassword.currentPassword')}</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPasswords.current ? 'text' : 'password'}
                                id="currentPassword"
                                name="currentPassword"
                                className="form-input"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                placeholder={t('auth:changePassword.currentPasswordPlaceholder')}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="toggle-password-button"
                                onClick={() => togglePasswordVisibility('current')}
                                aria-label={showPasswords.current ? t('common:actions.hidePassword') : t('common:actions.showPassword')}
                            >
                                {showPasswords.current ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {errors.currentPassword && <span className="input-error">{errors.currentPassword}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="newPassword" className="form-label">{t('auth:changePassword.newPassword')}</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPasswords.new ? 'text' : 'password'}
                                id="newPassword"
                                name="newPassword"
                                className="form-input"
                                value={formData.newPassword}
                                onChange={handleChange}
                                placeholder={t('auth:changePassword.newPasswordPlaceholder')}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="toggle-password-button"
                                onClick={() => togglePasswordVisibility('new')}
                                aria-label={showPasswords.new ? t('common:actions.hidePassword') : t('common:actions.showPassword')}
                            >
                                {showPasswords.new ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {passwordStrength && (
                            <div className="password-strength">
                                <div className="strength-bar">
                                    <div
                                        className={`strength-fill strength-${passwordStrength.level}`}
                                        style={{ width: `${(6 - validatePassword(formData.newPassword).length) / 6 * 100}%` }}
                                    />
                                </div>
                                <span className="strength-label" style={{ color: passwordStrength.color }}>
                                    {passwordStrength.label}
                                </span>
                            </div>
                        )}
                        {errors.newPassword && <span className="input-error">{errors.newPassword}</span>}
                        <div className="password-requirements">
                            <p>{t('validation:password.mustContain')}:</p>
                            <ul>
                                <li className={formData.newPassword.length >= 8 && formData.newPassword.length <= 20 ? 'met' : ''}>
                                    {t('validation:password.lengthRange')}
                                </li>
                                <li className={/[A-Z]/.test(formData.newPassword) ? 'met' : ''}>
                                    {t('validation:password.uppercase')}
                                </li>
                                <li className={/[a-z]/.test(formData.newPassword) ? 'met' : ''}>
                                    {t('validation:password.lowercase')}
                                </li>
                                <li className={/[0-9]/.test(formData.newPassword) ? 'met' : ''}>
                                    {t('validation:password.number')}
                                </li>
                                <li className={/[^A-Za-z0-9]/.test(formData.newPassword) ? 'met' : ''}>
                                    {t('validation:password.special')}
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">{t('auth:changePassword.confirmPassword')}</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                id="confirmPassword"
                                name="confirmPassword"
                                className="form-input"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder={t('auth:changePassword.confirmPasswordPlaceholder')}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="toggle-password-button"
                                onClick={() => togglePasswordVisibility('confirm')}
                                aria-label={showPasswords.confirm ? t('common:actions.hidePassword') : t('common:actions.showPassword')}
                            >
                                {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {errors.confirmPassword && <span className="input-error">{errors.confirmPassword}</span>}
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate('/profile')}
                            disabled={loading}
                        >
                            {t('common:actions.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? t('auth:changePassword.changing') : t('auth:changePassword.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default ChangePasswordPage;
