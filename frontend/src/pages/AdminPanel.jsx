import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const TABS = ['Analytics', 'Users', 'Catalog', 'Settings', 'Audit Logs', 'Profile'];

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PROFILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AdminPanel() {
  const { user, updateProfile } = useAuth();
  const { addToast } = useNotifications();

  // Profile fields
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileImage, setProfileImage] = useState(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
      setProfilePhone(user.phone || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      await updateProfile({ name: profileName, email: profileEmail, phone: profilePhone }, profileImage);
      addToast('Profile updated successfully!', 'success');
      setProfileImage(null);
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };
  const [activeTab, setActiveTab] = useState('Analytics');

  // ---- Analytics ----
  const [analytics, setAnalytics] = useState(null);

  // ---- Users ----
  const [users, setUsers] = useState([]);
  const [userFilter, setUserFilter] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', phone: '', role: 'customer' });
  const [userProfileImage, setUserProfileImage] = useState(null);
  const [userProfilePreview, setUserProfilePreview] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetInProgress, setResetInProgress] = useState(false);
  const userFileInputRef = useRef(null);

  // ---- Catalog ----
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [showCreateService, setShowCreateService] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newService, setNewService] = useState({ name: '', categoryId: '', description: '', priceMin: '', priceMax: '' });
  const [newCategory, setNewCategory] = useState({ name: '', icon: 'stars', sortOrder: 0 });
  const [editingService, setEditingService] = useState(null);
  const [serviceThumbnail, setServiceThumbnail] = useState(null);
  const [serviceThumbnailPreview, setServiceThumbnailPreview] = useState(null);
  const [serviceImages, setServiceImages] = useState([]);
  const [serviceImagePreviews, setServiceImagePreviews] = useState([]);
  const serviceThumbFileInputRef = useRef(null);
  const serviceImagesFileInputRef = useRef(null);
  const editServiceThumbFileInputRef = useRef(null);
  const editServiceImagesFileInputRef = useRef(null);

  // ---- Settings ----
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // ---- Audit Logs ----
  const [auditLogs, setAuditLogs] = useState([]);

  const [submitting, setSubmitting] = useState(false);

  // File validation helper
  const validateFile = (file, maxSize) => {
    if (!file) return null;
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      addToast(`Invalid file type. Only JPEG, PNG, and WebP allowed`, 'error');
      return null;
    }
    
    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      addToast(`File size exceeds ${maxMB}MB limit`, 'error');
      return null;
    }
    
    return file;
  };

  // Cleanup object URLs
  const cleanupPreview = (preview) => {
    if (preview && typeof preview === 'string' && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
  };

  useEffect(() => {
    if (activeTab === 'Analytics') fetchAnalytics();
    else if (activeTab === 'Users') fetchUsers();
    else if (activeTab === 'Catalog') { fetchCategories(); fetchServices(); }
    else if (activeTab === 'Settings') fetchSettings();
    else if (activeTab === 'Audit Logs') fetchAuditLogs();
  }, [activeTab]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/analytics');
      const data = await res.json();
      if (data.success) setAnalytics(data.data);
    } catch (err) { console.error(err); }
  };

  const fetchUsers = async () => {
    try {
      const url = userFilter ? `/api/admin/users?role=${userFilter}` : '/api/admin/users';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (err) { console.error(err); }
  };

  const fetchCategories = async () => {
    const res = await fetch('/api/services/categories');
    const data = await res.json();
    if (data.success) setCategories(data.categories);
  };

  const fetchServices = async () => {
    const res = await fetch('/api/services?');
    const data = await res.json();
    if (data.success) setServices(data.services);
  };

  const fetchSettings = async () => {
    const res = await fetch('/api/admin/settings');
    const data = await res.json();
    if (data.success) setSettings(data.settings);
  };

  const fetchAuditLogs = async () => {
    const res = await fetch('/api/admin/audit-logs');
    const data = await res.json();
    if (data.success) setAuditLogs(data.logs);
  };

  const handleUserProfileImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validated = validateFile(file, MAX_PROFILE_SIZE);
    if (!validated) {
      e.target.value = '';
      return;
    }

    cleanupPreview(userProfilePreview);
    setUserProfileImage(validated);
    setUserProfilePreview(URL.createObjectURL(validated));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', newUser.name);
      formData.append('email', newUser.email);
      formData.append('password', newUser.password);
      formData.append('phone', newUser.phone);
      formData.append('role', newUser.role);
      
      if (userProfileImage) {
        formData.append('profileImage', userProfileImage);
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`Account created for ${newUser.email}`, 'success');
        setShowCreateUser(false);
        setNewUser({ name: '', email: '', password: '', phone: '', role: 'customer' });
        cleanupPreview(userProfilePreview);
        setUserProfileImage(null);
        setUserProfilePreview(null);
        if (userFileInputRef.current) userFileInputRef.current.value = '';
        fetchUsers();
      } else { addToast(data.message || 'Failed to create user', 'error'); }
    } catch (err) { addToast('Error creating user', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleToggleUserStatus = async (uid, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) { addToast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'info'); fetchUsers(); }
    } catch (err) { addToast('Error updating user', 'error'); }
  };

  const handleDeleteUser = async (uid, email) => {
    if (!window.confirm(`Permanently delete account ${email}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${uid}`, { method: 'DELETE' });
      if (res.ok) { addToast(`Account ${email} deleted`, 'info'); fetchUsers(); }
    } catch (err) { addToast('Error deleting user', 'error'); }
  };

  const handleResetUserPassword = async (userToReset) => {
    if (!resetPasswordValue || resetPasswordValue.length < 6) {
      addToast('Please enter a new password with at least 6 characters', 'error');
      return;
    }

    setResetInProgress(true);
    try {
      const res = await fetch(`/api/admin/users/${userToReset._id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPasswordValue })
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`Password reset for ${userToReset.email}`, 'success');
        setResetPasswordUser(null);
        setResetPasswordValue('');
      } else {
        addToast(data.message || 'Failed to reset password', 'error');
      }
    } catch (err) {
      addToast('Error resetting password', 'error');
    } finally {
      setResetInProgress(false);
    }
  };

  const handleServiceThumbnailChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validated = validateFile(file, MAX_FILE_SIZE);
    if (!validated) {
      e.target.value = '';
      return;
    }

    cleanupPreview(serviceThumbnailPreview);
    setServiceThumbnail(validated);
    setServiceThumbnailPreview(URL.createObjectURL(validated));
  };

  const handleServiceImagesChange = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    
    if (files.length > 10) {
      addToast('Maximum 10 images allowed', 'error');
      e.target.value = '';
      return;
    }

    const validatedFiles = files.filter(file => {
      const validated = validateFile(file, MAX_FILE_SIZE);
      return validated !== null;
    });

    if (validatedFiles.length === 0) {
      e.target.value = '';
      return;
    }

    // Cleanup old previews
    serviceImagePreviews.forEach(cleanupPreview);

    setServiceImages(validatedFiles);
    setServiceImagePreviews(validatedFiles.map(file => URL.createObjectURL(file)));
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', newService.name);
      formData.append('categoryId', newService.categoryId);
      formData.append('description', newService.description);
      formData.append('priceMin', newService.priceMin);
      formData.append('priceMax', newService.priceMax);
      
      if (serviceThumbnail) {
        formData.append('thumbnail', serviceThumbnail);
      }
      
      if (serviceImages.length > 0) {
        serviceImages.forEach(img => formData.append('images', img));
      }

      const res = await fetch('/api/admin/services', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Service created', 'success');
        setShowCreateService(false);
        setNewService({ name: '', categoryId: '', description: '', priceMin: '', priceMax: '' });
        cleanupPreview(serviceThumbnailPreview);
        setServiceThumbnail(null);
        setServiceThumbnailPreview(null);
        serviceImagePreviews.forEach(cleanupPreview);
        setServiceImages([]);
        setServiceImagePreviews([]);
        if (serviceThumbFileInputRef.current) serviceThumbFileInputRef.current.value = '';
        if (serviceImagesFileInputRef.current) serviceImagesFileInputRef.current.value = '';
        fetchServices();
      } else { addToast(data.message || 'Failed', 'error'); }
    } catch (err) { addToast('Error creating service', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    if (!editingService) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', editingService.name);
      formData.append('description', editingService.description);
      formData.append('priceMin', editingService.price_min);
      formData.append('priceMax', editingService.price_max);
      formData.append('is_active', editingService.is_active);
      
      if (serviceThumbnail) {
        formData.append('thumbnail', serviceThumbnail);
      }
      
      if (serviceImages.length > 0) {
        serviceImages.forEach(img => formData.append('images', img));
      }

      const res = await fetch(`/api/admin/services/${editingService._id}`, {
        method: 'PUT',
        body: formData
      });
      if (res.ok) { 
        addToast('Service updated', 'success'); 
        setEditingService(null);
        cleanupPreview(serviceThumbnailPreview);
        setServiceThumbnail(null);
        setServiceThumbnailPreview(null);
        serviceImagePreviews.forEach(cleanupPreview);
        setServiceImages([]);
        setServiceImagePreviews([]);
        if (editServiceThumbFileInputRef.current) editServiceThumbFileInputRef.current.value = '';
        if (editServiceImagesFileInputRef.current) editServiceImagesFileInputRef.current.value = '';
        fetchServices(); 
      }
    } catch (err) { addToast('Error updating service', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      });
      if (res.ok) { addToast('Category created', 'success'); setShowCreateCategory(false); fetchCategories(); }
    } catch (err) { addToast('Error', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) { addToast('System settings saved', 'success'); }
    } catch (err) { addToast('Error saving settings', 'error'); }
    finally { setSavingSettings(false); }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/admin/export-csv');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'wedding_requests.csv';
      a.click(); URL.revokeObjectURL(url);
    } catch (err) { addToast('Export failed', 'error'); }
  };

  const tabBtnStyle = (tab) => ({
    padding: '10px 20px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
    fontWeight: 500, fontSize: '0.9rem', borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition-smooth)',
    background: activeTab === tab ? 'var(--gold-primary)' : 'transparent',
    color: activeTab === tab ? 'black' : 'var(--text-secondary)'
  });

  return (
    <main className="container" style={{ padding: '40px 24px' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Admin Control Panel</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Manage users, wedding service catalog, system configurations, and review audit logs
      </p>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: 'var(--radius-sm)', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab} style={tabBtnStyle(tab)} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </div>

      {/* ===== ANALYTICS TAB ===== */}
      {activeTab === 'Analytics' && analytics && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
            {[
              { label: 'Total Requests', value: analytics.totalRequests, color: 'var(--gold-primary)' },
              { label: 'Completed', value: analytics.completedRequests, color: 'var(--status-completed)' },
              { label: 'Pending', value: analytics.pendingRequests, color: 'var(--status-pending)' },
              { label: 'Completion Rate', value: `${analytics.completionRate}%`, color: 'var(--gold-light)' },
            ].map((stat) => (
              <div key={stat.label} className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{stat.label}</span>
                <p style={{ fontSize: '2.2rem', fontWeight: 700, color: stat.color, marginTop: '6px' }}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--gold-light)', marginBottom: '16px' }}>Revenue Estimate</h3>
              <p style={{ color: 'var(--gold-primary)', fontSize: '2rem', fontWeight: 700 }}>
                {analytics.estimatedRevenue?.toLocaleString()} ETB
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>
                Based on midpoint pricing across all non-rejected requests
              </p>
            </div>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--gold-light)' }}>Team Performance</h3>
                <button onClick={handleExportCSV} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                  Export CSV
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analytics.teamPerformance?.map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ color: 'var(--status-completed)' }}>{m.completedTasks} done</span>
                      <span style={{ color: 'var(--status-pending)' }}>{m.activeTasks} active</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== USERS TAB ===== */}
      {activeTab === 'Users' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['', 'admin', 'manager', 'team', 'customer'].map(r => (
                <button key={r} onClick={() => { setUserFilter(r); fetchUsers(); }}
                  style={{
                    padding: '6px 14px', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-sans)',
                    background: userFilter === r ? 'var(--gold-primary)' : 'transparent',
                    color: userFilter === r ? 'black' : 'var(--text-secondary)'
                  }}
                >
                  {r || 'All Roles'}
                </button>
              ))}
            </div>
            <button onClick={() => setShowCreateUser(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              + Create Account
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {users.map((u) => (
              <div key={u._id} className="glass-panel" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
                    {u.profile?.image ? (
                      <img src={u.profile.image} alt={`${u.name} avatar`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        No Image
                      </div>
                    )}
                  </div>
                  <div>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)', display: 'block' }}>{u.name}</strong>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{u.email} — {u.phone}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`badge badge-${u.role}`} style={{
                    background: u.role === 'admin' ? 'rgba(212,175,55,0.15)' : u.role === 'manager' ? 'rgba(33,150,243,0.12)' : 'rgba(255,255,255,0.05)',
                    color: u.role === 'admin' ? 'var(--gold-primary)' : u.role === 'manager' ? 'var(--status-reviewed)' : 'var(--text-secondary)',
                    border: '1px solid var(--border-glass)'
                  }}>
                    {u.role}
                  </span>
                  <span className={`badge badge-${u.status === 'active' ? 'completed' : 'rejected'}`}>{u.status}</span>
                  {u._id !== user?._id && (
                    <>
                      <button onClick={() => handleToggleUserStatus(u._id, u.status)} className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                        {u.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => setResetPasswordUser(u)} className="btn btn-warning"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                        Reset Password
                      </button>
                      <button onClick={() => handleDeleteUser(u._id, u.email)} className="btn btn-danger"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {showCreateUser && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
              <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', background: 'var(--bg-surface)', padding: '32px', borderRadius: 'var(--radius-md)', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--gold-primary)' }}>Create User Account</h3>
                <form onSubmit={handleCreateUser}>
                  {[
                    { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Staff full name' },
                    { label: 'Email', key: 'email', type: 'email', placeholder: 'email@example.com' },
                    { label: 'Password', key: 'password', type: 'password', placeholder: 'Min 6 chars' },
                    { label: 'Phone', key: 'phone', type: 'text', placeholder: '+251 9XX XXX XXX' }
                  ].map(f => (
                    <div key={f.key} className="form-group">
                      <label className="form-label">{f.label}</label>
                      <input type={f.type} className="form-control" required placeholder={f.placeholder}
                        value={newUser[f.key]} onChange={(e) => setNewUser({ ...newUser, [f.key]: e.target.value })} />
                    </div>
                  ))}
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-control" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} style={{ background: '#111' }}>
                      <option value="customer">Customer</option>
                      <option value="team">Team Member</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Profile Image</label>
                    <input 
                      ref={userFileInputRef}
                      type="file" 
                      className="form-control" 
                      accept="image/*" 
                      onChange={handleUserProfileImageChange}
                    />
                    {userProfilePreview && (
                      <img src={userProfilePreview} alt="Profile preview" style={{ marginTop: '10px', maxWidth: '80px', borderRadius: '50%' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }} disabled={submitting}>Create Account</button>
                    <button type="button" className="btn btn-secondary" onClick={() => { 
                      setShowCreateUser(false); 
                      cleanupPreview(userProfilePreview);
                      setUserProfileImage(null);
                      setUserProfilePreview(null);
                      if (userFileInputRef.current) userFileInputRef.current.value = '';
                    }}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {resetPasswordUser && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
              <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', background: 'var(--bg-surface)', padding: '32px', borderRadius: 'var(--radius-md)' }}>
                <h3 style={{ marginBottom: '16px', color: 'var(--gold-primary)' }}>Reset Password</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>
                  Set a new password for <strong>{resetPasswordUser.email}</strong>.
                </p>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    placeholder="At least 6 characters"
                    disabled={resetInProgress}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setResetPasswordUser(null);
                    setResetPasswordValue('');
                  }} disabled={resetInProgress}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={() => handleResetUserPassword(resetPasswordUser)} disabled={resetInProgress}>
                    {resetInProgress ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== CATALOG TAB ===== */}
      {activeTab === 'Catalog' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button onClick={() => setShowCreateService(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>+ New Service</button>
            <button onClick={() => setShowCreateCategory(true)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>+ New Category</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {services.map((svc) => (
              <div key={svc._id} className="glass-panel" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '1rem' }}>{svc.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gold-primary)' }}>
                    {svc.price_min?.toLocaleString()} – {svc.price_max?.toLocaleString()} ETB
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '12px' }}>
                    {svc.category?.name}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span className={`badge badge-${svc.is_active ? 'completed' : 'rejected'}`}>
                    {svc.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => setEditingService({ ...svc, categoryId: svc.category?._id })} className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Edit</button>
                </div>
              </div>
            ))}
          </div>

          {/* Create Service Modal */}
          {showCreateService && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
              <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-surface)', padding: '32px', borderRadius: 'var(--radius-md)', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--gold-primary)' }}>Create Wedding Service</h3>
                <form onSubmit={handleCreateService}>
                  <div className="form-group">
                    <label className="form-label">Service Name</label>
                    <input type="text" className="form-control" required value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-control" required value={newService.categoryId} onChange={(e) => setNewService({ ...newService, categoryId: e.target.value })} style={{ background: '#111' }}>
                      <option value="">Select a category</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea rows="3" className="form-control" value={newService.description} onChange={(e) => setNewService({ ...newService, description: e.target.value })} style={{ resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Min Price (ETB)</label>
                      <input type="number" className="form-control" required value={newService.priceMin} onChange={(e) => setNewService({ ...newService, priceMin: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Max Price (ETB)</label>
                      <input type="number" className="form-control" required value={newService.priceMax} onChange={(e) => setNewService({ ...newService, priceMax: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Thumbnail Image</label>
                    <input 
                      ref={serviceThumbFileInputRef}
                      type="file" 
                      className="form-control" 
                      accept="image/*" 
                      onChange={handleServiceThumbnailChange}
                    />
                    {serviceThumbnailPreview && (
                      <img src={serviceThumbnailPreview} alt="Thumbnail preview" style={{ marginTop: '10px', maxWidth: '100px', borderRadius: '8px' }} />
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Additional Images (up to 10)</label>
                    <input 
                      ref={serviceImagesFileInputRef}
                      type="file" 
                      className="form-control" 
                      accept="image/*" 
                      multiple 
                      onChange={handleServiceImagesChange}
                    />
                    {serviceImagePreviews.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {serviceImagePreviews.map((preview, idx) => (
                          <img key={idx} src={preview} alt={`Preview ${idx}`} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }} disabled={submitting}>Create Service</button>
                    <button type="button" className="btn btn-secondary" onClick={() => { 
                      setShowCreateService(false);
                      cleanupPreview(serviceThumbnailPreview);
                      setServiceThumbnail(null);
                      setServiceThumbnailPreview(null);
                      serviceImagePreviews.forEach(cleanupPreview);
                      setServiceImages([]);
                      setServiceImagePreviews([]);
                      if (serviceThumbFileInputRef.current) serviceThumbFileInputRef.current.value = '';
                      if (serviceImagesFileInputRef.current) serviceImagesFileInputRef.current.value = '';
                    }}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Service Modal */}
          {editingService && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
              <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-surface)', padding: '32px', borderRadius: 'var(--radius-md)', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--gold-primary)' }}>Edit Service</h3>
                <form onSubmit={handleUpdateService}>
                  <div className="form-group">
                    <label className="form-label">Service Name</label>
                    <input type="text" className="form-control" value={editingService.name} onChange={(e) => setEditingService({ ...editingService, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea rows="3" className="form-control" value={editingService.description} onChange={(e) => setEditingService({ ...editingService, description: e.target.value })} style={{ resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Min Price</label>
                      <input type="number" className="form-control" value={editingService.price_min} onChange={(e) => setEditingService({ ...editingService, price_min: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Max Price</label>
                      <input type="number" className="form-control" value={editingService.price_max} onChange={(e) => setEditingService({ ...editingService, price_max: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={editingService.is_active ? 'true' : 'false'}
                      onChange={(e) => setEditingService({ ...editingService, is_active: e.target.value === 'true' })} style={{ background: '#111' }}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Current Thumbnail</label>
                    {editingService.thumbnail && (
                      <img src={editingService.thumbnail} alt="Current thumbnail" style={{ marginTop: '10px', maxWidth: '100px', borderRadius: '8px' }} />
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Update Thumbnail Image</label>
                    <input 
                      ref={editServiceThumbFileInputRef}
                      type="file" 
                      className="form-control" 
                      accept="image/*" 
                      onChange={handleServiceThumbnailChange}
                    />
                    {serviceThumbnailPreview && (
                      <img src={serviceThumbnailPreview} alt="New thumbnail preview" style={{ marginTop: '10px', maxWidth: '100px', borderRadius: '8px' }} />
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Additional Images (up to 10)</label>
                    <input 
                      ref={editServiceImagesFileInputRef}
                      type="file" 
                      className="form-control" 
                      accept="image/*" 
                      multiple 
                      onChange={handleServiceImagesChange}
                    />
                    {serviceImagePreviews.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {serviceImagePreviews.map((preview, idx) => (
                          <img key={idx} src={preview} alt={`Preview ${idx}`} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }} disabled={submitting}>Save Changes</button>
                    <button type="button" className="btn btn-secondary" onClick={() => { 
                      setEditingService(null);
                      cleanupPreview(serviceThumbnailPreview);
                      setServiceThumbnail(null);
                      setServiceThumbnailPreview(null);
                      serviceImagePreviews.forEach(cleanupPreview);
                      setServiceImages([]);
                      setServiceImagePreviews([]);
                      if (editServiceThumbFileInputRef.current) editServiceThumbFileInputRef.current.value = '';
                      if (editServiceImagesFileInputRef.current) editServiceImagesFileInputRef.current.value = '';
                    }}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Create Category Modal */}
          {showCreateCategory && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
              <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-surface)', padding: '32px', borderRadius: 'var(--radius-md)' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--gold-primary)' }}>Create Category</h3>
                <form onSubmit={handleCreateCategory}>
                  <div className="form-group">
                    <label className="form-label">Category Name</label>
                    <input type="text" className="form-control" required value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Icon Name</label>
                    <input type="text" className="form-control" value={newCategory.icon} onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }} disabled={submitting}>Create</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreateCategory(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== SETTINGS TAB ===== */}
      {activeTab === 'Settings' && settings && (
        <div className="animate-fade-in" style={{ maxWidth: '700px' }}>
          <form onSubmit={handleSaveSettings}>
            <div className="glass-panel" style={{ padding: '28px', marginBottom: '20px' }}>
              <h3 style={{ color: 'var(--gold-primary)', marginBottom: '20px', fontSize: '1.1rem' }}>Store Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { label: 'Store Name', key: 'storeName' },
                  { label: 'Contact Email', key: 'contactEmail' },
                  { label: 'Contact Phone', key: 'contactPhone' },
                  { label: 'Physical Address', key: 'physicalAddress' },
                  { label: 'Currency', key: 'currency' },
                  { label: 'Max Services in Cart', key: 'maxServicesInCart', type: 'number' }
                ].map(f => (
                  <div key={f.key} className="form-group">
                    <label className="form-label">{f.label}</label>
                    <input type={f.type || 'text'} className="form-control" value={settings[f.key] || ''}
                      onChange={(e) => setSettings({ ...settings, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })} />
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '28px', marginBottom: '20px' }}>
              <h3 style={{ color: 'var(--gold-primary)', marginBottom: '20px', fontSize: '1.1rem' }}>Access Controls</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <input type="checkbox" id="selfReg" checked={settings.allowSelfRegistration || false}
                  onChange={(e) => setSettings({ ...settings, allowSelfRegistration: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--gold-primary)' }} />
                <label htmlFor="selfReg" style={{ color: 'var(--text-primary)', fontSize: '0.95rem', cursor: 'pointer' }}>
                  Allow Customer Self-Registration
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px 28px' }} disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save All Settings'}
            </button>
          </form>
        </div>
      )}

      {/* ===== AUDIT LOGS TAB ===== */}
      {activeTab === 'Audit Logs' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {auditLogs.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>No audit log entries found.</p>
              </div>
            ) : auditLogs.map((log) => (
              <div key={log._id} className="glass-panel" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: 'var(--gold-light)', fontSize: '0.85rem' }}>
                    {log.actor?.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({log.actor?.role})</span>
                  </strong>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.88rem', marginTop: '2px' }}>{log.action}</p>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Entity: {log.entity_type}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== PROFILE TAB ===== */}
      {activeTab === 'Profile' && (
        <div className="animate-fade-in" style={{ maxWidth: '500px' }}>
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ color: 'var(--gold-primary)', marginBottom: '20px', fontSize: '1.1rem' }}>My Profile</h3>
            <form onSubmit={handleProfileUpdate}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  disabled={updatingProfile}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  disabled={updatingProfile}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  disabled={updatingProfile}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Profile Image</label>
                <input 
                  type="file" 
                  className="form-control" 
                  accept="image/*"
                  onChange={(e) => setProfileImage(e.target.files?.[0])}
                  disabled={updatingProfile}
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

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={updatingProfile}>
                {updatingProfile ? 'Updating...' : 'Save Profile'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
