import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getApiUrl } from '../utils/api';

export default function TeamDashboard() {
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

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [progressNote, setProgressNote] = useState('');
  const [deliverableFilename, setDeliverableFilename] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [showEscalate, setShowEscalate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/requests/my-tasks'));
      const data = await res.json();
      if (data.success) setTasks(data.tasks);
    } catch (err) {
      console.error('Error fetching tasks:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (requestId, assignId, status) => {
    setSubmitting(true);
    try {
      const res = await fetch(getApiUrl(`/api/requests/${requestId}/tasks/${assignId}/status`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        addToast(`Task marked as ${status}`, 'success');
        fetchTasks();
        setSelectedTask(null);
      } else {
        const d = await res.json();
        addToast(d.message || 'Failed to update status', 'error');
      }
    } catch (err) {
      addToast('Error updating task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!progressNote || !selectedTask) return;
    setSubmitting(true);
    try {
      const res = await fetch(getApiUrl(`/api/requests/${selectedTask.requestId}/tasks/${selectedTask.assignmentId}/notes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: progressNote })
      });
      if (res.ok) {
        addToast('Progress note added', 'success');
        setProgressNote('');
        fetchTasks();
      } else {
        const d = await res.json();
        addToast(d.message || 'Failed to add note', 'error');
      }
    } catch (err) {
      addToast('Error adding note', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadDeliverable = async (e) => {
    e.preventDefault();
    if (!deliverableFilename || !deliverableUrl || !selectedTask) return;
    setSubmitting(true);
    try {
      const res = await fetch(getApiUrl(`/api/requests/${selectedTask.requestId}/tasks/${selectedTask.assignmentId}/deliverables`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: deliverableFilename, url: deliverableUrl })
      });
      if (res.ok) {
        addToast('Deliverable uploaded successfully', 'success');
        setDeliverableFilename('');
        setDeliverableUrl('');
        fetchTasks();
      } else {
        const d = await res.json();
        addToast(d.message || 'Upload failed', 'error');
      }
    } catch (err) {
      addToast('Error uploading deliverable', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!escalateReason || !selectedTask) return;
    setSubmitting(true);
    try {
      const res = await fetch(getApiUrl(`/api/requests/${selectedTask.requestId}/tasks/${selectedTask.assignmentId}/escalate`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: escalateReason })
      });
      if (res.ok) {
        addToast('Task escalated to manager', 'info');
        setEscalateReason('');
        setShowEscalate(false);
        setSelectedTask(null);
        fetchTasks();
      } else {
        const d = await res.json();
        addToast(d.message || 'Escalation failed', 'error');
      }
    } catch (err) {
      addToast('Error escalating task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getDaysLeft = (deadline) => {
    const diff = new Date(deadline) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getUrgencyColor = (daysLeft) => {
    if (daysLeft < 3) return 'var(--status-escalated)';
    if (daysLeft < 7) return 'var(--status-pending)';
    return 'var(--status-completed)';
  };

  return (
    <main className="container" style={{ padding: '40px 24px' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>My Work Tasks</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Manage your assigned wedding service tasks, log progress, and upload deliverables
      </p>

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
              <p style={{ color: 'var(--text-secondary)' }}>Loading assigned tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No tasks assigned to you yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {tasks.map((task) => {
                const daysLeft = getDaysLeft(task.deadline);
                return (
                  <div
                    key={task.assignmentId}
                    className="glass-panel glass-panel-hover"
                    style={{ padding: '24px', cursor: 'pointer' }}
                    onClick={() => { setSelectedTask(task); setShowEscalate(false); setProgressNote(''); }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{task.serviceName}</strong>
                          <span className={`badge badge-${task.status.toLowerCase()}`}>{task.status}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Request: <strong>{task.referenceNo}</strong> — Customer: <strong>{task.customerName}</strong>
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Event: <strong>{new Date(task.eventDate).toLocaleDateString()}</strong> at <strong>{task.venue}</strong>
                        </p>
                        {task.managerNotes && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--gold-light)', marginTop: '6px', fontStyle: 'italic' }}>
                            Manager notes: "{task.managerNotes}"
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '110px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Deadline</span>
                        <strong style={{ color: getUrgencyColor(daysLeft), fontSize: '0.9rem' }}>
                          {new Date(task.deadline).toLocaleDateString()}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: getUrgencyColor(daysLeft), display: 'block' }}>
                          {daysLeft > 0 ? `${daysLeft} day(s) left` : 'OVERDUE'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Task Detail Overlay */}
      {selectedTask && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '24px'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '95%', maxWidth: '700px', background: 'var(--bg-surface)',
            padding: '32px', borderRadius: 'var(--radius-md)',
            maxHeight: '90vh', overflowY: 'auto', position: 'relative'
          }}>
            <button onClick={() => setSelectedTask(null)} style={{
              position: 'absolute', top: '16px', right: '16px', background: 'none',
              border: 'none', color: 'var(--text-secondary)', fontSize: '1.8rem', cursor: 'pointer'
            }}>&times;</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--gold-primary)' }}>{selectedTask.serviceName}</h3>
              <span className={`badge badge-${selectedTask.status.toLowerCase()}`}>{selectedTask.status}</span>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
              background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '24px', fontSize: '0.88rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Request Ref</span>
                <strong style={{ display: 'block' }}>{selectedTask.referenceNo}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Customer Contact</span>
                <strong style={{ display: 'block' }}>{selectedTask.customerName} — {selectedTask.customerPhone}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Event Date</span>
                <strong style={{ display: 'block' }}>{new Date(selectedTask.eventDate).toLocaleDateString()} at {selectedTask.venue}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Deadline</span>
                <strong style={{ display: 'block', color: getUrgencyColor(getDaysLeft(selectedTask.deadline)) }}>
                  {new Date(selectedTask.deadline).toLocaleDateString()} ({getDaysLeft(selectedTask.deadline)} days)
                </strong>
              </div>
            </div>

            {/* Status Progression */}
            {selectedTask.status !== 'COMPLETED' && selectedTask.status !== 'ESCALATED' && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                {selectedTask.status === 'PENDING' && (
                  <button
                    onClick={() => updateStatus(selectedTask.requestId, selectedTask.assignmentId, 'IN_PROGRESS')}
                    className="btn btn-primary" disabled={submitting}
                  >
                    Accept & Start Work
                  </button>
                )}
                {selectedTask.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => updateStatus(selectedTask.requestId, selectedTask.assignmentId, 'COMPLETED')}
                    className="btn btn-primary" disabled={submitting}
                  >
                    Mark as Completed
                  </button>
                )}
                <button
                  onClick={() => setShowEscalate(!showEscalate)}
                  className="btn btn-danger" style={{ fontSize: '0.85rem' }}
                >
                  Escalate to Manager
                </button>
              </div>
            )}

            {showEscalate && (
              <form onSubmit={handleEscalate} style={{ marginBottom: '24px', background: 'rgba(233,30,99,0.05)', border: '1px solid rgba(233,30,99,0.2)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--status-escalated)' }}>Escalation Reason *</label>
                  <textarea rows="2" className="form-control" required placeholder="Describe the issue requiring escalation..."
                    value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-danger" disabled={submitting}>Confirm Escalation</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEscalate(false)}>Cancel</button>
                </div>
              </form>
            )}

            {/* Progress Notes */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '1rem', color: 'var(--gold-light)', marginBottom: '12px' }}>Progress Notes</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                {selectedTask.progressNotes?.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No progress notes yet.</span>
                ) : (
                  selectedTask.progressNotes?.map((n, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{n.note}</p>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(n.timestamp).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
              {selectedTask.status !== 'COMPLETED' && selectedTask.status !== 'ESCALATED' && (
                <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" className="form-control" placeholder="Log a progress update..."
                    value={progressNote} onChange={(e) => setProgressNote(e.target.value)} style={{ flexGrow: 1 }} />
                  <button type="submit" className="btn btn-secondary" disabled={submitting} style={{ whiteSpace: 'nowrap' }}>Add Note</button>
                </form>
              )}
            </div>

            {/* Deliverables */}
            <div>
              <h4 style={{ fontSize: '1rem', color: 'var(--gold-light)', marginBottom: '12px' }}>Deliverables Upload (Mock)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                {selectedTask.deliverables?.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No deliverables uploaded yet.</span>
                ) : (
                  selectedTask.deliverables?.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                      <span>📎</span>
                      <a href={f.url} target="_blank" rel="noreferrer" style={{ color: 'var(--gold-light)' }}>{f.filename}</a>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({new Date(f.uploaded_at).toLocaleDateString()})</span>
                    </div>
                  ))
                )}
              </div>
              {selectedTask.status !== 'ESCALATED' && (
                <form onSubmit={handleUploadDeliverable}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <input type="text" className="form-control" placeholder="Filename (e.g. wedding_photos.zip)"
                      value={deliverableFilename} onChange={(e) => setDeliverableFilename(e.target.value)} />
                    <input type="text" className="form-control" placeholder="Mock URL (e.g. https://drive.google.com/...)"
                      value={deliverableUrl} onChange={(e) => setDeliverableUrl(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-secondary" disabled={submitting} style={{ fontSize: '0.85rem' }}>
                    Upload Deliverable
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
