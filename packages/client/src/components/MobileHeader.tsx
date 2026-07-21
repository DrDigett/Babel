import { useState, useEffect } from 'react'
import { NavLink, useLocation, useSearchParams } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Inicio', icon: '01' },
  { to: '/graph', label: 'Grafo', icon: '02' },
  { to: '/profile', label: 'Perfil', icon: '03' },
  { to: '/data', label: 'Import/Export', icon: '04' },
]

export default function MobileHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const listId = searchParams.get('listId')

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <header className="mobile-header">
      <div className="mobile-header-bar">
        <div className="mobile-header-brand">
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
        <button
          className={`burger-btn${open ? ' open' : ''}`}
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      {open && (
        <nav className="mobile-nav-panel">
          {links.map((link) => {
            const isActive = location.pathname === link.to ||
              location.pathname.startsWith(link.to)
            const to = listId ? `${link.to}?listId=${listId}` : link.to
            return (
              <NavLink
                key={link.to}
                to={to}
                className={`mobile-nav-link${isActive ? ' active' : ''}`}
              >
                <span className="mobile-nav-icon">{link.icon}</span>
                {link.label}
              </NavLink>
            )
          })}
        </nav>
      )}
    </header>
  )
}