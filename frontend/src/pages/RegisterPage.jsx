import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../../api';
import Layout from '../../components/Layout';
import { useToast } from '../../components/shared/ToastContext';
import './RegisterPage.css';

const RegisterPage = () => {
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
            setError('UTORid must be 4-8 alphanumeric characters');
            return;
        }

        if (!formData.name.trim()) {
            setError('Name is required');
            return;
        }

        if (!validateEmail(formData.email)) {
            setError('Please enter a valid email address');
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
            showToast('User registered successfully!', 'success');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to register user');
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
        showToast('Reset link copied to clipboard!', 'success');
    };

    if (success) {
        return (
            <Layout>
                <div className="register-page">
                    <div className="success-card">
                        <div className="success-icon">✓</div>
                        <h1>User Registered Successfully!</h1>

                        <div className="user-details">
                            <div className="detail-item">
                                <span className="label">Name</span>
                                <span className="value">{success.user.name}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">UTORid</span>
                                <span className="value">{success.user.utorid}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Email</span>
                                <span className="value">{success.user.email}</span>
                            </div>
                        </div>

                        <div className="reset-token-section">
                            <h2>Password Reset Token</h2>
                            <p className="instruction">
                                Share this reset link with the user so they can set their password and activate their account:
                            </p>
                            <div className="token-display">
                                <code>{success.resetToken}</code>
                            </div>
                            <button onClick={copyResetLink} className="btn-copy">
                                📋 Copy Reset Link
                            </button>
                            <p className="warning">
                                ⚠️ This token will only be shown once. Make sure to share it with the user.
                            </p>
                        </div>

                        <div className="action-buttons">
                            <button onClick={handleRegisterAnother} className="btn-primary">
                                Register Another User
                            </button>
                            <button onClick={() => navigate('/users')} className="btn-secondary">
                                Back to Users List
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
                            <div className="error-message">{error}</div>
                        )}

                        <div className="form-group">
                            <label htmlFor="utorid">UTORid *</label>
                            <input
                                type="text"
                                id="utorid"
                                name="utorid"
                                value={formData.utorid}
                                onChange={handleChange}
                                placeholder="e.g., johnd123"
                                required
                                maxLength={8}
                            />
                            <span className="input-hint">4-8 alphanumeric characters</span>
                        </div>

                        <div className="form-group">
                            <label htmlFor="name">Full Name *</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g., John Doe"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email Address *</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="e.g., john.doe@mail.utoronto.ca"
                                required
                            />
                            <span className="input-hint">Preferably a UofT email address</span>
                        </div>

                        <div className="info-box">
                            <span className="info-icon">ℹ️</span>
                            <p>
                                After registration, the user will receive a password reset token to set their initial password.
                                Make sure to share this token with the user securely.
                            </p>
                        </div>

                        <div className="form-actions">
                            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary" disabled={loading}>
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
