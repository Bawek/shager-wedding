import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../utils/api';

export default function CartPage({ onCartChange }) {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  // Checkout inputs
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Initialize event details from user profile if available
  useEffect(() => {
    if (user && user.profile) {
      if (user.profile.weddingDate) {
        setEventDate(new Date(user.profile.weddingDate).toISOString().split('T')[0]);
      }
      if (user.profile.venue) {
        setVenue(user.profile.venue);
      }
    }
    fetchCart();
  }, [user]);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/cart'));
      const data = await res.json();
      if (data.success) {
        setCart(data.cart);
      }
    } catch (err) {
      console.error('Error fetching cart:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (itemId) => {
    try {
      const res = await fetch(getApiUrl(`/api/cart/${itemId}`), { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        addToast('Service removed from cart', 'info');
        setCart(data.cart);
        if (onCartChange) onCartChange();
      } else {
        addToast(data.message || 'Failed to remove item', 'error');
      }
    } catch (err) {
      addToast('Error removing item', 'error');
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear your cart?')) return;
    try {
      const res = await fetch(getApiUrl('/api/cart'), { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        addToast('Cart cleared', 'info');
        setCart(data.cart);
        if (onCartChange) onCartChange();
      }
    } catch (err) {
      addToast('Error clearing cart', 'error');
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!eventDate || !venue) {
      addToast('Please fill in the event date and venue', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(getApiUrl('/api/requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventDate,
          venue,
          customerMessage
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Booking request submitted successfully!', 'success');
        if (onCartChange) onCartChange();
        navigate('/my-bookings');
      } else {
        addToast(data.message || 'Failed to submit booking request', 'error');
      }
    } catch (err) {
      addToast('Error during checkout', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Estimate total cost boundaries
  const calculateTotal = () => {
    if (!cart || !cart.items || cart.items.length === 0) return { min: 0, max: 0 };
    return cart.items.reduce((totals, item) => {
      if (item.service) {
        totals.min += item.service.price_min;
        totals.max += item.service.price_max;
      }
      return totals;
    }, { min: 0, max: 0 });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading service cart...</p>
      </div>
    );
  }

  const totals = calculateTotal();

  return (
    <main className="container" style={{ padding: '40px 24px' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Your Service Cart</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Review selected services and prepare request submission</p>

      {!cart || cart.items.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '1.1rem' }}>
            Your cart is currently empty.
          </p>
          <Link to="/" className="btn btn-primary">Browse Wedding Services</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px', alignItems: 'start' }}>
          {/* Cart Items List */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--gold-light)' }}>Selected Services ({cart.items.length})</h3>
              <button 
                onClick={handleClear} 
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'hsl(0, 85%, 70%)',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Clear Cart
              </button>
            </div>

            {cart.items.map((item) => (
              <div 
                key={item._id} 
                className="glass-panel animate-fade-in" 
                style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}
              >
                <div style={{ flexGrow: 1 }}>
                  <h4 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {item.service?.name}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--gold-primary)', fontWeight: 600, marginBottom: '8px' }}>
                    {item.service?.price_min.toLocaleString()} - {item.service?.price_max.toLocaleString()} ETB
                  </p>
                  
                  {item.custom_notes && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderLeft: '2px solid var(--gold-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      marginTop: '12px',
                      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0'
                    }}>
                      <strong style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        Customization Note
                      </strong>
                      "{item.custom_notes}"
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => handleRemove(item._id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    padding: '0 8px'
                  }}
                  title="Remove from cart"
                >
                  &times;
                </button>
              </div>
            ))}
          </section>

          {/* Checkout Panel */}
          <aside className="glass-panel" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--gold-primary)', marginBottom: '20px' }}>Checkout Details</h3>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              border: '1px solid var(--border-light)',
              marginBottom: '28px'
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Estimated Total Cost</span>
              <p style={{ color: 'var(--gold-primary)', fontSize: '1.4rem', fontWeight: 700, marginTop: '4px' }}>
                {totals.min.toLocaleString()} - {totals.max.toLocaleString()} ETB
              </p>
            </div>

            <form onSubmit={handleCheckout}>
              <div className="form-group">
                <label className="form-label">Target Wedding Date *</label>
                <input 
                  type="date" 
                  className="form-control" 
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Venue Location *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="e.g. Sheraton Addis, Grand Hall"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Additional Message (Optional)</label>
                <textarea 
                  rows="3" 
                  className="form-control" 
                  placeholder="Leave a message for the manager..."
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                  disabled={submitting}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '16px' }}
                disabled={submitting}
              >
                {submitting ? 'Submitting Request...' : 'Submit Booking Request'}
              </button>
            </form>
          </aside>
        </div>
      )}
    </main>
  );
}
