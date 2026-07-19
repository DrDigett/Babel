import { useNavigate } from 'react-router-dom'

const gridBackground = `
  linear-gradient(rgba(42,42,42,0.25) 1px, transparent 1px),
  linear-gradient(90deg, rgba(42,42,42,0.25) 1px, transparent 1px)
`

export default function NotFoundPage() {
  const navigate = useNavigate()

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
          SYSTEM // ERROR
        </div>

        <h1 style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 96,
          fontWeight: 800,
          color: '#CFD8DC',
          letterSpacing: -2,
          margin: '0 0 8px',
          lineHeight: 1,
        }}>
          404
        </h1>

        <p style={{
          fontSize: 12,
          color: '#757575',
          marginBottom: 48,
          lineHeight: 1.6,
        }}>
          La ruta que buscás no existe en este grafo.
        </p>

        <button
          onClick={() => navigate(-1)}
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
          VOLVER
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
