import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClaimedRecommendations } from '../api/api'
import './MyClaims.css'

export default function MyClaims() {
  const [claims, setClaims] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', fromDate: '', toDate: '', search: '' })
  const navigate = useNavigate()

  useEffect(() => { loadClaims() }, [])
  useEffect(() => { applyFilters() }, [claims, filters])

  const loadClaims = async () => {
    try {
      const data = await getClaimedRecommendations({ per_page: 100 })
      setClaims(data.recommendations || [])
    } catch (err) {
      console.error('Failed to load claims', err)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let result = [...claims]

    if (filters.status) {
      result = result.filter(c => {
        const s = getStatus(c)
        return s === filters.status
      })
    }

    if (filters.fromDate) {
      result = result.filter(c => c.claimed_at && new Date(c.claimed_at) >= new Date(filters.fromDate))
    }
    if (filters.toDate) {
      result = result.filter(c => c.claimed_at && new Date(c.claimed_at) <= new Date(filters.toDate + 'T23:59:59'))
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(c =>
        String(c.id).includes(q) ||
        (c.farmer_name || c.farmer?.name || '').toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }

  const formatDate = (d) => {
    if (!d) return 'N/A'
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const getStatus = (claim) => {
    if (!claim.items?.length) return 'pending'
    const allDone = claim.items.every(i => i.end_date && new Date(i.end_date) < new Date())
    return allDone ? 'completed' : 'processing'
  }

  const clearFilters = () => {
    setFilters({ status: '', fromDate: '', toDate: '', search: '' })
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading claims...
      </div>
    )
  }

  return (
    <div className="claims-page">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">My Claims</h1>
        <p className="page-subtitle">View and manage all your claimed recommendations</p>
      </div>

      {/* Filters */}
      <div className="controls">
        <div className="controls-header">
          <h2 className="controls-title">
            <i className="fas fa-filter"></i> Filter Claims
          </h2>
        </div>
        <div className="filter-row">
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select className="filter-input" value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">From Date</label>
            <input type="date" className="filter-input" value={filters.fromDate}
              onChange={e => setFilters({ ...filters, fromDate: e.target.value })} />
          </div>
          <div className="filter-group">
            <label className="filter-label">To Date</label>
            <input type="date" className="filter-input" value={filters.toDate}
              onChange={e => setFilters({ ...filters, toDate: e.target.value })} />
          </div>
          <div className="filter-group">
            <label className="filter-label">Search</label>
            <input type="text" className="filter-input" placeholder="Search by ID or farmer..."
              value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
          </div>
          <div className="filter-group">
            <label className="filter-label">&nbsp;</label>
            <div className="filter-buttons">
              <button className="filter-btn" onClick={() => applyFilters()}>
                <i className="fas fa-search"></i> Apply
              </button>
              <button className="filter-btn clear-btn" onClick={clearFilters}>
                <i className="fas fa-times"></i> Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Claims Container */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-clipboard-list"></i>
          <h3>No Claims Found</h3>
          <p>You haven't claimed any recommendations yet, or no claims match your filters.</p>
          <a href="#" className="empty-action" onClick={e => { e.preventDefault(); navigate('/search') }}>
            <i className="fas fa-search"></i> Search Recommendations
          </a>
        </div>
      ) : (
        <div className="claims-container">
          <div className="claims-header">
            <h2 className="claims-title">
              <i className="fas fa-clipboard-check"></i>
              Claimed Recommendations
              <span className="claims-count">{filtered.length} claims</span>
            </h2>
          </div>
          <div className="claims-grid">
            {filtered.map(claim => {
              const status = getStatus(claim)
              return (
                <div key={claim.id} className="claim-item">
                  <div className="claim-top">
                    <div>
                      <div className="claim-id">Recommendation #{claim.id}</div>
                      <div className="claim-date">
                        <i className="fas fa-calendar"></i> Claimed: {formatDate(claim.claimed_at)}
                      </div>
                    </div>
                    <span className={`claim-status ${status}`}>{status}</span>
                  </div>

                  <div className="claim-info">
                    <div className="info-item">
                      <span className="info-label"><i className="fas fa-user"></i> Farmer</span>
                      <span className="info-value">{claim.farmer_name || claim.farmer?.name}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label"><i className="fas fa-phone"></i> Phone</span>
                      <span className="info-value">{claim.farmer_phone || claim.farmer?.mobile_no || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label"><i className="fas fa-map-marker-alt"></i> District</span>
                      <span className="info-value">{claim.district || claim.farmer?.area || 'N/A'}</span>
                    </div>
                  </div>

                  {claim.medicines?.length > 0 && (
                    <div className="claim-medicines">
                      <div className="medicines-title">
                        <i className="fas fa-pills"></i> Medicines
                      </div>
                      <div className="medicine-list">
                        {claim.medicines.map((m, i) => (
                          <span key={i} className="medicine-tag">
                            {typeof m === 'string' ? m : m.medicine_name || m.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {claim.items?.length > 0 && (
                    <div className="claim-medicines">
                      <div className="medicines-title">
                        <i className="fas fa-syringe"></i> Treatment Details
                      </div>
                      {claim.items.map((item, i) => (
                        <div key={i} className="treatment-row">
                          <span className="medicine-tag">{item.antibiotic_name}</span>
                          <span className="treatment-detail">{item.single_dose_ml}ml × {item.daily_frequency}/day · {item.treatment_days} days</span>
                          {item.start_date && (
                            <span className="treatment-dates">{formatDate(item.start_date)} → {formatDate(item.end_date)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
