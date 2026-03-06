import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStatistics, getClaimedRecommendations, getRecommendation, claimRecommendation } from '../api/api'
import './Dashboard.css'

export default function Dashboard() {
  const [stats, setStats] = useState({ total_claims: 0, todays_claims: 0 })
  const [recentActivity, setRecentActivity] = useState([])
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searchError, setSearchError] = useState('')
  const [searching, setSearching] = useState(false)
  const [claimModal, setClaimModal] = useState(null)
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split('T')[0])
  const [claimNotes, setClaimNotes] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadStats()
    loadRecentActivity()
  }, [])

  const loadStats = async () => {
    try {
      const data = await getStatistics()
      setStats(data.statistics)
    } catch (err) { console.error('Failed to load stats', err) }
  }

  const loadRecentActivity = async () => {
    try {
      const data = await getClaimedRecommendations({ per_page: 5 })
      setRecentActivity(data.recommendations || [])
    } catch (err) { console.error('Failed to load activity', err) }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchId.trim()) return
    setSearchError('')
    setSearchResult(null)
    setSearching(true)
    setClaimSuccess('')
    try {
      const data = await getRecommendation(searchId.trim())
      setSearchResult(data.recommendation)
    } catch (err) {
      setSearchError(err.message || 'Recommendation not found')
    } finally {
      setSearching(false)
    }
  }

  const handleClaim = async () => {
    if (!claimModal || !claimDate) return
    setClaiming(true)
    try {
      const data = await claimRecommendation(claimModal.id, { start_date: claimDate, notes: claimNotes })
      setClaimSuccess(`Claimed successfully! ${data.whatsapp_sent ? 'WhatsApp sent to farmer.' : ''}`)
      setClaimModal(null)
      setSearchResult(null)
      setClaimNotes('')
      loadStats()
      loadRecentActivity()
    } catch (err) {
      setSearchError(err.message || 'Failed to claim')
    } finally {
      setClaiming(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="dashboard">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here's what's happening with your medical shop today.</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Total Claims</div>
            <div className="stat-icon claims">
              <i className="fas fa-clipboard-check"></i>
            </div>
          </div>
          <div className="stat-value">{stats.total_claims}</div>
          <div className="stat-change neutral">
            <i className="fas fa-history"></i> All time
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Today's Claims</div>
            <div className="stat-icon completed">
              <i className="fas fa-calendar-day"></i>
            </div>
          </div>
          <div className="stat-value">{stats.todays_claims}</div>
          <div className="stat-change positive">
            <i className="fas fa-check-circle"></i> Today
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Quick Search */}
        <div className="search-card">
          <div className="card-header">
            <h2 className="card-title">
              <i className="fas fa-search"></i> Quick Search Recommendation
            </h2>
          </div>
          <div className="card-body">
            <form className="search-form" onSubmit={handleSearch}>
              <div className="search-input-group">
                <input type="number" className="search-input" placeholder="Enter Recommendation ID (e.g. 123)"
                  value={searchId} onChange={e => setSearchId(e.target.value)} min="1" required />
                <button type="submit" className="search-btn" disabled={searching}>
                  <i className="fas fa-search"></i>
                  <span>{searching ? 'Searching...' : 'Search & View'}</span>
                </button>
              </div>
            </form>

            {searchError && <div className="error-message">{searchError}</div>}
            {claimSuccess && <div className="success-message">{claimSuccess}</div>}

            {searchResult && (
              <div className="search-result">
                {!searchResult.is_claimed ? (
                  <div className="recommendation-details">
                    <h4><i className="fas fa-clipboard-check"></i> Recommendation #{searchResult.id}</h4>
                    <div className="detail-row">
                      <span className="detail-label">Farmer</span>
                      <span className="detail-value">{searchResult.farmer?.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Phone</span>
                      <span className="detail-value">{searchResult.farmer?.mobile_no}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Area</span>
                      <span className="detail-value">{searchResult.farmer?.area} ({searchResult.farmer?.pincode})</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Doctor</span>
                      <span className="detail-value">{searchResult.doctor?.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Hospital</span>
                      <span className="detail-value">{searchResult.doctor?.hospital}</span>
                    </div>
                    {searchResult.medicines?.length > 0 && (
                      <div className="medicine-list">
                        <h5><i className="fas fa-pills"></i> Medicines</h5>
                        {searchResult.medicines.map((med, i) => (
                          <div key={i} className="medicine-item">
                            <strong>{med.name}</strong> — {med.dosage} · {med.duration}
                          </div>
                        ))}
                      </div>
                    )}
                    <button className="claim-btn" onClick={() => setClaimModal(searchResult)}>
                      <i className="fas fa-hand-holding-medical"></i>
                      <span>Claim This Recommendation</span>
                    </button>
                  </div>
                ) : (
                  <div className="already-claimed">
                    <h4><i className="fas fa-exclamation-triangle"></i> Already Claimed</h4>
                    <div className="detail-row">
                      <span className="detail-label">Claimed By</span>
                      <span className="detail-value">{searchResult.claimed_by_shop?.shop_name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Claimed Date</span>
                      <span className="detail-value">{formatDate(searchResult.claimed_at)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Recent Activity + Quick Actions */}
        <div className="sidebar-content">
          {/* Recent Activity */}
          <div className="activity-card">
            <div className="card-header">
              <h2 className="card-title">
                <i className="fas fa-history"></i> Recent Activity
              </h2>
            </div>
            <div className="card-body">
              {recentActivity.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-inbox"></i>
                  <h3>No Activity</h3>
                  <p>No recent claims yet</p>
                </div>
              ) : (
                recentActivity.map(rec => (
                  <div key={rec.id} className="activity-item">
                    <div className="activity-icon">
                      <i className="fas fa-clipboard-check"></i>
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">Recommendation #{rec.id}</div>
                      <div className="activity-desc">{rec.farmer_name || rec.farmer?.name}</div>
                      <div className="activity-time">{formatDate(rec.claimed_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <div className="card-header">
              <h2 className="card-title">
                <i className="fas fa-bolt"></i> Quick Actions
              </h2>
            </div>
            <a href="#" className="action-button" onClick={e => { e.preventDefault(); navigate('/my-claims') }}>
              <div className="action-icon">
                <i className="fas fa-clipboard-list"></i>
              </div>
              <div className="action-content">
                <h4>View My Claims</h4>
                <p>Check your claimed recommendations</p>
              </div>
            </a>
            <a href="#" className="action-button" onClick={e => { e.preventDefault(); navigate('/profile') }}>
              <div className="action-icon">
                <i className="fas fa-user-edit"></i>
              </div>
              <div className="action-content">
                <h4>Update Profile</h4>
                <p>Manage your shop information</p>
              </div>
            </a>
            <a href="#" className="action-button" onClick={e => { e.preventDefault(); navigate('/reports') }}>
              <div className="action-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="action-content">
                <h4>View Reports</h4>
                <p>Analytics and insights</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Claim Modal */}
      {claimModal && (
        <div className="modal-overlay" onClick={() => setClaimModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <i className="fas fa-calendar-plus"></i> Set Treatment Start Date
              </h3>
              <button className="modal-close" onClick={() => setClaimModal(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Treatment Start Date</label>
                <input type="date" className="search-input" value={claimDate}
                  onChange={e => setClaimDate(e.target.value)} required />
                <p className="form-hint">
                  <i className="fas fa-info-circle"></i> Select the date when the farmer should start the treatment
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea className="search-input" value={claimNotes}
                  onChange={e => setClaimNotes(e.target.value)} placeholder="Enter any notes..." rows={3} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-secondary" onClick={() => setClaimModal(null)}>Cancel</button>
              <button className="modal-btn modal-btn-primary" onClick={handleClaim} disabled={claiming}>
                <i className="fas fa-check"></i> {claiming ? 'Processing...' : 'Confirm Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
