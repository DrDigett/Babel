import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { RELATION_TYPE_WEIGHTS, MIN_RELATION_WEIGHT } from '@babel-plus/shared'
import type { Node, Relation, RelationType } from '@babel-plus/shared'

const EDGE_LABELS: Record<string, string> = {
  es_autor_de: 'es_autor_de',
  dirigio: 'dirigio',
  trata_sobre: 'trata_sobre',
  pertenece_a: 'pertenece_a',
  influyo_a: 'influyo_a',
  critica_a: 'critica_a',
  inspiro: 'inspiro',
  ocurre_en: 'ocurre_en',
  similar_a: 'similar_a',
}

const RELATION_TYPES: RelationType[] = [
  'es_autor_de', 'dirigio', 'trata_sobre', 'pertenece_a',
  'influyo_a', 'critica_a', 'inspiro', 'ocurre_en', 'similar_a',
]

export default function NodeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listId = searchParams.get('listId')
  const [node, setNode] = useState<Node | null>(null)
  const [relations, setRelations] = useState<(Relation & { targetTitle?: string })[]>([])
  const [relatedNodes, setRelatedNodes] = useState<Node[]>([])
  const [incomingRelations, setIncomingRelations] = useState<(Relation & { sourceTitle?: string })[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editYear, setEditYear] = useState('')
  const [reevaluating, setReevaluating] = useState(false)
  const [researchUrl, setResearchUrl] = useState('')
  const [researching, setResearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Node[]>([])
  const [selectedTarget, setSelectedTarget] = useState<Node | null>(null)
  const [relType, setRelType] = useState<RelationType>('similar_a')
  const [adding, setAdding] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [allNodes, setAllNodes] = useState<Node[]>([])
  const [showPosDropdown, setShowPosDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const posDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!node || listId) return
    setRating(node.rating)
  }, [node, listId])

  useEffect(() => {
    if (!id) return
    loadNode()
  }, [id, listId])

  useEffect(() => {
    if (!showPosDropdown) return
    const handler = (e: MouseEvent) => {
      if (posDropdownRef.current && !posDropdownRef.current.contains(e.target as Node)) {
        setShowPosDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPosDropdown])

  async function loadNode() {
    if (!id) return
    const n = await api.nodes.get(id)
    setNode(n)

    let listIdSet: Set<string> | null = null
    if (listId) {
      try {
        const list = await api.lists.get(listId)
        listIdSet = new Set((list.nodes ?? []).map((x: any) => x.id))
        setAllNodes(list.nodes ?? [])
        const current = (list.nodes ?? []).find((x: any) => x.id === id)
        if (current?.listRating !== undefined && current?.listRating !== null) {
          setRating(current.listRating)
        }
      } catch { listIdSet = null }
    } else {
      setAllNodes(await api.nodes.list())
    }

    const [outgoing, incoming] = await Promise.all([
      api.relations.list(`sourceId=${id}`),
      api.relations.list(`targetId=${id}`),
    ])

    const weightFilter = (r: Relation) => (r.weight ?? 1) >= MIN_RELATION_WEIGHT
    const filteredOut = (listIdSet ? outgoing.filter((r: Relation) => listIdSet!.has(r.targetId)) : outgoing).filter(weightFilter)
    setRelations(filteredOut)
    const targets = await Promise.all(
      filteredOut.map((r: Relation) => api.nodes.get(r.targetId)),
    )
    setRelatedNodes(targets)

    const filteredIn = (listIdSet ? incoming.filter((r: Relation) => listIdSet!.has(r.sourceId)) : incoming).filter(weightFilter)
    const sources = await Promise.all(
      filteredIn.map((r: Relation) => api.nodes.get(r.sourceId)),
    )
    setIncomingRelations(
      filteredIn.map((r: Relation, i: number) => ({ ...r, sourceTitle: sources[i]?.title })),
    )
  }

  async function toggleStatus() {
    if (!node || !id) return
    const newStatus = node.status === 'pendiente' ? 'terminado' : 'pendiente'
    await api.nodes.update(id, { status: newStatus })
    setNode({ ...node, status: newStatus })
  }

  function openEdit() {
    if (!node) return
    setEditTitle(node.title)
    setEditAuthor(node.author ?? '')
    setEditTags(node.tags ? JSON.parse(node.tags).join(', ') : '')
    setEditYear(node.year?.toString() ?? '')
    setShowEdit(true)
  }

  async function saveEdit() {
    if (!id) return
    const title = editTitle.trim()
    const author = editAuthor.trim()
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean)
    const year = editYear ? parseInt(editYear) : undefined
    await api.nodes.update(id, {
      ...(title ? { title } : {}),
      ...(author ? { author } : { author: null }),
      ...(tags.length > 0 ? { tags } : { tags: [] }),
      ...(year ? { year } : { year: null }),
    })
    setShowEdit(false)
    setReevaluating(true)
    await api.ai.reevaluate(id)
    setReevaluating(false)
    loadNode()
  }

  async function handleResearch() {
    if (!researchUrl.startsWith('https://')) return
    setResearching(true)
    try {
      const data = await api.ai.research(researchUrl)
      if (data.title) setEditTitle(data.title)
      if (data.author) setEditAuthor(data.author)
      if (data.tags?.length > 0) setEditTags(data.tags.join(', '))
      if (data.year) setEditYear(data.year.toString())
      setResearchUrl('')
    } catch {}
    setResearching(false)
  }

  function getCurrentPosition(): number {
    if (!node || allNodes.length === 0) return 0
    return allNodes.findIndex(n => n.id === node.id) + 1
  }

  async function moveToPosition(targetPos: number) {
    if (!node || allNodes.length === 0) return
    const currentPos = getCurrentPosition()
    if (currentPos === targetPos) return
    const reordered = [...allNodes]
    const [moved] = reordered.splice(currentPos - 1, 1)
    reordered.splice(targetPos - 1, 0, moved)
    setAllNodes(reordered)
    if (listId) {
      await api.lists.reorder(listId, reordered.map(n => n.id))
    } else {
      await api.nodes.reorder(reordered.map(n => n.id))
    }
    setShowPosDropdown(false)
  }

  async function handleSearch(q: string) {
    setSearchQuery(q)
    setSelectedTarget(null)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    const results = await api.search(q)
    setSearchResults(results.filter((n: Node) => n.id !== id))
  }

  function selectTarget(n: Node) {
    setSelectedTarget(n)
    setSearchQuery(n.title)
    setSearchResults([])
  }

  async function handleCreateRelation() {
    if (!id || !selectedTarget) return
    setAdding(true)
    await api.relations.create({
      sourceId: id,
      targetId: selectedTarget.id,
      type: relType,
    })
    setAdding(false)
    setShowAdd(false)
    setSearchQuery('')
    setSelectedTarget(null)
    setSearchResults([])
    loadNode()
  }

  if (!node) return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      color: '#546E7A',
      padding: 40,
      textAlign: 'center',
    }}>
      {'>'} Cargando nodo...
    </div>
  )

  const typeColors: Record<string, string> = {
    libro: '#4a90d9',
    pelicula: '#50c878',
    articulo: '#4a90d9',
    video: '#9b59b6',
    curso: '#9b59b6',
    videojuego: '#e67e22',
  }

  return (
    <div>
      {/* Navigation */}
      <div className="node-detail-nav" style={{
        display: 'flex',
        gap: 16,
        marginBottom: 24,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      }}>
        <Link to={listId ? `/dashboard?listId=${listId}` : '/'} style={{ color: '#546E7A' }}>{'<'} INICIO</Link>
        <Link to={listId ? `/graph?listId=${listId}` : '/graph'} style={{ color: '#546E7A' }}>{'<'} GRAFO</Link>
      </div>

      {reevaluating && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: '#546E7A',
          padding: '10px 14px',
          border: '1px solid #333',
          background: '#111',
          marginBottom: 16,
          letterSpacing: 1,
        }}>
          {'>'} Reevaluando relaciones...
        </div>
      )}

      {/* Node info */}
      <div className="card">
        <div className="card-label">NODE // DETAIL</div>

        <div className="node-detail-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            background: typeColors[node.type] ?? '#546E7A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: '#080808',
            opacity: 0.8,
          }}>
            {node.type.substring(0, 3).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, marginBottom: 4 }}>
              {node.title}
            </h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge" style={{ borderColor: typeColors[node.type] ?? '#546E7A', color: typeColors[node.type] ?? '#546E7A' }}>
                {node.type}
              </span>
              <span
                className={`badge ${node.status === 'pendiente' ? 'badge-pendiente' : node.status === 'en_progreso' ? 'badge-en_progreso' : 'badge-terminado'}`}
                onClick={toggleStatus}
                title="Click para cambiar estado"
                style={{ cursor: 'pointer' }}
              >
                {node.status}
              </span>
              {allNodes.length > 0 && (
                <div ref={posDropdownRef} style={{ position: 'relative' }}>
                  <span
                    className="badge"
                    onClick={() => setShowPosDropdown(!showPosDropdown)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    #{getCurrentPosition()}
                    <span style={{ fontSize: 8, lineHeight: 1 }}>▼</span>
                  </span>
                  {showPosDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 2,
                      background: '#111',
                      border: '1px solid #333',
                      maxHeight: 200,
                      overflowY: 'auto',
                      zIndex: 50,
                      minWidth: 50,
                    }}>
                      {allNodes.map((_, i) => (
                        <div
                          key={i}
                          onClick={() => moveToPosition(i + 1)}
                          style={{
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 11,
                            color: (i + 1) === getCurrentPosition() ? '#CFD8DC' : '#757575',
                            background: (i + 1) === getCurrentPosition() ? 'rgba(84,110,122,0.15)' : 'transparent',
                            borderBottom: '1px solid #222',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#222' }}
                          onMouseLeave={e => { e.currentTarget.style.background = (i + 1) === getCurrentPosition() ? 'rgba(84,110,122,0.15)' : 'transparent' }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="node-detail-grid" style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          marginBottom: node.tags ? 12 : 0,
        }}>
          {node.author && (
            <>
              <span style={{ color: '#546E7A' }}>AUTHOR</span>
              <span style={{ color: '#E0E0E0' }}>{node.author}</span>
            </>
          )}
          {node.year && (
            <>
              <span style={{ color: '#546E7A' }}>YEAR</span>
              <span style={{ color: '#E0E0E0' }}>{node.year}</span>
            </>
          )}
          {node.link && (
            <>
              <span style={{ color: '#546E7A' }}>LINK</span>
              <a href={node.link} target="_blank" style={{ color: '#CFD8DC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.link}
              </a>
            </>
          )}
        </div>

        {node.tags && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {JSON.parse(node.tags).map((t: string) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Relations */}
      <div className="card">
        <div className="card-label">RELATIONS // OUT</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Relaciones Salientes</h2>
          <button
            className="btn"
            onClick={() => { setShowAdd(!showAdd); if (!showAdd) setSearchQuery(''); setSelectedTarget(null); setSearchResults([]) }}
            style={{ fontSize: 11 }}
          >
            {showAdd ? 'Cancelar' : '+ Agregar relación'}
          </button>
        </div>

        {showAdd && (
          <div ref={searchRef} style={{ marginBottom: 16, padding: 12, background: '#111', borderRadius: 4 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#546E7A', marginBottom: 8 }}>
              NUEVA RELACIÓN
            </div>
            <div style={{ marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Buscar nodo destino..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                style={{
                  width: '100%', padding: '6px 8px', background: '#1a1a1a', border: '1px solid #333',
                  color: '#E0E0E0', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchResults.length > 0 && (
                <div style={{
                  maxHeight: 160, overflowY: 'auto', border: '1px solid #333', borderTop: 'none',
                  background: '#1a1a1a',
                }}>
                  {searchResults.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => selectTarget(n)}
                      style={{
                        padding: '4px 8px', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11, color: '#CFD8DC', borderBottom: '1px solid #222',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#222')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {n.title} <span style={{ color: '#546E7A' }}>({n.type})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value as RelationType)}
                style={{
                  flex: 1, padding: '6px 8px', background: '#1a1a1a', border: '1px solid #333',
                  color: '#E0E0E0', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: 'none',
                }}
              >
                {RELATION_TYPES.map((t) => (
                  <option key={t} value={t}>{EDGE_LABELS[t] ?? t} [{RELATION_TYPE_WEIGHTS[t]}]</option>
                ))}
              </select>
            </div>
            <button
              className="btn"
              disabled={!selectedTarget || adding}
              onClick={handleCreateRelation}
              style={{ fontSize: 11, opacity: !selectedTarget || adding ? 0.5 : 1 }}
            >
              {adding ? 'Creando...' : 'Crear relación'}
            </button>
            {selectedTarget && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#66bb6a', marginTop: 6 }}>
                → {selectedTarget.title}
              </div>
            )}
          </div>
        )}

          {relations.map((r, i) => (
          <div key={r.id} className="data-row" onClick={() => navigate(`/node/${r.targetId}${listId ? `?listId=${listId}` : ''}`)} style={{ cursor: 'pointer' }}>
            <span className="id">{String(i + 1).padStart(2, '0')}</span>
            <span className="val">
              → {relatedNodes[i]?.title ?? r.targetId}
              <span className="type-tag">{EDGE_LABELS[r.type] ?? r.type} [{RELATION_TYPE_WEIGHTS[r.type]}]</span>
            </span>
            <span className="stat" />
          </div>
        ))}
      </div>

      {incomingRelations.length > 0 && (
        <div className="card">
          <div className="card-label">RELATIONS // IN</div>
          <h2>Relaciones Entrantes</h2>
          {incomingRelations.map((r, i) => (
            <div key={r.id} className="data-row" onClick={() => navigate(`/node/${r.sourceId}${listId ? `?listId=${listId}` : ''}`)} style={{ cursor: 'pointer' }}>
              <span className="id">{String(i + 1).padStart(2, '0')}</span>
              <span className="val">
                ← {r.sourceTitle ?? r.sourceId}
                <span className="type-tag">{EDGE_LABELS[r.type] ?? r.type} [{RELATION_TYPE_WEIGHTS[r.type]}]</span>
              </span>
              <span className="stat" />
            </div>
          ))}
        </div>
      )}

      {relations.length === 0 && !showAdd && incomingRelations.length === 0 && (
        <div className="card">
          <div className="card-label">RELATIONS</div>
          <p className="desc" style={{ marginBottom: 0 }}>
            Este nodo no tiene relaciones. Conéctalo desde el grafo o agrega contenido relacionado.
          </p>
        </div>
      )}

      {/* Rating */}
      <div className="card">
        <div className="card-label">RATING</div>
        <div className="rating-stars">
          {[1,2,3,4,5,6,7].map((n) => (
            <span
              key={n}
              onClick={async () => {
                const newRating = rating === n ? null : n
                if (listId && id) {
                  await api.lists.updateNodeRating(listId, id, newRating)
                } else if (id) {
                  await api.nodes.update(id, { rating: newRating })
                }
                setRating(newRating)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                border: rating !== null && n <= rating ? '1px solid #f9a825' : '1px solid #333',
                background: rating !== null && n <= rating ? 'rgba(249,168,37,0.15)' : 'transparent',
                color: rating !== null && n <= rating ? '#f9a825' : '#555',
                transition: 'all 0.15s',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                if (rating === null || n > rating) {
                  e.currentTarget.style.borderColor = '#546E7A'
                  e.currentTarget.style.color = '#CFD8DC'
                }
              }}
              onMouseLeave={(e) => {
                if (rating === null || n > rating) {
                  e.currentTarget.style.borderColor = '#333'
                  e.currentTarget.style.color = '#555'
                }
              }}
            >
              {n}
            </span>
          ))}
          {rating !== null && (
            <span style={{
              marginLeft: 8,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: '#546E7A',
            }}>
              ({rating}/7)
            </span>
          )}
        </div>
      </div>

      {/* Edit / Delete */}
      <div style={{ marginTop: 32, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => showEdit ? setShowEdit(false) : openEdit()}
          className="btn"
          style={{ fontSize: 11 }}
        >
          {showEdit ? 'Cancelar' : 'Editar este elemento'}
        </button>
        <button
          onClick={async () => {
            if (listId) {
              if (confirm(`¿Quitar "${node.title}" de esta lista?`)) {
                await api.lists.removeNode(listId, node.id)
                navigate(`/dashboard?listId=${listId}`)
              }
            } else {
              if (confirm(`¿Eliminar "${node.title}" definitivamente?`)) {
                await api.nodes.delete(node.id)
                navigate('/')
              }
            }
          }}
          className="btn btn-danger"
          style={{ fontSize: 11 }}
        >
          Eliminar este elemento
        </button>
      </div>

      {showEdit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'JetBrains Mono', monospace",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEdit(false) }}
        >
          <div style={{
            background: '#111',
            border: '1px solid #333',
            padding: '40px 48px',
            maxWidth: 440,
            width: '100%',
            position: 'relative',
          }}>
            <div className="corner-mark tl" />
            <div className="corner-mark tr" />
            <div className="corner-mark bl" style={{ bottom: 'auto', top: 8 }} />
            <div className="corner-mark br" style={{ bottom: 'auto', top: 8 }} />

            <div
              onClick={() => setShowEdit(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 16,
                fontSize: 18,
                color: '#555',
                cursor: 'pointer',
                lineHeight: 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#E0E0E0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
            >
              ✕
            </div>

            <div className="card-label" style={{ marginBottom: 16 }}>EDIT // NODE</div>
            <h2 style={{ marginTop: 0, marginBottom: 20 }}>Editar metadatos</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 9, color: '#546E7A', letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Título</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Título del elemento..."
                  style={{ width: '100%', padding: '6px 8px', background: '#1a1a1a', border: '1px solid #333', color: '#E0E0E0', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 9, color: '#546E7A', letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Autor</label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  placeholder="Nombre del autor..."
                  style={{ width: '100%', padding: '6px 8px', background: '#1a1a1a', border: '1px solid #333', color: '#E0E0E0', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 9, color: '#546E7A', letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Tags (separados por coma)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="filosofía, ciencia, ..."
                  style={{ width: '100%', padding: '6px 8px', background: '#1a1a1a', border: '1px solid #333', color: '#E0E0E0', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 9, color: '#546E7A', letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Año</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value.replace(/[^0-9\-]/g, ''))}
                  placeholder="2024"
                  style={{ width: 120, padding: '6px 8px', background: '#1a1a1a', border: '1px solid #333', color: '#E0E0E0', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: 'none' }}
                />
              </div>

              {/* Research-IA */}
              <div style={{ borderTop: '1px solid #222', paddingTop: 10 }}>
                <label style={{ fontSize: 9, color: '#546E7A', letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Research-IA</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={researchUrl}
                    onChange={(e) => setResearchUrl(e.target.value)}
                    placeholder="https://..."
                    onKeyDown={(e) => { if (e.key === 'Enter' && researchUrl.startsWith('https://')) handleResearch() }}
                    style={{ flex: 1, padding: '6px 8px', background: '#1a1a1a', border: '1px solid #333', color: '#E0E0E0', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button
                    className="btn"
                    onClick={handleResearch}
                    disabled={!researchUrl.startsWith('https://') || researching}
                    style={{ fontSize: 10, opacity: !researchUrl.startsWith('https://') || researching ? 0.5 : 1, whiteSpace: 'nowrap' }}
                  >
                    {researching ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btn-primary" style={{ fontSize: 11 }} onClick={saveEdit}>
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
