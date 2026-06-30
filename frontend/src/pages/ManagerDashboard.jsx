import React, { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export default function ManagerDashboard() {
  const { user, updateProfile } = useAuth();
  const { addToast } = useNotifications();

  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileImage, setProfileImage] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await updateProfile({ name, email, phone }, profileImage);
      addToast('Profile updated successfully!', 'success');
      setProfileImage(null);
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const [inbox, setInbox] = useState([]);
  const [workloads, setWorkloads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail modal state
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  // Inline actions
  const [internalNote, setInternalNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectPanel, setShowRejectPanel] = useState(false);
  const [assigningItemId, setAssigningItemId] = useState('');
  const [selectedTeamMember, setSelectedTeamMember] = useState('');
  const [deadline, setDeadline] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    fetchInbox();
    fetchWorkloads();
  }, []);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requests/inbox');
      const data = await res.json();
      if (data.success) {
        setInbox(data.requests);
      }
    } catch (err) {
      console.error('Error fetching inbox:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkloads = async () => {
    try {
      const res = await fetch('/api/requests/team-workload');
      const data = await res.json();
      if (data.success) {
        setWorkloads(data.workloads);
      }
    } catch (err) {
      console.error('Error fetching workloads:', err.message);
    }
  };

  const refreshDetails = async (id) => {
    try {
      const res = await fetch(`/api/requests/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedRequest(data.request);
      }
    } catch (err) {
      console.error('Error loading request details:', err.message);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!internalNote) return;

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/requests/${selectedRequest._id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: internalNote })
      });
      if (res.ok) {
        addToast('Internal note appended successfully', 'success');
        setInternalNote('');
        refreshDetails(selectedRequest._id);
        fetchInbox();
      }
    } catch (err) {
      addToast('Error appending internal note', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason) {
      addToast('Rejection reason required', 'info');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/requests/${selectedRequest._id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (res.ok) {
        addToast('Service request declined and archived', 'info');
        setRejectReason('');
        setShowRejectPanel(false);
        setSelectedRequest(null);
        fetchInbox();
      }
    } catch (err) {
      addToast('Error declining request', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!selectedTeamMember || !deadline) {
      addToast('Team member and deadline date are required', 'info');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/requests/${selectedRequest._id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestItemId: assigningItemId,
          teamMemberId: selectedTeamMember,
          deadline,
          managerNotes
        })
      });
      if (res.ok) {
        addToast('Task assigned successfully!', 'success');
        setAssigningItemId('');
        setSelectedTeamMember('');
        setDeadline('');
        setManagerNotes('');
        refreshDetails(selectedRequest._id);
        fetchInbox();
        fetchWorkloads();
      } else {
        const d = await res.json();
        addToast(d.message || 'Failed to assign', 'error');
      }
    } catch (err) {
      addToast('Error assigning task', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCompleteRequest = async () => {
    if (!window.confirm('Mark this entire service request as COMPLETED?')) return;
    try {
      const res = await fetch(`/api/requests/${selectedRequest._id}/complete`, { method: 'PUT' });
      if (res.ok) {
        addToast('Service request marked as COMPLETED', 'success');
        setSelectedRequest(null);
        fetchInbox();
      }
    } catch (err) {
      addToast('Error completing request', 'error');
    }
  };

  return (
    <main className="container" style={{ padding: '40px 24px' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Manager inbox</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Review wedding booking requests, coordinate team assignments, and track delivery</p>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px', alignItems: 'start' }}>
        {/* Profile Sidebar */}
        <aside className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--gold-primary)', marginBottom: '20px' }}>My Profile</h3>
          <form onSubmit={handleProfileUpdate}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                className="form-control" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={updating}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input 
                type="email" 
                className="form-control" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={updating}
              />
            </div>

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

        {/* Main Content */}
        <section>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Loading inbox requests...</p>
            </div>
          ) : inbox.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>No incoming requests found.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
              {/* Incoming requests table/list */}
              <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--gold-light)', marginBottom: '4px' }}>Booking Requests ({inbox.length})</h3>
                {inbox.map((req) => (
                  <div 
                    key={req._id} 
                    className="glass-panel" 
                    style={{
                      padding: '24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderLeft: `4px solid ${
                        req.status === 'ESCALATED' ? 'var(--status-escalated)' :
                        req.status === 'PENDING' ? 'var(--status-pending)' : 'var(--border-glass)'
                      }`
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{req.reference_no}</strong>
                        <span className={`badge badge-${req.status.toLowerCase()}`}>{req.status}</span>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        Customer: <strong>{req.user?.name}</strong> ({req.user?.phone})
                      </p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Event Date: <strong>{new Date(req.event_date).toLocaleDateString()}</strong> at <strong>{req.venue}</strong>
                      </p>
                    </div>

                    <button 
                      onClick={() => { setSelectedRequest(req); setShowRejectPanel(false); setAssigningItemId(''); }} 
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                    >
                      Inspect details
                    </button>
                  </div>
                ))}
              </section>

              {/* Workload statistics sidebar */}
              <aside className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--gold-primary)', marginBottom: '16px' }}>Team Workload Metrics</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {workloads.map((w) => (
                    <div key={w.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)'
                    }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block' }}>{w.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{w.email}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="badge" style={{
                          background: w.activeTasks > 2 ? 'rgba(233,30,99,0.1)' : 'rgba(76,175,80,0.1)',
                          color: w.activeTasks > 2 ? 'var(--status-escalated)' : 'var(--status-completed)',
                          fontSize: '0.75rem'
                        }}>
                          {w.activeTasks} Active Tasks
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          )}
        </section>
      </div>

      {/* Manager Detail View Overlay */}
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
            width: '95%',
            maxWidth: '850px',
            background: 'var(--bg-surface)',
            padding: '32px',
            borderRadius: 'var(--radius-md)',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: '28px'
          }}>
            {/* Close Button */}
            <button
              onClick={() => { setSelectedRequest(null); setAssigningItemId(''); }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '1.8rem',
                cursor: 'pointer',
                zIndex: 100
              }}
            >
              &times;
            </button>

            {/* Left Column: Client requests info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--gold-primary)' }}>Request: {selectedRequest.reference_no}</h3>
                <span className={`badge badge-${selectedRequest.status.toLowerCase()}`}>{selectedRequest.status}</span>
              </div>

              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                <p>Customer: <strong>{selectedRequest.user?.name}</strong> ({selectedRequest.user?.email} | {selectedRequest.user?.phone})</p>
                <p>Event coordinates: <strong>{new Date(selectedRequest.event_date).toLocaleDateString()}</strong> at <strong>{selectedRequest.venue}</strong></p>
              </div>

              {selectedRequest.customer_message && (
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Client Message</span>
                  <p style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', fontSize: '0.88rem', borderRadius: 'var(--radius-sm)' }}>
                    "{selectedRequest.customer_message}"
                  </p>
                </div>
              )}

              {/* Service Items checklist & task assign trigger */}
              <h4 style={{ fontSize: '1.1rem', color: 'var(--gold-light)', marginBottom: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                Requested Services & Coordination
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {selectedRequest.items.map((item) => {
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.service?.name}</strong>
                        <span className={`badge badge-${item.status.toLowerCase()}`} style={{ fontSize: '0.68rem' }}>{item.status}</span>
                      </div>
                      
                      {item.custom_notes && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                          <em>Custom: "{item.custom_notes}"</em>
                        </p>
                      )}

                      {/* Assignment details */}
                      {assignment ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-light)', paddingTop: '8px', marginTop: '8px' }}>
                          <p>Assigned to: <strong>{assignment.team_member?.name}</strong></p>
                          <p>Deadline: <strong>{new Date(assignment.deadline).toLocaleDateString()}</strong></p>
                          {assignment.manager_notes && <p>Manager notes: <em>"{assignment.manager_notes}"</em></p>}
                          
                          {/* Reassign action button */}
                          {selectedRequest.status !== 'COMPLETED' && (
                            <button
                              onClick={() => { setAssigningItemId(item._id); setSelectedTeamMember(assignment.team_member?._id || ''); }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--gold-primary)',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                padding: 0,
                                marginTop: '6px',
                                textDecoration: 'underline'
                              }}
                            >
                              Re-assign Team Member
                            </button>
                          )}
                        </div>
                      ) : (
                        selectedRequest.status !== 'COMPLETED' && (
                          <button
                            onClick={() => { setAssigningItemId(item._id); setSelectedTeamMember(''); }}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', marginTop: '4px' }}
                          >
                            Assign Team Member
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Manager Side Actions */}
            <aside style={{ borderLeft: '1px solid var(--border-glass)', paddingLeft: '24px' }}>
              {/* Task Assigning Panel (Absolute overlay in sidebar context) */}
              {assigningItemId ? (
                <div style={{ background: 'rgba(212,175,55,0.02)', border: '1px solid var(--gold-primary)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--gold-primary)', marginBottom: '12px' }}>Assign Service</h4>
                  <form onSubmit={handleAssignTask}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Select Staff</label>
                      <select 
                        className="form-control" 
                        value={selectedTeamMember}
                        onChange={(e) => setSelectedTeamMember(e.target.value)}
                        required
                        style={{ background: '#111' }}
                      >
                        <option value="">-- Choose Team Member --</option>
                        {workloads.map(w => (
                          <option key={w.id} value={w.id}>{w.name} ({w.activeTasks} active)</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Task Deadline</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Manager Notes</label>
                      <textarea 
                        rows="2" 
                        className="form-control" 
                        placeholder="Instructions..."
                        value={managerNotes}
                        onChange={(e) => setManagerNotes(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', flexGrow: 1 }} disabled={submittingAction}>
                        Assign
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setAssigningItemId('')}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  {/* Internal Notes Logs */}
                  <div style={{ marginBottom: '24px' }}>
                    <h5 style={{ color: 'var(--gold-light)', fontSize: '0.85rem', marginBottom: '8px' }}>Internal Notes (Private)</h5>
                    <div style={{
                      maxHeight: '150px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      {selectedRequest.internal_notes?.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No internal notes.</span>
                      ) : (
                        selectedRequest.internal_notes?.map((n, idx) => (
                          <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{n.note}</p>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>By {n.manager?.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <form onSubmit={handleAddNote}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Add private note..."
                        value={internalNote}
                        onChange={(e) => setInternalNote(e.target.value)}
                        style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                      />
                      <button type="submit" className="btn btn-secondary" style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem', marginTop: '6px' }} disabled={submittingAction}>
                        Add Note
                      </button>
                    </form>
                  </div>

                  <div className="luxury-divider" style={{ margin: '16px 0' }} />

                  {/* Reject / Complete actions */}
                  {selectedRequest.status !== 'COMPLETED' && selectedRequest.status !== 'REJECTED' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button onClick={handleCompleteRequest} className="btn btn-primary" style={{ width: '100%' }}>
                        Mark COMPLETED
                      </button>

                      {showRejectPanel ? (
                        <form onSubmit={handleReject} style={{ marginTop: '10px' }}>
                          <textarea
                            rows="2"
                            className="form-control"
                            placeholder="Reason for declining..."
                            required
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            style={{ fontSize: '0.8rem', marginBottom: '8px' }}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem', flexGrow: 1 }} disabled={submittingAction}>
                              Confirm Decline
                            </button>
                            <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setShowRejectPanel(false)}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button onClick={() => setShowRejectPanel(true)} className="btn btn-danger" style={{ width: '100%' }}>
                          Reject Request
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </aside>
          </div>
        </div>
      )}
    </main>
  );
}
