import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login as apiLogin, signup as apiSignup } from '../api/api'
import './Login.css'

export default function Login() {
  const [mode, setMode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { loginUser } = useAuth()
  const navigate = useNavigate()

  const [loginData, setLoginData] = useState({ mobile_no: '', password: '' })
  const [showLoginPass, setShowLoginPass] = useState(false)

  const [signupData, setSignupData] = useState({
    shop_name: '', owner_name: '', mobile_no: '', email: '',
    license_number: '', pincode: '', address: '', city: '', state: '',
    password: '', confirmPassword: ''
  })
  const [showSignupPass, setShowSignupPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await apiLogin(loginData.mobile_no, loginData.password)
      loginUser(res.token, res.shop)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (signupData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const { confirmPassword, ...data } = signupData
      await apiSignup(data)
      setSuccess('Registration successful! Please login.')
      setMode('login')
      setLoginData({ mobile_no: signupData.mobile_no, password: '' })
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Header */}
      <header className="header">
        <nav className="nav-container">
          <div className="logo">
            <img src="/logo.png" alt="Pashuthalam Logo" className="logo-svg" />
            <span>Pashuthalam</span>
          </div>
          <ul className="nav-links">
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#services">Services</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="mobile-hero-bg"></div>
        <div className="hero-content">
          <h1 className="hero-title">Get Quick Medical Services</h1>
          <p className="hero-subtitle">In today's fast-paced world, access to prompt and efficient medical services is of paramount importance. When faced with a medical emergency or seeking immediate medical attention, the ability to receive quick medical services can significantly impact the outcome of a situation.</p>
          <div className="cta-buttons">
            <button className="cta-button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
              <i className="fas fa-sign-in-alt"></i>
              <span>Login</span>
            </button>
            <button className="cta-button secondary" onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>
              <i className="fas fa-user-plus"></i>
              <span>Sign Up</span>
            </button>
          </div>
        </div>
        <div className="hero-image">
          <div className="floating-element"></div>
          <div className="floating-element"></div>
          <div className="floating-element"></div>
          <img src="/landing_Medicine.png" alt="Medical Professional" className="doctor-illustration" />
        </div>
      </section>

      {/* Login Modal */}
      {mode === 'login' && (
        <div className="modal" onClick={() => setMode(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setMode(null)}>&times;</button>
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to access your medical shop dashboard</p>
            </div>
            {error && <div className="message error">{error}</div>}
            {success && <div className="message success">{success}</div>}
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label><i className="fas fa-phone"></i> Mobile Number</label>
                <input type="tel" placeholder="Enter your mobile number" value={loginData.mobile_no}
                  onChange={e => setLoginData({ ...loginData, mobile_no: e.target.value })} required />
              </div>
              <div className="form-group">
                <label><i className="fas fa-lock"></i> Password</label>
                <div className="password-container">
                  <input type={showLoginPass ? 'text' : 'password'} placeholder="Enter your password" value={loginData.password}
                    onChange={e => setLoginData({ ...loginData, password: e.target.value })} required />
                  <button type="button" className="password-toggle" onClick={() => setShowLoginPass(!showLoginPass)}>
                    <i className={`fas fa-eye${showLoginPass ? '-slash' : ''}`}></i>
                  </button>
                </div>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <><span className="spinner-inline"></span> Signing In...</> : <><i className="fas fa-sign-in-alt"></i> Sign In to Dashboard</>}
              </button>
            </form>
            <div className="form-footer">
              <p>Don't have an account? <button className="link" onClick={() => { setMode('signup'); setError(''); }}>Create Account</button></p>
            </div>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {mode === 'signup' && (
        <div className="modal" onClick={() => setMode(null)}>
          <div className="modal-content signup-modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setMode(null)}>&times;</button>
            <div className="form-header">
              <h2>Create Account</h2>
              <p>Join thousands of medical shops using Pashuthalam</p>
            </div>
            {error && <div className="message error">{error}</div>}
            <form onSubmit={handleSignup} className="signup-form-scroll">
              <div className="form-group">
                <label><i className="fas fa-phone"></i> Mobile Number</label>
                <input type="tel" placeholder="Enter your mobile number" value={signupData.mobile_no}
                  onChange={e => setSignupData({ ...signupData, mobile_no: e.target.value })} required />
              </div>
              <div className="form-group">
                <label><i className="fas fa-envelope"></i> Business Email</label>
                <input type="email" placeholder="Enter your business email" value={signupData.email}
                  onChange={e => setSignupData({ ...signupData, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label><i className="fas fa-store"></i> Shop Name</label>
                <input type="text" placeholder="Enter your medical shop name" value={signupData.shop_name}
                  onChange={e => setSignupData({ ...signupData, shop_name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label><i className="fas fa-user"></i> Owner Name</label>
                <input type="text" placeholder="Enter owner's full name" value={signupData.owner_name}
                  onChange={e => setSignupData({ ...signupData, owner_name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label><i className="fas fa-id-card"></i> License Number</label>
                <input type="text" placeholder="Enter drug license number" value={signupData.license_number}
                  onChange={e => setSignupData({ ...signupData, license_number: e.target.value })} required />
              </div>
              <div className="form-group">
                <label><i className="fas fa-map-marker-alt"></i> Shop Address</label>
                <textarea placeholder="Enter complete shop address" value={signupData.address}
                  onChange={e => setSignupData({ ...signupData, address: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input type="text" placeholder="City" value={signupData.city}
                    onChange={e => setSignupData({ ...signupData, city: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input type="text" placeholder="State" value={signupData.state}
                    onChange={e => setSignupData({ ...signupData, state: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Pincode</label>
                <input type="text" placeholder="Pincode" value={signupData.pincode}
                  onChange={e => setSignupData({ ...signupData, pincode: e.target.value })} required />
              </div>
              <div className="form-group">
                <label><i className="fas fa-lock"></i> Password</label>
                <div className="password-container">
                  <input type={showSignupPass ? 'text' : 'password'} placeholder="Create a strong password" value={signupData.password}
                    onChange={e => setSignupData({ ...signupData, password: e.target.value })} required />
                  <button type="button" className="password-toggle" onClick={() => setShowSignupPass(!showSignupPass)}>
                    <i className={`fas fa-eye${showSignupPass ? '-slash' : ''}`}></i>
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label><i className="fas fa-check-circle"></i> Confirm Password</label>
                <div className="password-container">
                  <input type={showConfirmPass ? 'text' : 'password'} placeholder="Confirm your password" value={signupData.confirmPassword}
                    onChange={e => setSignupData({ ...signupData, confirmPassword: e.target.value })} required />
                  <button type="button" className="password-toggle" onClick={() => setShowConfirmPass(!showConfirmPass)}>
                    <i className={`fas fa-eye${showConfirmPass ? '-slash' : ''}`}></i>
                  </button>
                </div>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <><span className="spinner-inline"></span> Creating Account...</> : <><i className="fas fa-user-plus"></i> Create Account</>}
              </button>
            </form>
            <div className="form-footer">
              <p>Already have an account? <button className="link" onClick={() => { setMode('login'); setError(''); }}>Sign In</button></p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <a href="#home" className="mobile-nav-item active">
          <i className="fas fa-home"></i>
          <span>Home</span>
        </a>
        <a href="#services" className="mobile-nav-item">
          <i className="fas fa-capsules"></i>
          <span>Services</span>
        </a>
        <button className="mobile-nav-item login-btn" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
          <i className="fas fa-sign-in-alt"></i>
          <span>Login</span>
        </button>
        <a href="#about" className="mobile-nav-item">
          <i className="fas fa-info-circle"></i>
          <span>About</span>
        </a>
        <a href="#contact" className="mobile-nav-item">
          <i className="fas fa-phone-alt"></i>
          <span>Contact</span>
        </a>
      </nav>
    </div>
  )
}
