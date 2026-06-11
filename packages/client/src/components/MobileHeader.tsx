import { NavLink, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Inicio', icon: '01' },
  { to: '/graph', label: 'Grafo', icon: '02' },
]

export default function MobileHeader() {
  const location = useLocation()

  return (
    <header className="mobile-header">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #2A2A2A',
      }}>
        <div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: '#546E7A',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 2,
          }}>
            SYSTEM
          </div>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 20,
            fontWeight: 800,
            color: '#CFD8DC',
            letterSpacing: -0.5,
          }}>
            BaBel+
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {links.map((link) => {
            const isActive = location.pathname === link.to ||
              (link.to !== '/' && location.pathname.startsWith(link.to))
            return (
              <NavLink
                key={link.to}
                to={link.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  textDecoration: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: isActive ? '#CFD8DC' : '#555',
                  background: isActive ? 'rgba(84, 110, 122, 0.1)' : 'transparent',
                  border: isActive ? '1px solid #333' : '1px solid transparent',
                  letterSpacing: 0.5,
                  transition: 'all 0.1s',
                }}
              >
                <span style={{
                  color: isActive ? '#546E7A' : '#333',
                  fontSize: 9,
                  fontWeight: 700,
                }}>
                  {link.icon}
                </span>
                {link.label}
              </NavLink>
            )
          })}
        </div>
      </div>
    </header>
  )
}
