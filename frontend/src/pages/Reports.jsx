import { useState, useEffect } from 'react'
import { Line, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { getStatistics, getClaimedRecommendations } from '../api/api'
import './Reports.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler)

export default function Reports() {
  const [stats, setStats] = useState({ total_claims: 0, todays_claims: 0, this_week_claims: 0, this_month_claims: 0 })
  const [claims, setClaims] = useState([])
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [statsData, claimsData] = await Promise.all([
        getStatistics(),
        getClaimedRecommendations({ per_page: 50 })
      ])
      setStats(statsData.statistics)
      setClaims(claimsData.recommendations || [])
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  // Generate trend data from claims
  const getTrendData = () => {
    const days = parseInt(dateRange)
    const labels = []
    const counts = []
    const now = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      labels.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }))
      counts.push(claims.filter(c => c.claimed_at?.startsWith(dateStr)).length)
    }

    return {
      labels,
      datasets: [{
        label: 'Claims',
        data: counts,
        borderColor: '#27ae60',
        backgroundColor: 'rgba(39, 174, 96, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: days > 30 ? 0 : 3
      }]
    }
  }

  const getStatusData = () => {
    let completed = 0, pending = 0, processing = 0
    claims.forEach(c => {
      if (!c.items?.length) { pending++; return }
      const allDone = c.items.every(i => i.end_date && new Date(i.end_date) < new Date())
      if (allDone) completed++
      else processing++
    })
    return {
      labels: ['Completed', 'Processing', 'Pending'],
      datasets: [{
        data: [completed, processing, pending],
        backgroundColor: ['#27ae60', '#3498db', '#f39c12'],
        borderWidth: 0
      }]
    }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'

  const exportCSV = () => {
    const header = 'Rec ID,Farmer,District,Claimed Date,Medicines\n'
    const rows = claims.map(c =>
      `${c.id},"${c.farmer_name || c.farmer?.name}","${c.district || c.farmer?.area}",${formatDate(c.claimed_at)},"${c.medicines?.map(m => m.medicine_name || m).join('; ')}"`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `claims_report_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="loading"><div className="spinner"></div> Loading reports...</div>

  return (
    <div className="reports-page">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Reports &amp; Analytics</h1>
        <p className="page-subtitle">Track your claims performance and trends</p>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <h3 className="filter-title"><i className="fas fa-filter"></i> Filter Options</h3>
        <div className="filter-grid">
          <div className="filter-group">
            <label className="filter-label">Date Range</label>
            <div className="date-buttons">
              {['7', '30', '90', '365'].map(d => (
                <button key={d} className={`btn-date ${dateRange === d ? 'active' : ''}`}
                  onClick={() => setDateRange(d)}>
                  {d === '7' ? '7 Days' : d === '30' ? '30 Days' : d === '90' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-header">
            <div>
              <div className="summary-title">Total Claims</div>
              <div className="summary-value">{stats.total_claims}</div>
              <div className="summary-desc">All time</div>
            </div>
            <div className="summary-icon"><i className="fas fa-file-medical"></i></div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-header">
            <div>
              <div className="summary-title">Today</div>
              <div className="summary-value">{stats.todays_claims}</div>
              <div className="summary-desc">Today&apos;s activity</div>
            </div>
            <div className="summary-icon"><i className="fas fa-calendar-day"></i></div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-header">
            <div>
              <div className="summary-title">This Week</div>
              <div className="summary-value">{stats.this_week_claims}</div>
              <div className="summary-desc">Last 7 days</div>
            </div>
            <div className="summary-icon"><i className="fas fa-calendar-week"></i></div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-header">
            <div>
              <div className="summary-title">This Month</div>
              <div className="summary-value">{stats.this_month_claims}</div>
              <div className="summary-desc">Last 30 days</div>
            </div>
            <div className="summary-icon"><i className="fas fa-chart-bar"></i></div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title"><i className="fas fa-chart-line"></i> Claims Trend</h3>
          </div>
          <div className="chart-body">
            <Line data={getTrendData()} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title"><i className="fas fa-chart-pie"></i> Claims by Status</h3>
          </div>
          <div className="chart-body">
            <Doughnut data={getStatusData()} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-section">
        <div className="table-header">
          <h3 className="table-title"><i className="fas fa-table"></i> Recent Claims</h3>
          <button className="export-btn" onClick={exportCSV}>
            <i className="fas fa-download"></i> Export CSV
          </button>
        </div>
        <div className="table-body">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rec ID</th>
                <th>Farmer</th>
                <th>District</th>
                <th>Date</th>
                <th>Medicines</th>
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 ? (
                <tr><td colSpan={5} className="empty-table">No claims data available</td></tr>
              ) : claims.slice(0, 10).map(c => (
                <tr key={c.id}>
                  <td><span className="table-id">#{c.id}</span></td>
                  <td>{c.farmer_name || c.farmer?.name}</td>
                  <td>{c.district || c.farmer?.area}</td>
                  <td>{formatDate(c.claimed_at)}</td>
                  <td>
                    <div className="table-meds">
                      {c.medicines?.slice(0, 2).map((m, i) => (
                        <span key={i} className="med-tag">{typeof m === 'string' ? m : m.medicine_name}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
