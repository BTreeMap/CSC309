import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './ForgotPasswordPage.css';

const ForgotPasswordPage = () => {
  const { t } = useTranslation(['auth', 'common', 'validation']);
  const navigate = useNavigate();
  const [utorid, setUtorid] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await authAPI.requestPasswordReset(utorid);
      setResetToken(response.resetToken);
      setSuccess(t('auth:forgotPassword.success', { expiresAt: new Date(response.expiresAt).toLocaleString() }));
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || t('auth:forgotPassword.error.generic'));
    }

    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError(t('auth:forgotPassword.error.mismatch'));
      setLoading(false);
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 20) {
      setError(t('auth:forgotPassword.error.length'));
      setLoading(false);
      return;
    }

    try {
      await authAPI.resetPassword(resetToken, utorid, newPassword);
      setSuccess(t('auth:forgotPassword.resetSuccess'));
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || t('auth:forgotPassword.error.resetFailed'));
    }

    setLoading(false);
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-header">
          <h1>{t('auth:forgotPassword.title')}</h1>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestReset} className="forgot-password-form">
            {error && <div className="alert-error">{error}</div>}
            {success && <div className="alert-success">{success}</div>}

            <div className="form-group">
              <label htmlFor="utorid" className="form-label">{t('auth:forgotPassword.utoridLabel')}</label>
              <input
                type="text"
                id="utorid"
                className="form-input"
                value={utorid}
                onChange={(e) => setUtorid(e.target.value)}
                placeholder={t('auth:forgotPassword.utoridPlaceholder')}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? t('auth:forgotPassword.submitting') : t('auth:forgotPassword.submit')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="forgot-password-form">
            {error && <div className="alert-error">{error}</div>}
            {success && <div className="alert-success">{success}</div>}

            <div className="form-group">
              <label htmlFor="resetToken" className="form-label">{t('auth:forgotPassword.resetTokenLabel')}</label>
              <input
                type="text"
                id="resetToken"
                className="form-input"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder={t('auth:forgotPassword.resetTokenPlaceholder')}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">{t('auth:forgotPassword.newPasswordLabel')}</label>
              <input
                type="password"
                id="newPassword"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('auth:forgotPassword.newPasswordPlaceholder')}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">{t('auth:forgotPassword.confirmPasswordLabel')}</label>
              <input
                type="password"
                id="confirmPassword"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth:forgotPassword.confirmPasswordPlaceholder')}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? t('auth:forgotPassword.resetting') : t('auth:forgotPassword.resetSubmit')}
            </button>
          </form>
        )}

        <div className="forgot-password-footer">
          <Link to="/login" className="back-to-login-link">
            {t('auth:forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

