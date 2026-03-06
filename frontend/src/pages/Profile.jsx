import { useState, useEffect } from 'react'
import { getProfile, updateProfile, getStatistics } from '../api/api'
import './Profile.css'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    Promise.all([loadProfile(), loadStats()])
  }, [])

  const loadProfile = async () => {
    try {
      const data = await getProfile()
      setProfile(data.shop)
      setFormData(data.shop)
    } catch (err) {
      console.error('Failed to load profile', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await getStatistics()
      setStats(data.statistics)
    } catch (err) { /* ignore */ }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await updateProfile({
        shop_name: formData.shop_name,
        owner_name: formData.owner_name,
        phone_number: formData.phone_number,
        email: formData.email,
        license_number: formData.license_number,
        district: formData.district,
        address: formData.address
      })
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setEditing(false)
      loadProfile()
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData(profile)
    setEditing(false)
    setMessage({ type: '', text: '' })
  }

  if (loading) return <div className="loading"><div className="spinner"></div> Loading profile...</div>
  if (!profile) return <div className="loading">Profile not found</div>

  const initial = profile.shop_name?.[0]?.toUpperCase() || 'S'
  const memberSince = profile.created_at ? new Date(profile.created_at).getFullYear() : 'N/A'

  return (
    <div className="profile-page">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your shop information and settings</p>
      </div>

      <div className="profile-layout">
        {/* Profile Card (Sidebar) */}
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar-large">{initial}</div>
            <div className="profile-name-large">{profile.shop_name}</div>
            <div className="profile-type">Medical Shop</div>
            <div className="profile-stats">
              <div className="stat-item">
                <div className="stat-value">{stats?.total_claims || 0}</div>
                <div className="stat-label">Total Claims</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{memberSince}</div>
                <div className="stat-label">Member Since</div>
              </div>
            </div>
          </div>
          <div className="profile-body">
            <div className="info-section">
              <h3 className="section-title">
                <i className="fas fa-store"></i> Shop Details
              </h3>
              <ul className="info-list">
                <li className="info-item">
                  <span className="info-label">Shop ID</span>
                  <span className="info-value">#{profile.id}</span>
                </li>
                <li className="info-item">
                  <span className="info-label">License</span>
                  <span className="info-value">{profile.license_number}</span>
                </li>
                <li className="info-item">
                  <span className="info-label">Status</span>
                  <span className="info-value">
                    <span className={`status-badge ${profile.is_verified ? 'verified' : 'unverified'}`}>
                      {profile.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </span>
                </li>
              </ul>
            </div>
            <div className="info-section">
              <h3 className="section-title">
                <i className="fas fa-map-marker-alt"></i> Location
              </h3>
              <ul className="info-list">
                <li className="info-item">
                  <span className="info-label">District</span>
                  <span className="info-value">{profile.district}</span>
                </li>
                <li className="info-item">
                  <span className="info-label">State</span>
                  <span className="info-value">{profile.state}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Profile Form Card */}
        <div className="profile-form-card">
          <div className="form-header">
            <h2 className="form-title">
              <i className="fas fa-user-edit"></i> Profile Information
            </h2>
            {!editing && (
              <button className="edit-toggle" onClick={() => setEditing(true)}>
                <i className="fas fa-pen"></i> Edit Profile
              </button>
            )}
          </div>

          <div className="form-body">
            {message.text && (
              <div className={`message ${message.type}`}>
                <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label required">Shop Name</label>
                  <input type="text" className="form-input" value={formData.shop_name || ''} disabled={!editing}
                    onChange={e => setFormData({ ...formData, shop_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Owner Name</label>
                  <input type="text" className="form-input" value={formData.owner_name || ''} disabled={!editing}
                    onChange={e => setFormData({ ...formData, owner_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Phone Number</label>
                  <input type="text" className="form-input" value={formData.phone_number || ''} disabled={!editing}
                    onChange={e => setFormData({ ...formData, phone_number: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={formData.email || ''} disabled={!editing}
                    onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">License Number</label>
                  <input type="text" className="form-input" value={formData.license_number || ''} disabled={!editing}
                    onChange={e => setFormData({ ...formData, license_number: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">District</label>
                  <input type="text" className="form-input" value={formData.district || ''} disabled={!editing}
                    onChange={e => setFormData({ ...formData, district: e.target.value })} />
              </div>
                <div className="form-group full-width">
                  <label className="form-label">Address</label>
                  <textarea className="form-input form-textarea" value={formData.address || ''} disabled={!editing} rows={3}
                    onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>
              </div>
              {editing && (
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                    <i className="fas fa-times"></i> Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <i className="fas fa-save"></i> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
