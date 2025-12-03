import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './LoginPage.css';

const LoginPage = () => {
  const { t } = useTranslation(['auth', 'common']);
  const [utorid, setUtorid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!utorid || !password) {
      setError(t('auth:login.error.missingCredentials'));
      setLoading(false);
      return;
    }

    const result = await login(utorid, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || t('auth:login.error.invalidCredentials'));
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-language-switcher">
        <LanguageSwitcher />
      </div>
      <div className="login-container">
        <div className="login-header">
          <h1>{t('auth:login.title')}</h1>
          <p>{t('auth:login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="utorid" className="form-label">{t('auth:login.utoridLabel')}</label>
            <input
              type="text"
              id="utorid"
              className="form-input"
              value={utorid}
              onChange={(e) => setUtorid(e.target.value)}
              placeholder={t('auth:login.utoridPlaceholder')}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">{t('auth:login.passwordLabel')}</label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth:login.passwordPlaceholder')}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block login-button"
            disabled={loading}
          >
            {loading ? t('auth:login.submitting') : t('auth:login.submit')}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/forgot-password" className="forgot-password-link">
            {t('auth:login.forgotPassword')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

