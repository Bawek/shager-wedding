import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getApiUrl } from '../utils/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  const { login } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!email || !password) {
      setFormError('Please fill out all fields.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      addToast(`Welcome back, ${user.name}!`, 'success');
      
      // Redirect based on role
      if (user.role === 'admin') navigate('/admin-panel');
      else if (user.role === 'manager') navigate('/manager-dashboard');
      else if (user.role === 'team') navigate('/team-dashboard');
      else navigate('/');
    } catch (err) {
      setFormError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      addToast('Please enter your email', 'info');
      return;
    }
    try {
      const res = await fetch(getApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message, 'success');
        setShowReset(false);
      } else {
        addToast(data.message, 'error');
      }
    } catch (err) {
      addToast('Failed to trigger reset simulation', 'error');
    }
  };

  return (
    <div className="container" style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '40px 32px'
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '2rem',
          marginBottom: '8px',
          color: 'var(--text-primary)'
        }}>Sign In</h2>
        <p style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          marginBottom: '32px'
        }}>Access your Shager Wedding account</p>

        {formError && (
          <div style={{
            background: 'rgba(244, 67, 54, 0.12)',
            color: 'hsl(0, 85%, 70%)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            fontSize: '0.88rem',
            marginBottom: '20px'
          }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-control"
              placeholder="e.g. customer@shagerwedding.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              id="login_email"
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Password</label>
              <button 
                type="button"
                onClick={() => setShowReset(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gold-light)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  marginBottom: '0.5rem'
                }}
              >
                Forgot Password?
              </button>
            </div>
            <input 
              type="password" 
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              id="login_password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '12px' }}
            disabled={loading}
            id="login_submit"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          marginTop: '24px'
        }}>
          New to the store? <Link to="/register" style={{ color: 'var(--gold-primary)', fontWeight: 500 }}>Create an account</Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showReset && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '400px',
            padding: '32px',
            background: 'var(--bg-surface)'
          }}>
            <h3 style={{ marginBottom: '8px' }}>Reset Password</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Enter your registered email. We will print the simulated secure reset link in the server logs.
            </p>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  required
                  placeholder="name@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReset(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Send Simulation Link</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
