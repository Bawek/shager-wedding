import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { getApiUrl } from '../utils/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!token) {
      setMessage('Invalid reset link.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      setMessage('Please fill in both password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/auth/reset-password/confirm'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || 'Failed to reset password.');
      } else {
        addToast(data.message || 'Password reset successfully', 'success');
        navigate('/login');
      }
    } catch (err) {
      setMessage('Error submitting password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '36px' }}>
        <h2 style={{ fontSize: '1.9rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Reset Your Password</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Enter a new password to complete the reset. This uses the simulated reset token from the server logs.
        </p>

        {message && (
          <div style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', padding: '14px', marginBottom: '18px' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '18px' }} disabled={loading}>
            {loading ? 'Resetting password...' : 'Reset Password'}
          </button>
        </form>

        <p style={{ marginTop: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Remembered your password? <Link to="/login" style={{ color: 'var(--gold-primary)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
