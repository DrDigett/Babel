import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import SearchBar from '../components/SearchBar'
import QuickAdd from '../components/QuickAdd'
import type { Node } from '@babel-plus/shared'

type FilterValue = { type: 'type'; value: string } | { type: 'status'; value: string }
type Filter = FilterValue | null

const filters: { label: string; filter: FilterValue }[] = [
  { label: 'Pendientes', filter: { type: 'status', value: 'pendiente' } },
  { label: 'Terminados', filter: { type: 'status', value: 'terminado' } },
  { label: 'Libros', filter: { type: 'type', value: 'libro' } },
  { label: 'Películas', filter: { type: 'type', value: 'pelicula' } },
  { label: 'Artículos', filter: { type: 'type', value: 'articulo' } },
  { label: 'Videojuegos', filter: { type: 'type', value: 'videojuego' } },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [nodes, setNodes] = useState<Node[]>([])
  const [results, setResults] = useState<Node[] | null>(null)
  const [activeFilter, setActiveFilter] = useState<Filter>(null)
  const [newListId, setNewListId] = useState<string | null>(searchParams.get('newListId'))
  const inputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<{ id: string; startY: number; startIdx: number; currentIdx: number } | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const listId = searchParams.get('listId')

  useEffect(() => {
    if (listId) {
      api.lists.get(listId).then((list) => {
        if (list.nodes && list.nodes.length > 0) {
          setNodes(list.nodes)
          return
        }
        setNodes([])
      }).catch(() => api.nodes.list().then(setNodes))
    } else {
      api.nodes.list().then(setNodes)
    }
  }, [listId])

  const handleSearch = async (q: string) => {
    if (!q) {
      setResults(null)
      return
    }
    const res = await api.search(q)
    setResults(res)
  }

  const counts = (type: string) => nodes.filter((n) => n.type === type).length
  const statusCount = (status: string) => nodes.filter((n) => n.status === status).length

  let displayNodes = results ?? nodes
  if (activeFilter && !results) {
    displayNodes = displayNodes.filter((n) =>
      activeFilter.type === 'type'
        ? n.type === activeFilter.value
        : n.status === activeFilter.value,
    )
  }

  const getStatusBadge = (node: Node) => {
    const cls = node.status === 'pendiente' ? 'badge-pendiente' :
      node.status === 'en_progreso' ? 'badge-en_progreso' :
      node.status === 'terminado' ? 'badge-terminado' : ''
    return (
      <span
        className={`badge ${cls}`}
        onClick={async (e) => {
          e.stopPropagation()
          const newStatus = node.status === 'pendiente' ? 'terminado' : 'pendiente'
          await api.nodes.update(node.id, { status: newStatus })
          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, status: newStatus } : n))
        }}
        title="Click para cambiar estado"
        style={{ cursor: 'pointer' }}
      >
        {node.status}
      </span>
    )
  }

  const handleCopyId = async () => {
    if (newListId) {
      try {
        await navigator.clipboard.writeText(newListId)
        if (inputRef.current) inputRef.current.value = '¡COPIADO!'
      } catch {
        const el = document.createElement('textarea')
        el.value = newListId
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
        if (inputRef.current) inputRef.current.value = '¡COPIADO!'
      }
    }
  }

  const canReorder = !activeFilter && !results

  const persistOrder = useCallback(async ( reordered: Node[]) => {
    setNodes(reordered)
    if (listId) {
      await api.lists.reorder(listId, reordered.map(n => n.id))
    } else {
      await api.nodes.reorder(reordered.map(n => n.id))
    }
  }, [listId])

  const handleDragStart = (e: React.DragEvent, id: string, idx: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    dragRef.current = { id, startY: 0, startIdx: idx, currentIdx: idx }
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault()
    setDragOverIdx(null)
    const drag = dragRef.current
    if (!drag || drag.startIdx === dropIdx) return
    const reordered = [...nodes]
    const [moved] = reordered.splice(drag.startIdx, 1)
    reordered.splice(dropIdx, 0, moved)
    persistOrder(reordered)
    dragRef.current = null
  }

  const handleDragEnd = () => {
    setDragOverIdx(null)
    dragRef.current = null
  }

  const handleTouchStart = (e: React.TouchEvent, id: string, idx: number) => {
    const touch = e.touches[0]
    dragRef.current = { id, startY: touch.clientY, startIdx: idx, currentIdx: idx }
  }

  const handleTouchMove = (e: React.TouchEvent, idx: number) => {
    if (!dragRef.current) return
    const touch = e.touches[0]
    const rowHeight = 36
    const diff = Math.round((touch.clientY - dragRef.current.startY) / rowHeight)
    const newIdx = Math.max(0, Math.min(nodes.length - 1, dragRef.current.startIdx + diff))
    if (newIdx !== dragRef.current.currentIdx) {
      dragRef.current.currentIdx = newIdx
      setDragOverIdx(newIdx)
    }
  }

  const handleTouchEnd = () => {
    if (!dragRef.current) return
    const { startIdx, currentIdx } = dragRef.current
    if (startIdx !== currentIdx) {
      const reordered = [...nodes]
      const [moved] = reordered.splice(startIdx, 1)
      reordered.splice(currentIdx, 0, moved)
      persistOrder(reordered)
    }
    dragRef.current = null
    setDragOverIdx(null)
  }

  return (
    <div>
      {newListId && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setNewListId(null)
              navigate(`/dashboard?listId=${newListId}`, { replace: true })
            }
          }}
        >
          <div style={{
            background: '#111',
            border: '1px solid #333',
            padding: '48px 56px',
            maxWidth: 440,
            width: '100%',
            textAlign: 'center',
            position: 'relative',
          }}>
            <div className="corner-mark tl" />
            <div className="corner-mark tr" />
            <div className="corner-mark bl" style={{ bottom: 'auto', top: 8 }} />
            <div className="corner-mark br" style={{ bottom: 'auto', top: 8 }} />

            <div
              onClick={() => {
                setNewListId(null)
                navigate(`/dashboard?listId=${newListId}`, { replace: true })
              }}
              style={{
                position: 'absolute',
                top: 12,
                right: 16,
                fontSize: 18,
                color: '#555',
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1,
                transition: 'color 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#E0E0E0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
            >
              ✕
            </div>

            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#CFD8DC',
              letterSpacing: 2,
              marginBottom: 8,
              textTransform: 'uppercase',
            }}>
              FELICIDADES
            </div>
            <div style={{
              fontSize: 14,
              color: '#757575',
              marginBottom: 4,
              letterSpacing: 1,
            }}>
              CREASTE TU PRIMER
            </div>
            <div style={{
              fontSize: 36,
              fontWeight: 800,
              color: '#546E7A',
              fontFamily: "'Inter', sans-serif",
              letterSpacing: -1,
              marginBottom: 24,
            }}>
              BaBel+
            </div>

            <div style={{
              borderTop: '1px solid #2A2A2A',
              borderBottom: '1px solid #2A2A2A',
              padding: '20px 0',
              marginBottom: 20,
            }}>
              <div style={{
                fontSize: 10,
                color: '#546E7A',
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}>
                ID
              </div>
              <div style={{
                fontSize: 32,
                fontWeight: 700,
                color: '#E0E0E0',
                letterSpacing: 8,
                textTransform: 'uppercase',
              }}>
                {newListId}
              </div>
            </div>

            <input
              ref={inputRef}
              readOnly
              onClick={handleCopyId}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a1a1a',
                border: '1px solid #333',
                color: '#757575',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: 16,
                outline: 'none',
              }}
              value="tomale screenshot a tu id para guardarlo"
            />

            <button
              onClick={() => {
                setNewListId(null)
                navigate(`/dashboard?listId=${newListId}`, { replace: true })
              }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: 12 }}
            >
              ENTRAR
            </button>
          </div>
        </div>
      )}

      {/* Section 01: Input */}
      <div className="card">
        <div className="card-label">01 // INPUT</div>
        <h2>Capa de Entrada</h2>
        <p className="desc">
          Agregar nuevo contenido o buscar en el índice existente.
        </p>
        <QuickAdd
          listId={listId ?? undefined}
          onAdded={() => {
            if (listId) {
              api.lists.get(listId).then((list) => {
                setNodes(list.nodes?.length > 0 ? list.nodes : [])
              }).catch(() => setNodes([]))
            } else {
              api.nodes.list().then(setNodes)
            }
          }}
        />
      </div>

      {/* Section 02: Filter */}
      <div className="card">
        <div className="card-label">02 // FILTER</div>
        <h2>Filtros de Consulta</h2>
        <p className="desc">
          Segmentar por tipo o estado.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filters.map(({ label, filter }) => {
            const count =
              filter.type === 'status' ? statusCount(filter.value) : counts(filter.value)
            const isActive =
              activeFilter?.type === filter.type && activeFilter?.value === filter.value
            return (
              <button
                key={label}
                onClick={() => setActiveFilter(isActive ? null : filter)}
                className={`btn ${isActive ? 'btn-active' : ''}`}
                style={{ fontSize: 10 }}
              >
                {label}
                <span style={{ marginLeft: 6, color: '#546E7A', fontWeight: 700 }}>{count}</span>
              </button>
            )
          })}
          {activeFilter && (
            <button
              onClick={() => setActiveFilter(null)}
              className="btn"
              style={{ fontSize: 10, color: '#b71c1c' }}
            >
              ✕ Limpiar filtro
            </button>
          )}
        </div>
      </div>

      {/* Section 03: Data Log */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-label">03 // DATA_LOG</div>
        <h2>Índice de Nodos</h2>
        <SearchBar onSearch={handleSearch} />
        <p className="desc">
          {results
            ? `Resultados de búsqueda: ${displayNodes.length}`
            : `Total de registros: ${displayNodes.length}`
          }
        </p>
        <div>
          {displayNodes.map((node, i) => (
            <div
              key={node.id}
              className="data-row"
              draggable={canReorder}
              onDragStart={(e) => handleDragStart(e, node.id, i)}
              onDragOver={(e) => canReorder && handleDragOver(e, i)}
              onDrop={(e) => canReorder && handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => canReorder && handleTouchStart(e, node.id, i)}
              onTouchMove={(e) => canReorder && handleTouchMove(e, i)}
              onTouchEnd={canReorder ? handleTouchEnd : undefined}
              onClick={() => navigate(`/node/${node.id}${listId ? `?listId=${listId}` : ''}`)}
              style={{
                opacity: dragRef.current?.id === node.id ? 0.4 : 1,
                borderTop: dragOverIdx === i ? '2px solid #546E7A' : undefined,
                cursor: canReorder ? 'grab' : undefined,
              }}
            >
              <span className="id">{String(i + 1).padStart(2, '0')}</span>
              <span className="val">
                {node.title}
                <span className="type-tag">{node.type}</span>
              </span>
              <span className="stat">
                {getStatusBadge(node)}
              </span>
            </div>
          ))}
          {displayNodes.length === 0 && (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: '#555',
              textAlign: 'center',
              padding: 24,
            }}>
              {results !== null
                ? 'Sin resultados'
                : activeFilter
                  ? 'No hay resultados para este filtro'
                  : 'No hay elementos aún'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}