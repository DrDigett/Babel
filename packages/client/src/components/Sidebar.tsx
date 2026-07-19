import { NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/dashboard', label: 'Inicio', icon: '01' },
  { to: '/graph', label: 'Grafo', icon: '02' },
  { to: '/data', label: 'Import/Export', icon: '03' },
]

export default function Sidebar() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const listId = searchParams.get('listId')
  const { user, logout } = useAuth()

  return (
    <nav className="sidebar" style={{
      width: 200,
      minWidth: 200,
      background: 'rgba(17, 17, 17, 0.9)',
      borderRight: '1px solid #2A2A2A',
      padding: '24px 0',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '0 20px 20px',
        borderBottom: '1px solid #2A2A2A',
        marginBottom: 16,
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: '#546E7A',
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          SYSTEM
        </div>
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 22,
          fontWeight: 800,
          color: '#CFD8DC',
          letterSpacing: -0.5,
        }}>
          BaBel+
        </div>
      </div>

      <ul style={{ listStyle: 'none', padding: '0 12px' }}>
        {links.map((link) => {
          const isActive = location.pathname === link.to ||
            (link.to !== '/' && location.pathname.startsWith(link.to))
          const to = listId ? `${link.to}?listId=${listId}` : link.to
          return (
            <li key={link.to} style={{ marginBottom: 4 }}>
              <NavLink
                to={to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  textDecoration: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: isActive ? '#CFD8DC' : '#555',
                  background: isActive ? 'rgba(84, 110, 122, 0.1)' : 'transparent',
                  border: isActive ? '1px solid #333' : '1px solid transparent',
                  letterSpacing: 0.5,
                  transition: 'all 0.1s',
                }}
              >
                <span style={{
                  color: isActive ? '#546E7A' : '#333',
                  fontSize: 10,
                  fontWeight: 700,
                }}>
                  {link.icon}
                </span>
                {link.label}
              </NavLink>
            </li>
          )
        })}
      </ul>

      <div style={{
        marginTop: 'auto',
        padding: '16px 20px',
        borderTop: '1px solid #2A2A2A',
      }}>
        {user && (
          <>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: '#CFD8DC',
              marginBottom: 8,
            }}>
              {user.username}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: '#546E7A',
              marginBottom: 12,
              wordBreak: 'break-all',
            }}>
              {user.email}
            </div>
            <button
              onClick={logout}
              style={{
                background: 'none',
                border: '1px solid #333',
                color: '#555',
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                padding: '4px 8px',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Salir
            </button>
          </>
        )}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: '#333',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginTop: 12,
        }}>
          V: 2.0.4 // ACTIVE
        </div>
      </div>
    </nav>
  )
}
