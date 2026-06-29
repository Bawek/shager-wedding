import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function Navbar({ cartCount }) {
  const { user, logout } = useAuth();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="glass-panel" style={{
      borderRadius: '0',
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      borderBottom: '1px solid var(--border-glass)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '16px 0'
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* LOGO */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span style={{
            fontSize: '1.4rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.05em'
          }}>
            SHAGER <span style={{ color: 'var(--gold-primary)' }}>WEDDING</span>
          </span>
        </Link>

        {/* NAVIGATION LINKS */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {(!user || user.role === 'customer' || user.role === 'manager' || user.role === 'admin') && (
            <Link to="/" style={{ fontSize: '0.95rem', fontWeight: 500 }}>Browse Catalog</Link>
          )}

          {user && (
            <>
              {user.role === 'customer' && (
                <>
                  <Link to="/my-bookings" style={{ fontSize: '0.95rem', fontWeight: 500 }}>My Bookings</Link>
                  <Link to="/cart" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    {cartCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: 'var(--gold-primary)',
                        color: 'black',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {cartCount}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {user.role === 'manager' && (
                <Link to="/manager-dashboard" style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--gold-light)' }}>Manager Dashboard</Link>
              )}

              {user.role === 'team' && (
                <Link to="/team-dashboard" style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--gold-light)' }}>My Work Tasks</Link>
              )}

              {user.role === 'admin' && (
                <>
                  <Link to="/manager-dashboard" style={{ fontSize: '0.95rem', fontWeight: 500 }}>Manager Inbox</Link>
                  <Link to="/admin-panel" style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--gold-light)' }}>Admin Panel</Link>
                </>
              )}
            </>
          )}
        </nav>

        {/* AUTH BUTTONS & NOTIFICATIONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user ? (
            <>
              {/* NOTIFICATION BELL */}
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={unreadCount > 0 ? "var(--gold-primary)" : "currentColor"} strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--status-escalated)'
                    }} />
                  )}
                </button>

                {/* NOTIFICATIONS DROPDOWN */}
                {showNotifications && (
                  <div className="glass-panel" style={{
                    position: 'absolute',
                    right: 0,
                    top: '40px',
                    width: '320px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    zIndex: 200,
                    padding: '12px 0',
                    background: 'rgba(18, 20, 26, 0.98)'
                  }}>
                    <div style={{
                      padding: '0 16px 8px 16px',
                      borderBottom: '1px solid var(--border-glass)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>NOTIFICATIONS</span>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead} 
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--gold-light)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 500
                          }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No alerts yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n._id}
                          onClick={() => markAsRead(n._id)}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border-light)',
                            cursor: 'pointer',
                            background: n.is_read ? 'transparent' : 'rgba(212, 175, 55, 0.04)',
                            transition: 'var(--transition-smooth)'
                          }}
                          className="notify-item"
                        >
                          <p style={{
                            fontSize: '0.82rem',
                            color: n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)',
                            fontWeight: n.is_read ? 400 : 500
                          }}>{n.message}</p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Hello, <strong style={{ color: 'var(--gold-primary)' }}>{user.name.split(' ')[0]}</strong>
                </span>
                <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  Log Out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary" style={{ padding: '6px 16px', fontSize: '0.85rem' }}>Login</Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.85rem' }}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
