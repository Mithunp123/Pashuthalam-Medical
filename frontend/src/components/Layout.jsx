import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Layout.css'

export default function Layout() {
  const { shop, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout()
      navigate('/')
    }
  }

  const initials = shop?.shop_name
    ? shop.shop_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : 'MS'

  return (
    <div className="layout">
      {/* Desktop Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <NavLink to="/dashboard" className="nav-brand">
            <img src="/logo.png" alt="Pashuthalam Logo" className="brand-logo" />
            Pashuthalam
          </NavLink>

          <ul className="nav-menu">
            <li className="nav-item">
              <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <i className="fas fa-home"></i>
                Dashboard
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/search" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <i className="fas fa-search"></i>
                Search
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/my-claims" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <i className="fas fa-clipboard-list"></i>
                My Claims
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <i className="fas fa-user"></i>
                Profile
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <i className="fas fa-chart-bar"></i>
                Reports
              </NavLink>
            </li>
          </ul>

          <div className="nav-profile">
            <div className="profile-info">
              <div className="profile-name">{shop?.shop_name || 'Medical Shop'}</div>
              <div className="profile-role">Medical Shop</div>
            </div>
            <div className="profile-avatar">{initials}</div>
            <button className="logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-container">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        <div className="mobile-nav-items">
          <NavLink to="/dashboard" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <div className="mobile-nav-icon"><i className="fas fa-home"></i></div>
            <div className="mobile-nav-text">Dashboard</div>
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <div className="mobile-nav-icon"><i className="fas fa-search"></i></div>
            <div className="mobile-nav-text">Search</div>
          </NavLink>
          <NavLink to="/my-claims" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <div className="mobile-nav-icon"><i className="fas fa-clipboard-list"></i></div>
            <div className="mobile-nav-text">My Claims</div>
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <div className="mobile-nav-icon"><i className="fas fa-user"></i></div>
            <div className="mobile-nav-text">Profile</div>
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <div className="mobile-nav-icon"><i className="fas fa-chart-bar"></i></div>
            <div className="mobile-nav-text">Reports</div>
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
