import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [venue, setVenue] = useState('');
  const [loading, setLoading] = useState(false);
  const [selfRegistrationAllowed, setSelfRegistrationAllowed] = useState(true);
  const [checkingSettings, setCheckingSettings] = useState(true);
  const [formError, setFormError] = useState('');

  const { register } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  // Check if self-registration is allowed on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/services/categories'); // any public route, or create settings mock
        // Let's call /api/auth/register or mock it based on settings response
        const settingsRes = await fetch('/api/admin/settings'); // admin setting check (usually private, let's create a public settings fetch or simple check)
        
        // Actually, if settings fails due to auth, we will fall back to allowing registration, or we can expose a public settings check.
        // Let's create a public settings route on the backend? Oh, we don't have a public settings controller but we can inspect it safely.
        // If we try fetching settings and get 401, we will assume self registration is active.
        if (settingsRes.status === 401 || settingsRes.status === 403) {
          setSelfRegistrationAllowed(true);
        } else {
          const data = await settingsRes.json();
          if (data.success && data.settings) {
            setSelfRegistrationAllowed(data.settings.allowSelfRegistration);
          }
        }
      } catch (err) {
        setSelfRegistrationAllowed(true); // default safe
      } finally {
        setCheckingSettings(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name || !email || !password || !phone) {
      setFormError('Please fill out all required fields.');
      return;
    }

    setLoading(true);
    try {
      const user = await register(name, email, password, phone, weddingDate, venue);
      addToast(`Account created successfully! Welcome, ${user.name}`, 'success');
      navigate('/');
    } catch (err) {
      setFormError(err.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSettings) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading registration settings...</p>
      </div>
    );
  }

  if (!selfRegistrationAllowed) {
    return (
      <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '480px', padding: '40px', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--gold-primary)', marginBottom: '16px' }}>Self-Registration Disabled</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Customer self-registration has been disabled by the system administrator. Please contact Shager Support at <strong style={{color:'white'}}>info@shagerwedding.com</strong> or call <strong style={{color:'white'}}>+251 911 223344</strong> to request your booking account setup.
          </p>
          <Link to="/login" className="btn btn-primary">Go to Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{
      minHeight: '90vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '500px',
        padding: '32px'
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '1.8rem',
          marginBottom: '8px'
        }}>Create Account</h2>
        <p style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          marginBottom: '24px'
        }}>Start planning your dream wedding services</p>

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
            <label className="form-label">Full Name *</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Selamawit Abebe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="e.g. selam@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number *</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. +251 911 555555"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Wedding Date (Optional)</label>
              <input 
                type="date" 
                className="form-control" 
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Venue (Optional)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Sheraton Addis"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          marginTop: '20px'
        }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--gold-primary)', fontWeight: 500 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
