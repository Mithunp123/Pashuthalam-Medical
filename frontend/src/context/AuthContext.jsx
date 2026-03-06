import { createContext, useContext, useState, useEffect } from 'react'
import { verifyToken } from '../api/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      verifyToken()
        .then(data => {
          setShop({ id: data.shop_id, shop_name: data.shop_name })
          setLoading(false)
        })
        .catch(() => {
          localStorage.removeItem('token')
          setToken(null)
          setShop(null)
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [token])

  const loginUser = (tokenVal, shopData) => {
    localStorage.setItem('token', tokenVal)
    setToken(tokenVal)
    setShop(shopData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setShop(null)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ fontSize: '1.2rem', color: '#666' }}>Loading...</div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ token, shop, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
