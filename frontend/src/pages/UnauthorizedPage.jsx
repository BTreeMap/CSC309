import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './UnauthorizedPage.css';

const UnauthorizedPage = () => {
  const { t } = useTranslation(['errors', 'common']);

  return (
    <div className="unauthorized-page">
      <div className="unauthorized-container">
        <div className="unauthorized-content">
          <h1>403</h1>
          <h2>{t('errors:unauthorizedPage.title')}</h2>
          <p>{t('errors:unauthorizedPage.message')}</p>
          <div className="unauthorized-actions">
            <Link to="/dashboard" className="btn btn-primary">
              {t('errors:unauthorizedPage.backHome')}
            </Link>
            <Link to="/login" className="btn btn-secondary">
              {t('auth:login.submit')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;

