import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Search from './pages/Search'
import MyClaims from './pages/MyClaims'
import Profile from './pages/Profile'
import Reports from './pages/Reports'

function ProtectedRoute({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { token } = useAuth()

  return (
    <Routes>
      <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/my-claims" element={<MyClaims />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
