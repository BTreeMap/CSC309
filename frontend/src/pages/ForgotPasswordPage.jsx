import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './ForgotPasswordPage.css';

// Password complexity validation matching backend
const isValidPassword = (password) =>
  typeof password === 'string' &&
  password.length >= 8 &&
  password.length <= 20 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

// UTORid validation matching backend (7-8 alphanumeric)
const isValidUtorid = (utorid) =>
  typeof utorid === 'string' && /^[a-zA-Z0-9]{7,8}$/.test(utorid);

const ForgotPasswordPage = () => {
  const { t } = useTranslation(['auth', 'common', 'validation']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [utorid, setUtorid] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1);

  // Check for token in URL params (for new user activation links)
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    const utoridFromUrl = searchParams.get('utorid');
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setStep(2);
      if (utoridFromUrl) {
        setUtorid(utoridFromUrl);
      }
    }
  }, [searchParams]);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!isValidUtorid(utorid)) {
      setError(t('validation:utorid.format'));
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.requestPasswordReset(utorid);
      setResetToken(response.resetToken);
      setSuccess(t('auth:forgotPassword.tokenGenerated', { expiry: new Date(response.expiresAt).toLocaleString('en-US') }));
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || t('auth:forgotPassword.requestError'));
    }

    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!isValidUtorid(utorid)) {
      setError(t('validation:utorid.format'));
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('validation:password.mismatch'));
      setLoading(false);
      return;
    }

    if (!isValidPassword(newPassword)) {
      setError(t('validation:password.complexity'));
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
      setError(err.response?.data?.error || t('auth:forgotPassword.resetError'));
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
                maxLength={8}
              />
              <span className="form-helper">{t('validation:utorid.format')}</span>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? t('auth:forgotPassword.requesting') : t('auth:forgotPassword.requestButton')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="forgot-password-form">
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
                maxLength={8}
              />
            </div>

            <div className="form-group">
              <label htmlFor="resetToken" className="form-label">{t('auth:forgotPassword.tokenLabel')}</label>
              <input
                type="text"
                id="resetToken"
                className="form-input"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder={t('auth:forgotPassword.tokenPlaceholder')}
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
                placeholder={t('validation:password.placeholder')}
                required
              />
              <span className="form-helper">{t('validation:password.requirements')}</span>
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
              {loading ? t('auth:forgotPassword.resetting') : t('auth:forgotPassword.resetButton')}
            </button>
          </form>
        )}

        <div className="forgot-password-footer">
          <Link to="/login" className="back-to-login-link">
            {t('auth:forgotPassword.backToLogin')}
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

