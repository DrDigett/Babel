import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const gridBackground = `
  linear-gradient(rgba(42,42,42,0.25) 1px, transparent 1px),
  linear-gradient(90deg, rgba(42,42,42,0.25) 1px, transparent 1px)
`

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showWelcome, setShowWelcome] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        navigate('/dashboard')
      } else {
        await register(email, username, password)
        setShowWelcome(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (showWelcome) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#080808',
        backgroundImage: gridBackground,
        backgroundSize: '40px 40px',
        fontFamily: "'JetBrains Mono', monospace",
        padding: 20,
      }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{
            fontSize: 10,
            color: '#546E7A',
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginBottom: 12,
            fontWeight: 700,
          }}>
            CUENTA CREADA
          </div>

          <h2 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 36,
            fontWeight: 800,
            color: '#CFD8DC',
            letterSpacing: -1,
            margin: '0 0 8px',
            lineHeight: 1,
          }}>
            Bienvenido, {username}
          </h2>

          <p style={{
            fontSize: 12,
            color: '#757575',
            marginBottom: 40,
            lineHeight: 1.6,
          }}>
            Tu ID es <span style={{ color: '#546E7A', fontWeight: 700 }}>{username}</span>.
            <br />
            Gracias por crear tu cuenta.
          </p>

          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '14px 48px',
              background: '#546E7A',
              border: '1px solid #546E7A',
              color: '#080808',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            ENTRAR
          </button>

          <div style={{
            marginTop: 48,
            fontSize: 10,
            color: '#333',
            letterSpacing: 1,
          }}>
            V: 2.0.4 // BaBel+
          </div>
        </div>
      </div>
    )
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: '#111111',
    border: '1px solid #333',
    color: '#E0E0E0',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 14,
    textAlign: 'center' as const,
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box' as const,
  }

  const isFormValid = mode === 'login'
    ? email.trim() && password.trim()
    : email.trim() && username.trim() && password.trim()

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#080808',
      backgroundImage: gridBackground,
      backgroundSize: '40px 40px',
      fontFamily: "'JetBrains Mono', monospace",
      padding: 20,
    }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{
          fontSize: 10,
          color: '#546E7A',
          letterSpacing: 3,
          textTransform: 'uppercase',
          marginBottom: 12,
          fontWeight: 700,
        }}>
          SYSTEM // GESTOR DE CONOCIMIENTO
        </div>

        <h1 style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 64,
          fontWeight: 800,
          color: '#CFD8DC',
          letterSpacing: -2,
          margin: '0 0 8px',
          lineHeight: 1,
        }}>
          BaBel+
        </h1>

        <p style={{
          fontSize: 12,
          color: '#757575',
          marginBottom: 40,
          lineHeight: 1.6,
        }}>
          Gestiona libros, películas, conceptos y sus conexiones.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
            disabled={loading}
            autoFocus
          />
          {mode === 'register' && (
            <input
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={inputStyle}
              disabled={loading}
            />
          )}
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(e) }}
            style={inputStyle}
            disabled={loading}
          />

          {error && (
            <div style={{
              fontSize: 11,
              color: '#b71c1c',
              padding: '10px 14px',
              border: '1px solid #b71c1c',
              background: 'rgba(183,28,28,0.08)',
              textAlign: 'left',
            }}>
              {'>'} ERROR: {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isFormValid}
            style={{
              padding: '14px 24px',
              background: !isFormValid ? '#1a1a1a' : '#546E7A',
              border: '1px solid #546E7A',
              color: !isFormValid ? '#555' : '#080808',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase',
              cursor: !isFormValid ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? '...' : mode === 'login' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
          </button>
        </form>

        <button
          onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
          style={{
            marginTop: 16,
            background: 'none',
            border: 'none',
            color: '#546E7A',
            cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
          }}
        >
          {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>

        <div style={{
          marginTop: 48,
          fontSize: 10,
          color: '#333',
          letterSpacing: 1,
        }}>
          V: 2.0.4 // BaBel+
        </div>
      </div>
    </div>
  )
}
