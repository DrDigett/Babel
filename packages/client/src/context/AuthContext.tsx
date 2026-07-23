import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api } from '../api/client'
import type { User } from '@babel-plus/shared'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (patch: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.auth.me()
        .then(setUser)
        .catch(() => { setToken(null); localStorage.removeItem('token') })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password)
    localStorage.setItem('token', res.token)
    setToken(res.token)
    setUser(res.user)
  }

  const register = async (email: string, username: string, password: string) => {
    const res = await api.auth.register(email, username, password)
    localStorage.setItem('token', res.token)
    setToken(res.token)
    setUser(res.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...patch } : prev)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
