import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (response.ok && data.success) {
        // Compare count to trigger toasts for new items
        if (notifications.length > 0 && data.notifications.length > notifications.length) {
          const freshItems = data.notifications.slice(0, data.notifications.length - notifications.length);
          freshItems.forEach(item => {
            addToast(item.message, item.type.toLowerCase());
          });
        }
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err.message);
    }
  };

  // Poll for notifications if user is logged in
  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // every 10 seconds
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [user]);

  const markAsRead = async (id) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, is_read: true } : n))
        );
      }
    } catch (e) {
      console.error('Failed to mark read:', e.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', { method: 'PUT' });
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (e) {
      console.error('Failed to mark all read:', e.message);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, toasts, addToast, removeToast, markAsRead, markAllAsRead, refreshNotifications: fetchNotifications }}>
      {children}
      
      {/* Toast Alert Render Container */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '350px'
      }}>
        {toasts.map((toast) => (
          <div key={toast.id} className="glass-panel animate-fade-in" style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: `4px solid ${
              toast.type.includes('escalat') ? 'var(--status-escalated)' : 
              toast.type.includes('assign') ? 'var(--status-assigned)' : 
              toast.type.includes('status') ? 'var(--gold-primary)' : 'var(--text-secondary)'
            }`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            background: 'rgba(18, 20, 26, 0.95)'
          }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{toast.message}</span>
            <button 
              onClick={() => removeToast(toast.id)} 
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
