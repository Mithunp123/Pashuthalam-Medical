import { useState } from 'react'
import { searchRecommendations, claimRecommendation } from '../api/api'
import './Search.css'

export default function Search() {
  const [filters, setFilters] = useState({ pincode: '', disease: '', animal_type: '', medicine: '', status: '' })
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [claimModal, setClaimModal] = useState(null)
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split('T')[0])
  const [claimNotes, setClaimNotes] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setClaimSuccess('')
    try {
      const params = {}
      if (filters.pincode) params.pincode = filters.pincode
      if (filters.disease) params.disease = filters.disease
      if (filters.animal_type) params.animal_type = filters.animal_type
      if (filters.medicine) params.medicine = filters.medicine
      if (filters.status) params.is_claimed = filters.status
      const data = await searchRecommendations(params)
      setResults(data.recommendations || [])
      setSearched(true)
    } catch (err) {
      setError(err.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async () => {
    if (!claimModal || !claimDate) return
    setClaiming(true)
    try {
      const data = await claimRecommendation(claimModal.id, { start_date: claimDate, notes: claimNotes })
      setClaimSuccess(`Recommendation #${claimModal.id} claimed successfully!`)
      setResults(prev => prev.filter(r => r.id !== claimModal.id))
      setClaimModal(null)
      setClaimNotes('')
    } catch (err) {
      setError(err.message || 'Failed to claim')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="search-page">
      {/* Search Form Card */}
      <div className="search-card">
        <h2 className="search-card-title">
          <i className="fas fa-search"></i> Search Recommendations
        </h2>
        <form onSubmit={handleSearch}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Pincode</label>
              <input type="text" className="form-input" placeholder="e.g. 123456" value={filters.pincode}
                onChange={e => setFilters({ ...filters, pincode: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Disease</label>
              <input type="text" className="form-input" placeholder="e.g. Fever" value={filters.disease}
                onChange={e => setFilters({ ...filters, disease: e.target.value })} />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Animal Type</label>
              <select className="form-input" value={filters.animal_type}
                onChange={e => setFilters({ ...filters, animal_type: e.target.value })}>
                <option value="">All Animals</option>
                <option value="Cow">Cow</option>
                <option value="Buffalo">Buffalo</option>
                <option value="Goat">Goat</option>
                <option value="Sheep">Sheep</option>
                <option value="Pig">Pig</option>
                <option value="Chicken">Chicken</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Medicine Name</label>
              <input type="text" className="form-input" placeholder="e.g. Amoxicillin" value={filters.medicine}
                onChange={e => setFilters({ ...filters, medicine: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All</option>
              <option value="false">Available</option>
              <option value="true">Claimed</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            <i className="fas fa-search"></i> {loading ? 'Searching...' : 'Search Recommendations'}
          </button>
        </form>
      </div>

      {error && <div className="message error"><i className="fas fa-exclamation-circle"></i> {error}</div>}
      {claimSuccess && <div className="message success"><i className="fas fa-check-circle"></i> {claimSuccess}</div>}

      {/* Results */}
      {searched && (
        <div className="search-card">
          <h2 className="search-card-title">
            <i className="fas fa-clipboard-list"></i> Search Results
          </h2>

          {loading && <div className="loading-text"><i className="fas fa-search"></i> Searching recommendations...</div>}

          {!loading && results.length === 0 && (
            <div className="empty-text">No recommendations found matching your criteria</div>
          )}

          {!loading && results.length > 0 && (
            <>
              <p className="results-count"><strong>Found {results.length} recommendation(s)</strong></p>
              {results.map(rec => (
                <div key={rec.id} className="recommendation-card">
                  <div className="rec-top">
                    <div>
                      <h3>Recommendation #{rec.id}</h3>
                      <p><strong>Farmer:</strong> {rec.farmer?.name} ({rec.farmer?.mobile_no})</p>
                      <p><strong>Doctor:</strong> {rec.doctor?.name} — {rec.doctor?.hospital}</p>
                      <p><strong>Location:</strong> {rec.farmer?.area}, Pincode: {rec.farmer?.pincode}</p>
                    </div>
                    <span className={`status-badge ${rec.is_claimed ? 'status-claimed' : 'status-available'}`}>
                      {rec.is_claimed ? '❌ Claimed' : '✅ Available'}
                    </span>
                  </div>

                  {rec.items?.length > 0 && (
                    <>
                      <h4 className="medicine-heading"><i className="fas fa-pills"></i> Medicine Details</h4>
                      {rec.items.map((item, i) => (
                        <div key={i} className="medicine-item">
                          <p><strong>Medicine:</strong> {item.antibiotic_name}</p>
                          <p><strong>Disease:</strong> {item.disease}</p>
                          <p><strong>Animal:</strong> {item.animal_type} ({item.weight}kg, {item.age} days)</p>
                          <p><strong>Dosage:</strong> {item.single_dose_ml}ml × {item.daily_frequency}/day for {item.treatment_days} days</p>
                          <p><strong>Total Required:</strong> {item.total_treatment_dosage_ml}ml</p>
                        </div>
                      ))}
                    </>
                  )}

                  {rec.medicines?.length > 0 && !rec.items?.length && (
                    <div className="rec-meds">
                      {rec.medicines.map((m, i) => (
                        <span key={i} className="med-tag">{typeof m === 'string' ? m : m.name}</span>
                      ))}
                    </div>
                  )}

                  {rec.is_claimed && rec.claimed_by_shop && (
                    <div className="claimed-info">
                      <strong>Claimed by:</strong> {rec.claimed_by_shop.shop_name}<br />
                      <strong>Claimed on:</strong> {new Date(rec.claimed_at).toLocaleString()}
                    </div>
                  )}

                  {!rec.is_claimed && (
                    <div className="claim-action">
                      <button className="btn-primary" onClick={() => setClaimModal(rec)}>
                        <i className="fas fa-hand-holding-medical"></i> Claim This Recommendation
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Claim Modal */}
      {claimModal && (
        <div className="modal-overlay" onClick={() => setClaimModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Claim Recommendation</h3>
            <div className="form-group">
              <label className="form-label">Start Date:</label>
              <input type="date" className="form-input" value={claimDate}
                onChange={e => setClaimDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Notes (Optional):</label>
              <textarea className="form-input" value={claimNotes}
                onChange={e => setClaimNotes(e.target.value)} placeholder="Enter any notes..." rows={3} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setClaimModal(null)}>Cancel</button>
              <button className="btn-claim-confirm" onClick={handleClaim} disabled={claiming}>
                {claiming ? 'Claiming...' : 'Claim Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
