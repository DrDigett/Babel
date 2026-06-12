import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const [nodes, setNodes] = useState<Node[]>([])
  const [results, setResults] = useState<Node[] | null>(null)
  const [activeFilter, setActiveFilter] = useState<Filter>(null)

  useEffect(() => {
    api.nodes.list().then(setNodes)
  }, [])

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

  return (
    <div>
      {/* Section 01: Input */}
      <div className="card">
        <div className="card-label">01 // INPUT</div>
        <h2>Capa de Entrada</h2>
        <p className="desc">
          Agregar nuevo contenido o buscar en el índice existente.
        </p>
        <QuickAdd onAdded={() => api.nodes.list().then(setNodes)} />
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
              onClick={() => navigate(`/node/${node.id}`)}
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
