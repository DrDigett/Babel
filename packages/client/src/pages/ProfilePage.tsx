import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import type { Node as BabelNode } from '@babel-plus/shared'

const TYPE_COLORS: Record<string, string> = {
  libro: '#4a90d9', pelicula: '#50c878', articulo: '#4a90d9',
  video: '#9b59b6', curso: '#9b59b6', videojuego: '#e67e22',
}

interface SearchUser { id: string; username: string; profilePhotoUrl: string | null; createdAt: string }

export default function ProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const isOwn = !id || id === user?.id

  const [nodes, setNodes] = useState<BabelNode[]>([])
  const [relations, setRelations] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const photoUrl = isOwn ? (user?.profilePhotoUrl ?? '') : (profile?.profilePhotoUrl ?? '')
  const [photoInput, setPhotoInput] = useState(photoUrl)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [showAllTerminated, setShowAllTerminated] = useState(false)
  const [showAllPending, setShowAllPending] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOwn) {
      Promise.all([api.nodes.list(), api.relations.list()])
        .then(([n, r]) => { setNodes(n); setRelations(r) })
        .catch(() => {})
    } else if (id) {
      api.auth.getProfile(id).then(setProfile).catch(() => setProfile(null))
    }
  }, [id, isOwn, user?.id])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearching(true)
      api.auth.searchUsers(searchQuery.trim())
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchResults([])
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const displayName = isOwn ? user?.username : profile?.username
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '??'
  const memberDate = (isOwn ? user?.createdAt : profile?.createdAt)
    ? new Date(isOwn ? user!.createdAt : profile.createdAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const userNodes = isOwn ? nodes : (profile?.terminated ?? []).concat(profile?.topRated ?? [])
  const terminated = isOwn
    ? nodes.filter((n) => n.status === 'terminado').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    : (profile?.terminated ?? [])
  const topRated = isOwn
    ? [...nodes].filter((n) => n.rating != null).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 4)
    : (profile?.topRated ?? [])

  const pending = isOwn
    ? nodes.filter((n) => n.status === 'pendiente').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : []
  const recentPending = showAllPending ? pending : pending.slice(0, 6)

  const nodeCount = isOwn ? nodes.length : (profile?.nodeCount ?? 0)
  const relCount = isOwn ? relations.length : (profile?.relationCount ?? 0)
  const termCount = isOwn ? terminated.length : (profile?.terminatedCount ?? 0)

  async function savePhoto() {
    setSaving(true)
    try {
      const res = await api.auth.updateProfilePhoto(photoInput || null)
      if (isOwn) updateUser({ profilePhotoUrl: res.profilePhotoUrl })
      setMsg('Foto actualizada')
    } catch (e) { setMsg(`Error: ${e instanceof Error ? e.message : 'desconocido'}`) }
    setSaving(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    if (newPassword !== confirmPassword) { setMsg('Error: Las contraseñas no coinciden'); return }
    if (newPassword.length < 8) { setMsg('Error: Mínimo 8 caracteres'); return }
    setSaving(true)
    try {
      await api.auth.updatePassword(currentPassword, newPassword)
      setMsg('Contraseña actualizada')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (e) { setMsg(`Error: ${e instanceof Error ? e.message : 'desconocido'}`) }
    setSaving(false)
  }

  const avatar = photoUrl ? (
    <img src={photoUrl} alt="avatar" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%', border: '1px solid #333' }} />
  ) : null

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#111', border: '1px solid #333', color: '#E0E0E0',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13, padding: '10px 12px',
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#757575',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block',
  }

  function renderNodeRow(n: { id: string; title: string; type: string; rating?: number | null }) {
    return (
      <div key={n.id} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
        borderBottom: '1px solid #2A2A2A', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, cursor: 'pointer',
      }}
        onClick={() => navigate(`/node/${n.id}`)}
      >
        {n.rating != null && (
          <span style={{ color: '#f9a825', fontSize: 11, fontWeight: 700, minWidth: 20, textAlign: 'right' }}>
            {n.rating}
          </span>
        )}
        <span style={{ color: TYPE_COLORS[n.type] ?? '#757575', fontSize: 9, fontWeight: 700, minWidth: 20 }}>
          {n.type.slice(0, 3).toUpperCase()}
        </span>
        <span style={{ color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {n.title}
        </span>
      </div>
    )
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'ahora'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d`
    const months = Math.floor(days / 30)
    return `${months}mes`
  }

  const recentTerminated = showAllTerminated ? terminated : terminated.slice(0, 5)

  return (
    <div>
      {showPhotoModal && photoUrl && (
        <div onClick={() => setShowPhotoModal(false)} style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <button onClick={() => setShowPhotoModal(false)} style={{
            position: 'absolute', top: 16, right: 20, background: 'none',
            border: 'none', color: '#757575', cursor: 'pointer', fontSize: 24, zIndex: 1,
          }}>×</button>
          <img
            src={photoUrl}
            alt="foto de perfil"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', border: '1px solid #333' }}
          />
        </div>
      )}

      {!isOwn && (
        <div className="card" style={{ position: 'relative', padding: '16px 25px', marginBottom: 16 }}>
          <div className="card-label">00 // VOLVER</div>
          <button className="btn" onClick={() => navigate('/profile')} style={{ fontSize: 11 }}>
            {'<'} Volver a mi perfil
          </button>
        </div>
      )}

      <div className="card" style={{ position: 'relative' }}>
        <div className="card-label">01 // USER_DATA</div>
        <h2>{isOwn ? 'Mi perfil' : 'Perfil'}</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, minWidth: 0 }}>
            <div
              style={{
                width: 80, height: 80, minWidth: 80, background: '#111', border: '1px solid #333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 800,
                color: '#546E7A', borderRadius: '50%', overflow: 'hidden',
                cursor: photoUrl ? 'pointer' : 'default',
              }}
              onClick={() => photoUrl && setShowPhotoModal(true)}
            >
              {avatar || initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 800, color: '#CFD8DC', marginBottom: 4 }}>
                {displayName}
              </div>
              {isOwn && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#757575', marginBottom: 4 }}>
                  {user?.email}
                </div>
              )}
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#546E7A' }}>
                Miembro desde {memberDate}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { label: 'Nodos', value: nodeCount },
              { label: 'Relaciones', value: relCount },
              { label: 'Terminados', value: termCount },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800, color: '#546E7A' }}>
                  {s.value}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#757575', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isOwn && (
        <div className="card" style={{ position: 'relative' }} ref={searchRef}>
          <div className="card-label">02 // BUSCAR</div>
          <h2>Buscar perfiles</h2>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por username..."
            style={{ ...inputStyle, marginTop: 12 }}
          />
          {searchResults.length > 0 && (
            <div style={{ marginTop: 8, border: '1px solid #2A2A2A', background: '#111' }}>
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  onClick={() => { navigate(`/profile/${u.id}`); setSearchQuery(''); setSearchResults([]) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderBottom: '1px solid #2A2A2A', cursor: 'pointer',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(84,110,122,0.08)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <div style={{
                    width: 28, height: 28, background: '#1a1a1a', border: '1px solid #333',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                    fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 800, color: '#546E7A', minWidth: 28,
                    overflow: 'hidden',
                  }}>
                    {u.profilePhotoUrl
                      ? <img src={u.profilePhotoUrl} alt="" style={{ width: 28, height: 28, objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : u.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ color: '#E0E0E0' }}>{u.username}</span>
                </div>
              ))}
            </div>
          )}
          {searching && (
            <div style={{ marginTop: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#555' }}>
              {'>'} Buscando...
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ position: 'relative' }}>
        <div className="card-label">{isOwn ? '03' : '02'} // RANKING</div>
        <h2>Top Rating</h2>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {topRated.length === 0 && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#555' }}>Sin calificaciones</div>
          )}

          {topRated[0] && (
            <div
              key={topRated[0].id}
              onClick={() => navigate(`/node/${topRated[0].id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                background: 'linear-gradient(135deg, rgba(249,168,37,0.06) 0%, rgba(249,168,37,0.02) 100%)',
                border: '1px solid rgba(249,168,37,0.25)',
                borderBottom: 'none', cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'linear-gradient(135deg, rgba(249,168,37,0.10) 0%, rgba(249,168,37,0.04) 100%)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'linear-gradient(135deg, rgba(249,168,37,0.06) 0%, rgba(249,168,37,0.02) 100%)' }}
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: '#f9a825', letterSpacing: 1, minWidth: 20 }}>
                #1
              </div>
              <div style={{
                fontFamily: "'Inter', sans-serif", fontSize: 32, fontWeight: 800, color: '#f9a825',
                minWidth: 44, textAlign: 'center', lineHeight: 1,
              }}>
                {topRated[0].rating}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, color: '#CFD8DC',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {topRated[0].title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                    color: TYPE_COLORS[topRated[0].type] ?? '#757575', letterSpacing: 0.5,
                  }}>
                    {topRated[0].type.toUpperCase()}
                  </span>
                </div>
              </div>
              <div style={{
                width: 60, height: 4, background: 'rgba(249,168,37,0.12)', borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  width: `${((topRated[0].rating ?? 0) / 5) * 100}%`, height: '100%',
                  background: 'linear-gradient(90deg, #f9a825, #ffca28)', borderRadius: 2,
                }} />
              </div>
            </div>
          )}

          {topRated.slice(1).map((n: { id: string; title: string; type: string; rating?: number | null }, i: number) => {
            const rank = i + 2
            return (
              <div
                key={n.id}
                onClick={() => navigate(`/node/${n.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '10px 20px',
                  background: 'rgba(17,17,17,0.5)',
                  border: '1px solid #2A2A2A',
                  borderTop: rank === 2 ? '1px solid #2A2A2A' : 'none',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(84,110,122,0.08)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(17,17,17,0.5)' }}
              >
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: '#546E7A',
                  minWidth: 28, textAlign: 'center',
                }}>
                  0{rank}
                </div>
                <div style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 800, color: '#f9a825',
                  minWidth: 32, textAlign: 'center', lineHeight: 1, opacity: 0.7 + (0.3 * (1 - i * 0.3)),
                }}>
                  {n.rating}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#E0E0E0',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {n.title}
                  </div>
                </div>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                  color: TYPE_COLORS[n.type] ?? '#757575', letterSpacing: 0.5,
                }}>
                  {n.type.slice(0, 3).toUpperCase()}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {recentTerminated.length > 0 && (
        <div className="card" style={{ position: 'relative' }}>
          <div className="card-label">{isOwn ? '04' : '03'} // RECIENTES</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2>Recién terminados</h2>
            {terminated.length > 5 && (
              <button
                className="btn"
                onClick={() => setShowAllTerminated(!showAllTerminated)}
                style={{ fontSize: 10, padding: '4px 10px' }}
              >
                {showAllTerminated ? 'Ver menos' : `Ver todos (${terminated.length})`}
              </button>
            )}
          </div>
          <div style={showAllTerminated ? {
            display: 'flex', gap: 12, marginTop: 14,
            overflowX: 'auto', paddingBottom: 4,
          } : {
            display: 'grid',
            gap: 12, marginTop: 14,
          }}
            className={showAllTerminated ? 'recent-scroll' : 'recent-grid'}
          >
            {recentTerminated.map((n: { id: string; title: string; type: string; updatedAt: string }) => (
              <div
                key={n.id}
                onClick={() => navigate(`/node/${n.id}`)}
                style={{
                  minWidth: showAllTerminated ? 180 : undefined,
                  flex: showAllTerminated ? '0 0 auto' : undefined,
                  background: 'rgba(17,17,17,0.6)', border: '1px solid #2A2A2A',
                  padding: '12px 14px', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#546E7A' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#2A2A2A' }}
              >
                <div style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#E0E0E0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8,
                }}>
                  {n.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                    color: TYPE_COLORS[n.type] ?? '#757575', letterSpacing: 0.5,
                  }}>
                    {n.type.slice(0, 3).toUpperCase()}
                  </span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#546E7A',
                  }}>
                    {timeAgo(n.updatedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOwn && pending.length > 0 && (
        <div className="card" style={{ position: 'relative' }}>
          <div className="card-label">05 // PENDIENTES</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2>Cola de pendientes</h2>
            {pending.length > 6 && (
              <button
                className="btn"
                onClick={() => setShowAllPending(!showAllPending)}
                style={{ fontSize: 10, padding: '4px 10px' }}
              >
                {showAllPending ? 'Ver menos' : `Ver todos (${pending.length})`}
              </button>
            )}
          </div>
          <div style={showAllPending ? {
            display: 'flex', gap: 12, marginTop: 14,
            overflowX: 'auto', paddingBottom: 4,
          } : {
            display: 'grid',
            gap: 12, marginTop: 14,
          }}
            className={showAllPending ? 'recent-scroll' : 'recent-grid'}
          >
            {recentPending.map((n: { id: string; title: string; type: string; createdAt: string }) => (
              <div
                key={n.id}
                onClick={() => navigate(`/node/${n.id}`)}
                style={{
                  minWidth: showAllPending ? 180 : undefined,
                  flex: showAllPending ? '0 0 auto' : undefined,
                  background: 'rgba(17,17,17,0.6)',
                  border: '1px solid #2A2A2A',
                  borderLeft: `3px solid ${TYPE_COLORS[n.type] ?? '#757575'}`,
                  padding: '12px 14px', cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#546E7A' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#2A2A2A' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="pending-dot" />
                  <span style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#E0E0E0',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {n.title}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                    color: TYPE_COLORS[n.type] ?? '#757575', letterSpacing: 0.5,
                  }}>
                    {n.type.slice(0, 3).toUpperCase()}
                  </span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#546E7A',
                  }}>
                    hace {timeAgo(n.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOwn && (
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setShowModal(true)} style={{ fontSize: 11 }}>Editar perfil</button>
          <button className="btn btn-danger" onClick={logout} style={{ fontSize: 11 }}>Cerrar sesión</button>
        </div>
      )}

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: 'relative', background: '#111', border: '1px solid #333',
            padding: '40px 48px', maxWidth: 440, width: '90%',
          }}>
            <div className="corner-mark tl" /><div className="corner-mark tr" />
            <div className="corner-mark bl" /><div className="corner-mark br" />
            <button onClick={() => setShowModal(false)} style={{
              position: 'absolute', top: 12, right: 16, background: 'none',
              border: 'none', color: '#555', cursor: 'pointer', fontSize: 18,
            }}>×</button>

            <div className="card-label" style={{ top: -10, left: 20 }}>04 // EDITAR</div>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 600, color: '#E0E0E0', marginBottom: 24 }}>Editar perfil</h2>

            <div style={{ marginBottom: 24 }}>
              <span style={labelStyle}>Foto de perfil (URL)</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {photoUrl && (
                  <img src={photoUrl} alt="preview" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '50%', border: '1px solid #333' }} />
                )}
                <input type="text" value={photoInput} onChange={(e) => setPhotoInput(e.target.value)}
                  placeholder="https://ejemplo.com/foto.jpg" style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
                <button className="btn" onClick={savePhoto} style={{ fontSize: 11, whiteSpace: 'nowrap' }}>Guardar</button>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} style={{ display: 'grid', gap: 12 }}>
              <span style={labelStyle}>Cambiar contraseña</span>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Contraseña actual" style={inputStyle} required />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nueva contraseña" style={inputStyle} required />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar contraseña" style={inputStyle} required />
              <div>
                <button className="btn btn-primary" type="submit" disabled={saving} style={{ fontSize: 11 }}>
                  {saving ? 'Guardando...' : 'Actualizar contraseña'}
                </button>
              </div>
            </form>

            {msg && (
              <div style={{ marginTop: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: msg.startsWith('Error') ? '#b71c1c' : '#66bb6a' }}>
                {'>'} {msg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
