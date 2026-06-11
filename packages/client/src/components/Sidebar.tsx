import { NavLink, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Inicio', icon: '01' },
  { to: '/graph', label: 'Grafo', icon: '02' },
]

export default function Sidebar() {
  const location = useLocation()

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
          return (
            <li key={link.to} style={{ marginBottom: 4 }}>
              <NavLink
                to={link.to}
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
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: '#333',
        textTransform: 'uppercase',
        letterSpacing: 1,
      }}>
        V: 2.0.4 // ACTIVE
      </div>
    </nav>
  )
}
