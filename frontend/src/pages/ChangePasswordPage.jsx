import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../api';
import Layout from '../components/Layout';
import { useToast } from '../components/shared';
import './ChangePasswordPage.css';

const ChangePasswordPage = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

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
        if (password.length < 8) errors.push('At least 8 characters');
        if (password.length > 20) errors.push('At most 20 characters');
        if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
        if (!/[0-9]/.test(password)) errors.push('One number');
        if (!/[^A-Za-z0-9]/.test(password)) errors.push('One special character');
        return errors;
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.currentPassword) {
            newErrors.currentPassword = 'Current password is required';
        }

        const passwordErrors = validatePassword(formData.newPassword);
        if (passwordErrors.length > 0) {
            newErrors.newPassword = `Password must contain: ${passwordErrors.join(', ')}`;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (formData.currentPassword === formData.newPassword) {
            newErrors.newPassword = 'New password must be different from current password';
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
            showSuccess('Password changed successfully');
            navigate('/profile');
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Failed to change password';
            if (errorMessage.toLowerCase().includes('incorrect') || errorMessage.toLowerCase().includes('invalid')) {
                setErrors({ currentPassword: 'Current password is incorrect' });
            } else {
                showError(errorMessage);
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

        if (strength <= 2) return { level: 'weak', label: 'Weak', color: '#f44336' };
        if (strength <= 4) return { level: 'medium', label: 'Medium', color: '#ff9800' };
        return { level: 'strong', label: 'Strong', color: '#4caf50' };
    };

    const passwordStrength = getPasswordStrength();

    return (
        <Layout>
            <div className="change-password-page">
                <div className="change-password-header">
                    <h1>Change Password</h1>
                    <p>Keep your account secure by using a strong password</p>
                </div>

                <form onSubmit={handleSubmit} className="change-password-form">
                    <div className="form-group">
                        <label htmlFor="currentPassword">Current Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPasswords.current ? 'text' : 'password'}
                                id="currentPassword"
                                name="currentPassword"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                placeholder="Enter your current password"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="toggle-password-button"
                                onClick={() => togglePasswordVisibility('current')}
                                aria-label={showPasswords.current ? 'Hide password' : 'Show password'}
                            >
                                {showPasswords.current ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {errors.currentPassword && <span className="input-error">{errors.currentPassword}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="newPassword">New Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPasswords.new ? 'text' : 'password'}
                                id="newPassword"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                placeholder="Enter your new password"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="toggle-password-button"
                                onClick={() => togglePasswordVisibility('new')}
                                aria-label={showPasswords.new ? 'Hide password' : 'Show password'}
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
                            <p>Password must contain:</p>
                            <ul>
                                <li className={formData.newPassword.length >= 8 && formData.newPassword.length <= 20 ? 'met' : ''}>
                                    8-20 characters
                                </li>
                                <li className={/[A-Z]/.test(formData.newPassword) ? 'met' : ''}>
                                    One uppercase letter
                                </li>
                                <li className={/[a-z]/.test(formData.newPassword) ? 'met' : ''}>
                                    One lowercase letter
                                </li>
                                <li className={/[0-9]/.test(formData.newPassword) ? 'met' : ''}>
                                    One number
                                </li>
                                <li className={/[^A-Za-z0-9]/.test(formData.newPassword) ? 'met' : ''}>
                                    One special character
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Re-enter your new password"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="toggle-password-button"
                                onClick={() => togglePasswordVisibility('confirm')}
                                aria-label={showPasswords.confirm ? 'Hide password' : 'Show password'}
                            >
                                {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {errors.confirmPassword && <span className="input-error">{errors.confirmPassword}</span>}
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="cancel-button"
                            onClick={() => navigate('/profile')}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="save-button"
                            disabled={loading}
                        >
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default ChangePasswordPage;
