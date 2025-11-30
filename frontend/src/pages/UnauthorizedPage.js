import React from 'react';
import { Link } from 'react-router-dom';
import './UnauthorizedPage.css';

const UnauthorizedPage = () => {
  return (
    <div className="unauthorized-page">
      <div className="unauthorized-container">
        <div className="unauthorized-content">
          <h1>403</h1>
          <h2>Access Denied</h2>
          <p>You do not have permission to access this page. Please ensure you are logged in and have the required permissions.</p>
          <div className="unauthorized-actions">
            <Link to="/dashboard" className="back-button">
              Back to Dashboard
            </Link>
            <Link to="/login" className="login-button">
              Login Again
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;

