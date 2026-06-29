import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function Catalog({ onCartChange }) {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Selected Service Detail Modal
  const [selectedService, setSelectedService] = useState(null);
  const [customNotes, setCustomNotes] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchServices();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/services/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Error fetching categories:', err.message);
    }
  };

  const fetchServices = async (cat = '', search = '', min = '', max = '') => {
    setLoading(true);
    try {
      let url = `/api/services?category=${cat}&search=${search}&minPrice=${min}&maxPrice=${max}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setServices(data.services);
      }
    } catch (err) {
      console.error('Error fetching services:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchServices(selectedCategory, searchQuery, minPrice, maxPrice);
  };

  const handleCategorySelect = (catId) => {
    const nextCat = selectedCategory === catId ? '' : catId;
    setSelectedCategory(nextCat);
    fetchServices(nextCat, searchQuery, minPrice, maxPrice);
  };

  const openServiceModal = async (id) => {
    try {
      const res = await fetch(`/api/services/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedService(data.service);
        setCustomNotes('');
      }
    } catch (err) {
      addToast('Failed to load service details', 'error');
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      addToast('Please login to build your wedding service cart', 'info');
      return;
    }
    if (user.role !== 'customer') {
      addToast('Only customer accounts can add items to cart', 'error');
      return;
    }

    setAddingToCart(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService._id,
          customNotes
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`${selectedService.name} added to cart!`, 'success');
        setSelectedService(null);
        if (onCartChange) onCartChange(); // trigger navbar update
      } else {
        addToast(data.message || 'Failed to add to cart', 'error');
      }
    } catch (err) {
      addToast('Error adding to cart', 'error');
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <main className="container" style={{ padding: '40px 24px' }}>
      {/* Hero Banner */}
      <section style={{ textAlign: 'center', marginBottom: '40px' }} className="animate-fade-in">
        <h1 style={{ fontSize: '3rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Discover Wedding Services
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Browse premium photography, elegant catering, floral backdrops, and garden halls tailored for your special day.
        </p>
      </section>

      {/* Categories Horizontal Scroller */}
      <div style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '16px',
        marginBottom: '32px',
        scrollbarWidth: 'none'
      }}>
        {categories.map((cat) => (
          <button
            key={cat._id}
            onClick={() => handleCategorySelect(cat._id)}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              whiteSpace: 'nowrap',
              fontWeight: 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)',
              border: '1px solid',
              background: selectedCategory === cat._id ? 'var(--gold-primary)' : 'rgba(255, 255, 255, 0.02)',
              borderColor: selectedCategory === cat._id ? 'var(--gold-primary)' : 'var(--border-glass)',
              color: selectedCategory === cat._id ? 'black' : 'var(--text-secondary)'
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '32px', alignItems: 'start' }}>
        {/* Filters Sidebar */}
        <aside className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--gold-primary)', marginBottom: '20px' }}>Filter Catalog</h3>
          <form onSubmit={handleFilterSubmit}>
            <div className="form-group">
              <label className="form-label">Search Keywords</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Photography, Cake"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Min Price (ETB)</label>
              <input
                type="number"
                className="form-control"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Max Price (ETB)</label>
              <input
                type="number"
                className="form-control"
                placeholder="150000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
              Apply Filters
            </button>
          </form>
        </aside>

        {/* Services Grid */}
        <section>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Searching available services...</p>
            </div>
          ) : services.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px' }} className="glass-panel">
              <p style={{ color: 'var(--text-muted)' }}>No wedding services found matching your filters.</p>
            </div>
          ) : (
            <div className="grid-catalog">
              {services.map((service) => (
                <div
                  key={service._id}
                  className="glass-panel glass-panel-hover"
                  style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}
                >
                  <div style={{ height: '180px', background: '#222', position: 'relative' }}>
                    {service.images && service.images[0] ? (
                      <img
                        src={service.images[0]}
                        alt={service.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'var(--text-muted)'
                      }}>
                        No Photo
                      </div>
                    )}
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(0,0,0,0.7)',
                      color: 'var(--gold-primary)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {service.category?.name}
                    </span>
                  </div>

                  <div style={{ padding: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text-primary)' }}>{service.name}</h4>
                    <p style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      marginBottom: '20px',
                      flexGrow: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>{service.description}</p>
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid var(--border-light)',
                      paddingTop: '12px'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Price Range</span>
                        <strong style={{ color: 'var(--gold-primary)', fontSize: '1rem' }}>
                          {service.price_min.toLocaleString()} - {service.price_max.toLocaleString()} ETB
                        </strong>
                      </div>
                      <button
                        onClick={() => openServiceModal(service._id)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Service Detail Modal */}
      {selectedService && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          overflowY: 'auto',
          padding: '24px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '680px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <button
              onClick={() => setSelectedService(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '1.8rem',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              &times;
            </button>

            {/* Modal Image Header */}
            {selectedService.images && selectedService.images[0] && (
              <div style={{ height: '240px', overflow: 'hidden' }}>
                <img
                  src={selectedService.images[0]}
                  alt={selectedService.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            <div style={{ padding: '32px' }}>
              <span className="badge badge-reviewed" style={{ marginBottom: '12px' }}>
                {selectedService.category?.name}
              </span>
              <h3 style={{ fontSize: '1.8rem', marginBottom: '12px', color: 'var(--text-primary)' }}>
                {selectedService.name}
              </h3>
              
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
                {selectedService.description}
              </p>

              <div style={{
                background: 'rgba(212, 175, 55, 0.05)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px 20px',
                marginBottom: '28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Estimated Price Range</span>
                  <p style={{ color: 'var(--gold-primary)', fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
                    {selectedService.price_min.toLocaleString()} - {selectedService.price_max.toLocaleString()} ETB
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Customer Rating</span>
                  <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                    ★ {selectedService.rating || '4.8'} / 5.0
                  </p>
                </div>
              </div>

              {/* Service Customization Notes */}
              {user && user.role === 'customer' && (
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Service Customization Notes (Optional)</label>
                  <textarea
                    rows="3"
                    className="form-control"
                    placeholder="Provide specific notes (e.g. choice of color theme, floral types, dietary preferences, or shooting styles)..."
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              )}

              {/* Reviews Section */}
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ fontSize: '1.1rem', color: 'var(--gold-light)', marginBottom: '12px' }}>Recent Reviews</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedService.reviews?.map((r) => (
                    <div key={r.id} style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{r.user}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--gold-primary)' }}>{'★'.repeat(r.rating)}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedService(null)}
                >
                  Close
                </button>
                {(!user || user.role === 'customer') && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                  >
                    {addingToCart ? 'Adding to Cart...' : 'Add to Service Cart'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
