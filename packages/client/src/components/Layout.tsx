import type { ReactNode } from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        padding: '32px 40px',
        minWidth: 0,
        position: 'relative',
      }}>
        {/* Corner marks */}
        <div className="corner-mark tl" />
        <div className="corner-mark tr" />
        <div className="corner-mark bl" style={{ bottom: 'auto', top: 8 }} />
        <div className="corner-mark br" style={{ bottom: 'auto', top: 8 }} />
        {children}
      </main>
    </div>
  )
}
