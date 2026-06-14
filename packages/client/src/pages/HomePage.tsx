import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function HomePage() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEnter = async () => {
    setError(null)
    const trimmed = value.trim()
    if (!trimmed) return
    if (!/^[a-z0-9]{4}$/i.test(trimmed)) {
      setError('El ID debe tener 4 caracteres alfanuméricos')
      return
    }
    try {
      const list = await api.lists.get(trimmed.toLowerCase())
      navigate(`/dashboard?listId=${list.id}`)
    } catch {
      setError(`No existe una lista con ID "${trimmed}"`)
    }
  }

  const handleCreate = async () => {
    setError(null)
    setLoading(true)
    try {
      const list = await api.lists.create({})
      navigate(`/dashboard?newListId=${list.id}&listId=${list.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear lista')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#080808',
      backgroundImage: `
        linear-gradient(rgba(42,42,42,0.25) 1px, transparent 1px),
        linear-gradient(90deg, rgba(42,42,42,0.25) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
      fontFamily: "'JetBrains Mono', monospace",
      padding: 20,
    }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
      }}>
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
          marginBottom: 48,
          lineHeight: 1.6,
        }}>
          Grafo de conocimiento personal. Gestiona libros, películas, conceptos y sus conexiones.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleEnter() }}
            placeholder="escribe un ID existente"
            style={{
              width: '100%',
              padding: '14px 16px',
              background: '#111111',
              border: '1px solid #333',
              color: '#E0E0E0',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              textAlign: 'center',
              outline: 'none',
              transition: 'border-color 0.15s',
              boxSizing: 'border-box',
            }}
            disabled={loading}
            autoFocus
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleEnter}
              disabled={loading || !value.trim()}
              style={{
                flex: 1,
                padding: '14px 24px',
                background: !value.trim() ? '#1a1a1a' : '#546E7A',
                border: '1px solid #546E7A',
                color: !value.trim() ? '#555' : '#080808',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: 'uppercase',
                cursor: !value.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: loading ? 0.5 : 1,
              }}
            >
              ENTER
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px 24px',
                background: 'transparent',
                border: '1px solid #333',
                color: '#E0E0E0',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? '...' : 'CREAR ID'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 16,
            fontSize: 11,
            color: '#b71c1c',
            padding: '10px 14px',
            border: '1px solid #b71c1c',
            background: 'rgba(183,28,28,0.08)',
          }}>
            {'>'} ERROR: {error}
          </div>
        )}

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