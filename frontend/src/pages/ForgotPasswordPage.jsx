import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api';
import './ForgotPasswordPage.css';

const ForgotPasswordPage = () => {
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
      setSuccess(`Password reset token generated. Valid until ${new Date(response.expiresAt).toLocaleString()}`);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request password reset');
    }
    
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 20) {
      setError('Password must be between 8-20 characters');
      setLoading(false);
      return;
    }

    try {
      await authAPI.resetPassword(resetToken, utorid, newPassword);
      setSuccess('Password reset successful! Please login with your new password.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    }
    
    setLoading(false);
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-header">
          <h1>Reset Password</h1>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestReset} className="forgot-password-form">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-group">
              <label htmlFor="utorid">UTORid</label>
              <input
                type="text"
                id="utorid"
                value={utorid}
                onChange={(e) => setUtorid(e.target.value)}
                placeholder="Enter your UTORid"
                required
              />
            </div>

            <button 
              type="submit" 
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Requesting...' : 'Request Password Reset'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="forgot-password-form">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-group">
              <label htmlFor="resetToken">Reset Token</label>
              <input
                type="text"
                id="resetToken"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Enter reset token"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8-20 characters, include uppercase, lowercase, number and special character"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>

            <button 
              type="submit" 
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="forgot-password-footer">
          <Link to="/login" className="back-to-login-link">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

