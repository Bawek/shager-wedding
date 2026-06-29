import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function CustomerDashboard() {
  const { user, updateProfile } = useAuth();
  const { addToast } = useNotifications();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile fields
  const [phone, setPhone] = useState(user?.phone || '');
  const [weddingDate, setWeddingDate] = useState('');
  const [venue, setVenue] = useState(user?.profile?.venue || '');
  const [profileImage, setProfileImage] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Detail view modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (user) {
      setPhone(user.phone || '');
      setVenue(user.profile?.venue || '');
      if (user.profile?.weddingDate) {
        setWeddingDate(new Date(user.profile.weddingDate).toISOString().split('T')[0]);
      }
    }
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requests/my-requests');
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error('Error fetching requests:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await updateProfile({ phone, weddingDate, venue }, profileImage);
      addToast('Wedding profile details updated!', 'success');
      setProfileImage(null);
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const viewDetails = async (id) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/requests/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedRequest(data.request);
      }
    } catch (err) {
      addToast('Failed to load request details', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking request?')) return;
    try {
      const res = await fetch(`/api/requests/${id}/cancel`, { method: 'PUT' });
      const data = await res.json();
      if (res.ok) {
        addToast('Booking request cancelled successfully', 'info');
        fetchRequests();
        if (selectedRequest && selectedRequest._id === id) {
          setSelectedRequest(data.request);
        }
      } else {
        addToast(data.message || 'Failed to cancel request', 'error');
      }
    } catch (err) {
      addToast('Error cancelling request', 'error');
    }
  };

  return (
    <main className="container" style={{ padding: '40px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px', alignItems: 'start' }}>
        {/* Profile Sidebar */}
        <aside className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--gold-primary)', marginBottom: '20px' }}>Wedding Coordinates</h3>
          <form onSubmit={handleProfileUpdate}>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input 
                type="text" 
                className="form-control" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={updating}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Wedding Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
                disabled={updating}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Venue</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Sheraton Hotel"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                disabled={updating}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Profile Image</label>
              <input 
                type="file" 
                className="form-control" 
                accept="image/*"
                onChange={(e) => setProfileImage(e.target.files[0])}
                disabled={updating}
              />
              {user?.profile?.image && !profileImage && (
                <img 
                  src={user.profile.image} 
                  alt="Current profile" 
                  style={{ marginTop: '10px', maxWidth: '80px', borderRadius: '50%' }} 
                />
              )}
              {profileImage && (
                <img 
                  src={URL.createObjectURL(profileImage)} 
                  alt="New profile preview" 
                  style={{ marginTop: '10px', maxWidth: '80px', borderRadius: '50%' }} 
                />
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={updating}>
              {updating ? 'Updating...' : 'Save Profile'}
            </button>
          </form>
        </aside>

        {/* Requests Management Grid */}
        <section>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>My Service Bookings</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Track request status, review deliverables, or cancel bookings</p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Loading your request logs...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No bookings created yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {requests.map((req) => (
                <div 
                  key={req._id} 
                  className="glass-panel" 
                  style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{req.reference_no}</strong>
                      <span className={`badge badge-${req.status.toLowerCase()}`}>{req.status}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Event Date: <strong>{new Date(req.event_date).toLocaleDateString()}</strong> at <strong>{req.venue}</strong>
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Submitted: {new Date(req.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={() => viewDetails(req._id)} 
                      className="btn btn-secondary" 
                      style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                    >
                      View Details
                    </button>
                    {['PENDING', 'REVIEWED'].includes(req.status) && (
                      <button 
                        onClick={() => handleCancel(req._id)} 
                        className="btn btn-danger" 
                        style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Booking Details Modal */}
      {selectedRequest && (
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
          padding: '24px'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '90%',
            maxWidth: '650px',
            background: 'var(--bg-surface)',
            padding: '32px',
            borderRadius: 'var(--radius-md)',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative'
          }}>
            <button
              onClick={() => setSelectedRequest(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '1.8rem',
                cursor: 'pointer'
              }}
            >
              &times;
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--gold-primary)' }}>Booking details: {selectedRequest.reference_no}</h3>
              <span className={`badge badge-${selectedRequest.status.toLowerCase()}`}>{selectedRequest.status}</span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '24px',
              fontSize: '0.9rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Event Details</span>
                <strong>{new Date(selectedRequest.event_date).toLocaleDateString()}</strong> at <strong>{selectedRequest.venue}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Submitted At</span>
                {new Date(selectedRequest.submitted_at).toLocaleString()}
              </div>
            </div>

            {selectedRequest.customer_message && (
              <div style={{ marginBottom: '24px' }}>
                <span style={{ color: 'var(--gold-light)', display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Your Message</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  "{selectedRequest.customer_message}"
                </p>
              </div>
            )}

            {/* Requested Services Items */}
            <div style={{ marginBottom: '32px' }}>
              <h4 style={{ fontSize: '1.1rem', color: 'var(--gold-light)', marginBottom: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
                Booked Services
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedRequest.items.map((item) => {
                  // Find assignment if available
                  const assignment = selectedRequest.assignments?.find(
                    a => a.request_item_id.toString() === item._id.toString()
                  );

                  return (
                    <div key={item._id} style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '16px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{item.service?.name}</strong>
                        <span className={`badge badge-${item.status.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>{item.status}</span>
                      </div>
                      
                      {item.custom_notes && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          <em>Notes: "{item.custom_notes}"</em>
                        </p>
                      )}

                      {/* Display Deliverables if uploaded */}
                      {assignment && assignment.deliverables && assignment.deliverables.length > 0 && (
                        <div style={{ marginTop: '12px', borderTop: '1px dashed var(--border-light)', paddingTop: '8px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold-primary)', display: 'block', marginBottom: '6px' }}>
                            Deliverables (Uploaded Mock Files)
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {assignment.deliverables.map((file, fIdx) => (
                              <a 
                                key={fIdx} 
                                href={file.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                style={{
                                  fontSize: '0.8rem', 
                                  color: 'var(--gold-light)', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '6px'
                                }}
                              >
                                📎 {file.filename} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({new Date(file.uploaded_at).toLocaleDateString()})</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedRequest.rejection_reason && (
              <div style={{
                background: 'rgba(244, 67, 54, 0.08)',
                border: '1px solid rgba(244, 67, 54, 0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <strong style={{ color: 'hsl(0, 85%, 70%)', display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Rejection Reason</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedRequest.rejection_reason}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {['PENDING', 'REVIEWED'].includes(selectedRequest.status) && (
                <button 
                  onClick={() => handleCancel(selectedRequest._id)} 
                  className="btn btn-danger"
                >
                  Cancel Booking Request
                </button>
              )}
              <button onClick={() => setSelectedRequest(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
