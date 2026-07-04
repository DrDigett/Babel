import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { RELATION_TYPE_WEIGHTS, MIN_RELATION_WEIGHT } from '@babel-plus/shared'
import type { Node, Relation } from '@babel-plus/shared'

const COLORS: Record<string, string> = {
  libro: '#4a90d9',
  pelicula: '#50c878',
  articulo: '#4a90d9',
  video: '#9b59b6',
  curso: '#9b59b6',
  videojuego: '#e67e22',
}

const EDGE_LABELS: Record<string, string> = {
  es_autor_de: 'autor',
  dirigio: 'dirigió',
  trata_sobre: 'sobre',
  pertenece_a: 'pertenece',
  influyo_a: 'influyó',
  critica_a: 'critica',
  inspiro: 'inspiró',
  ocurre_en: 'ocurre en',
  similar_a: 'similar',
}

interface GraphNode {
  id: string
  title: string
  type: string
  author: string | null
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  terminado: boolean
}

interface GraphEdge {
  sourceId: string
  targetId: string
  label: string
  weight: number
  typeWeight: number
}

interface Camera {
  x: number
  y: number
  scale: number
}

function screenToWorld(sx: number, sy: number, cam: Camera) {
  return {
    x: (sx - cam.x) / cam.scale,
    y: (sy - cam.y) / cam.scale,
  }
}

export default function GraphView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listId = searchParams.get('listId')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const nodesRef = useRef<GraphNode[]>([])
  const edgesRef = useRef<GraphEdge[]>([])
  const camRef = useRef<Camera>({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef<{
    type: 'node' | 'pan' | null
    node: GraphNode | null
    ox: number
    oy: number
    startX: number
    startY: number
    camStart: Camera
  }>({ type: null, node: null, ox: 0, oy: 0, startX: 0, startY: 0, camStart: { x: 0, y: 0, scale: 1 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
  const hiddenTypesRef = useRef<Set<string>>(new Set())
  const focusTargetRef = useRef<GraphNode | null>(null)

  const loadData = useCallback(async () => {
    try {
      let nodeIds: string[] | null = null
      if (listId) {
        const list = await api.lists.get(listId)
        nodeIds = (list.nodes ?? []).map((n: any) => n.id)
      }

      let nodeData: Node[]
      if (nodeIds) {
        const allNodes = await api.nodes.list()
        const idSet = new Set(nodeIds)
        nodeData = allNodes.filter((n: Node) => idSet.has(n.id))
      } else {
        nodeData = await api.nodes.list()
      }

      const relationData = await api.relations.list()

      const visibleIds = new Set(nodeData.map((n: Node) => n.id))

      const nodes: GraphNode[] = nodeData.map((n: Node, i: number) => {
        const angle = (2 * Math.PI * i) / nodeData.length
        const radius = 200 + Math.random() * 50
        return {
          id: n.id,
          title: n.title,
          type: n.type,
          author: n.author ?? null,
          x: 400 + Math.cos(angle) * radius,
          y: 300 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          radius: n.status === 'terminado' ? 6 : 14,
          color: COLORS[n.type] ?? '#95a5a6',
          terminado: n.status === 'terminado',
        }
      })

      const edges: GraphEdge[] = relationData
        .filter((r: Relation) => visibleIds.has(r.sourceId) && visibleIds.has(r.targetId) && (r.weight ?? 1) >= MIN_RELATION_WEIGHT)
        .map((r: Relation) => ({
          sourceId: r.sourceId,
          targetId: r.targetId,
          label: EDGE_LABELS[r.type] ?? r.type,
          weight: r.weight ?? 1,
          typeWeight: RELATION_TYPE_WEIGHTS[r.type] ?? 1,
        }))

      nodesRef.current = nodes
      edgesRef.current = edges
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
      setLoading(false)
    }
  }, [listId])

  const focusNode = useCallback((node: GraphNode) => {
    const fresh = nodesRef.current.find(n => n.id === node.id)
    if (!fresh) return
    focusTargetRef.current = fresh
    setSearchQuery('')
    setFocusedIdx(-1)
  }, [])

  useEffect(() => { hiddenTypesRef.current = hiddenTypes }, [hiddenTypes])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const el = canvasRef.current
    if (!el || loading || error) return

    const cv = el
    const ctx = cv.getContext('2d')!
    const nodes = nodesRef.current
    const edges = edgesRef.current
    if (nodes.length === 0) return

    let running = true

    function resize() {
      const parent = cv.parentElement
      if (!parent) return
      cv.width = parent.clientWidth
      cv.height = parent.clientHeight
    }

    resize()
    window.addEventListener('resize', resize)

    let simFrame = 0

    function simulate() {
      if (!running) return

      const W = cv.width
      const H = cv.height

      const target = focusTargetRef.current
      if (target) {
        const cam = camRef.current
        const scale = 2.5
        cam.scale = scale
        cam.x = W / 2 - target.x * scale
        cam.y = H / 2 - target.y * scale
        focusTargetRef.current = null
      }

      const repulsion = 5000
      const attraction = 0.005
      const damping = 0.85
      const centerForce = 0.001

      for (const node of nodes) {
        node.vx += (W / 2 - node.x) * centerForce
        node.vy += (H / 2 - node.y) * centerForce
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          let dx = b.x - a.x
          let dy = b.y - a.y
          let dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 1) dist = 1
          const force = repulsion / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          a.vx -= fx
          a.vy -= fy
          b.vx += fx
          b.vy += fy
        }
      }

      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.sourceId)
        const target = nodes.find((n) => n.id === edge.targetId)
        if (!source || !target) continue
        const dx = target.x - source.x
        const dy = target.y - source.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 1) continue
        const ideal = 100
        const force = (dist - ideal) * attraction
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        source.vx += fx
        source.vy += fy
        target.vx -= fx
        target.vy -= fy
      }

      for (const node of nodes) {
        node.vx *= damping
        node.vy *= damping
        if (node.terminado) {
          node.vx *= 0.2
          node.vy *= 0.2
        }
        node.x += node.vx
        node.y += node.vy
      }

      const hidden = hiddenTypesRef.current
      const visNodes = hidden.size === 0 ? nodes : nodes.filter(n => !hidden.has(n.type))
      const visNodeIds = new Set(visNodes.map(n => n.id))
      const visEdges = hidden.size === 0 ? edges : edges.filter(e => visNodeIds.has(e.sourceId) && visNodeIds.has(e.targetId))
      draw(ctx, cv.width, cv.height, visNodes, visEdges, camRef.current)

      simFrame = requestAnimationFrame(simulate)
    }

    simFrame = requestAnimationFrame(simulate)

    function getMousePos(e: MouseEvent) {
      const rect = cv.getBoundingClientRect()
      return { sx: e.clientX - rect.left, sy: e.clientY - rect.top }
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const cam = camRef.current
      const pos = getMousePos(e)
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.1, Math.min(5, cam.scale * factor))
      const world = screenToWorld(pos.sx, pos.sy, cam)
      cam.scale = newScale
      cam.x = pos.sx - world.x * cam.scale
      cam.y = pos.sy - world.y * cam.scale
    }

    const handleMouseDown = (e: MouseEvent) => {
      const pos = getMousePos(e)
      const world = screenToWorld(pos.sx, pos.sy, camRef.current)
      const hit = hitTest(world.x, world.y, nodes)

      if (hit) {
        dragRef.current = {
          type: 'node',
          node: hit,
          ox: hit.x - world.x,
          oy: hit.y - world.y,
          startX: pos.sx,
          startY: pos.sy,
          camStart: { ...camRef.current },
        }
        cv.style.cursor = 'grabbing'
      } else {
        dragRef.current = {
          type: 'pan',
          node: null,
          ox: 0, oy: 0,
          startX: pos.sx,
          startY: pos.sy,
          camStart: { ...camRef.current },
        }
        cv.style.cursor = 'grabbing'
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const pos = getMousePos(e)
      const drag = dragRef.current

      if (drag.type === 'node' && drag.node) {
        const world = screenToWorld(pos.sx, pos.sy, camRef.current)
        drag.node.x = world.x + drag.ox
        drag.node.y = world.y + drag.oy
        drag.node.vx = 0
        drag.node.vy = 0
        return
      }

      if (drag.type === 'pan') {
        const cam = camRef.current
        cam.x = drag.camStart.x + (pos.sx - drag.startX)
        cam.y = drag.camStart.y + (pos.sy - drag.startY)
        return
      }

      const world = screenToWorld(pos.sx, pos.sy, camRef.current)
      const hit = hitTest(world.x, world.y, nodes)
      setHoveredNode(hit ?? null)
      cv.style.cursor = hit ? 'pointer' : 'default'
    }

    const handleMouseUp = (e: MouseEvent) => {
      const drag = dragRef.current
      if (drag.type === 'node' && drag.node) {
        const pos = getMousePos(e)
        const dx = Math.abs(pos.sx - drag.startX)
        const dy = Math.abs(pos.sy - drag.startY)
        if (dx < 5 && dy < 5) {
          navigate(`/node/${drag.node.id}${listId ? `?listId=${listId}` : ''}`)
        }
      }
      dragRef.current = { type: null, node: null, ox: 0, oy: 0, startX: 0, startY: 0, camStart: { x: 0, y: 0, scale: 1 } }
      cv.style.cursor = 'default'
    }

    const handleMouseLeave = () => {
      dragRef.current = { type: null, node: null, ox: 0, oy: 0, startX: 0, startY: 0, camStart: { x: 0, y: 0, scale: 1 } }
      setHoveredNode(null)
    }

    cv.addEventListener('wheel', handleWheel, { passive: false })
    cv.addEventListener('mousedown', handleMouseDown)
    cv.addEventListener('mousemove', handleMouseMove)
    cv.addEventListener('mouseup', handleMouseUp)
    cv.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      running = false
      cancelAnimationFrame(simFrame)
      cv.removeEventListener('wheel', handleWheel)
      cv.removeEventListener('mousedown', handleMouseDown)
      cv.removeEventListener('mousemove', handleMouseMove)
      cv.removeEventListener('mouseup', handleMouseUp)
      cv.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('resize', resize)
    }
  }, [loading, error, navigate])

  return (
    <div>
      {/* Section 01: Topology */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-label">01 // TOPOLOGY</div>
        <h2>Mapa de Conexiones</h2>
        <p className="desc">
          {loading
            ? 'Cargando topología...'
            : error
              ? `ERROR: ${error}`
              : (() => {
                  const n = nodesRef.current.length
                  const e = edgesRef.current.length
                  const hidden = hiddenTypes
                  if (hidden.size === 0) return `Nodos: ${n} | Aristas: ${e}`
                  const vn = nodesRef.current.filter(node => !hidden.has(node.type)).length
                  const vnIds = new Set(nodesRef.current.filter(node => !hidden.has(node.type)).map(node => node.id))
                  const ve = edgesRef.current.filter(edge => vnIds.has(edge.sourceId) && vnIds.has(edge.targetId)).length
                  return `Nodos: ${vn}/${n} | Aristas: ${ve}/${e}`
                })()
          }
        </p>

        <div style={{ position: 'relative', marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Buscar nodo..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setFocusedIdx(-1) }}
            onKeyDown={(e) => {
              const results = nodesRef.current.filter((n) =>
                n.title.toLowerCase().includes(searchQuery.toLowerCase())
              )
              if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx((i) => Math.min(i + 1, results.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx((i) => Math.max(i - 1, 0)) }
              if (e.key === 'Enter' && focusedIdx >= 0 && results[focusedIdx]) {
                focusNode(results[focusedIdx])
              }
            }}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: '#1E1E1E',
              border: '1px solid #333',
              color: '#E0E0E0',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searchQuery && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: 200,
              overflowY: 'auto',
              background: '#1E1E1E',
              border: '1px solid #333',
              borderTop: 'none',
              zIndex: 10,
            }}>
              {(() => {
                const results = nodesRef.current.filter((n) =>
                  n.title.toLowerCase().includes(searchQuery.toLowerCase())
                )
                return results.length > 0 ? results.map((n, i) => (
                  <div
                    key={n.id}
                    onClick={() => focusNode(n)}
                    onMouseEnter={() => setFocusedIdx(i)}
                    style={{
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: '#E0E0E0',
                      background: i === focusedIdx ? '#2A2A2A' : 'transparent',
                    }}
                  >
                    {n.title} <span style={{ color: '#546E7A' }}>[{n.type}]</span>
                  </div>
                )) : (
                  <div style={{ padding: '4px 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#757575' }}>
                    Sin resultados
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: hoveredNode ? '#757575' : '#333',
          marginBottom: 8,
          minHeight: 18,
        }}>
          {hoveredNode ? (
            <>{'>'} {hoveredNode.title} <span style={{ color: '#546E7A' }}>[{hoveredNode.type}]</span>{hoveredNode.author ? <span style={{ color: '#757575' }}> por {hoveredNode.author}</span> : null}</>
          ) : (
            <>{'>'} ...</>
          )}
        </div>

        {!loading && !error && (
          <div style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 12,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
          }}>
            {Object.entries(COLORS).map(([type, color]) => {
              const hidden = hiddenTypes.has(type)
              return (
                <span
                  key={type}
                  onClick={() => {
                    const next = new Set(hiddenTypes)
                    if (hidden) { next.delete(type) } else { next.add(type) }
                    setHiddenTypes(next)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    opacity: hidden ? 0.3 : 1,
                    textDecoration: hidden ? 'line-through' : 'none',
                  }}
                >
                  <span style={{
                    width: 8,
                    height: 8,
                    background: color,
                    display: 'inline-block',
                    opacity: 0.8,
                  }} />
                  <span style={{ color: '#757575' }}>{type}</span>
                </span>
              )
            })}
          </div>
        )}

        {loading && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            color: '#546E7A',
            textAlign: 'center',
            padding: 60,
          }}>
            {'>'} Cargando grafo...
          </div>
        )}

        {error && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            color: '#b71c1c',
            textAlign: 'center',
            padding: 60,
          }}>
            {error}
          </div>
        )}

        <div style={{
          width: '100%',
          height: 346,
          border: '1px solid #2A2A2A',
          position: 'relative',
        }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>

        <div className="formula">
          F = G * (m₁ * m₂) / r² &nbsp;|&nbsp; pan: drag&nbsp; |&nbsp; zoom: scroll&nbsp; |&nbsp; click: inspect
        </div>
      </div>
    </div>
  )
}

function hitTest(wx: number, wy: number, nodes: GraphNode[]): GraphNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    const dx = wx - n.x
    const dy = wy - n.y
    if (n.terminado) {
      if (Math.abs(dx) < n.radius && Math.abs(dy) < n.radius) return n
    } else {
      if (dx * dx + dy * dy < n.radius * n.radius) return n
    }
  }
  return null
}

function draw(ctx: CanvasRenderingContext2D, W: number, H: number, nodes: GraphNode[], edges: GraphEdge[], cam: Camera) {
  ctx.clearRect(0, 0, W, H)
  ctx.save()
  ctx.translate(cam.x, cam.y)
  ctx.scale(cam.scale, cam.scale)

  for (const edge of edges) {
    const source = nodes.find((n) => n.id === edge.sourceId)
    const target = nodes.find((n) => n.id === edge.targetId)
    if (!source || !target) continue

    const dx = target.x - source.x
    const dy = target.y - source.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 1) continue

    const tx = (dx / dist) * target.radius
    const ty = (dy / dist) * target.radius

    ctx.beginPath()
    ctx.moveTo(source.x, source.y)
    ctx.lineTo(target.x - tx, target.y - ty)
    ctx.strokeStyle = `rgba(84,110,122,${0.15 + edge.weight * 0.35})`
    ctx.lineWidth = 1 + edge.weight * 2
    ctx.stroke()


  }

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 8

  for (const node of nodes) {
    if (node.terminado) {
      ctx.fillStyle = '#e53935'
      ctx.fillRect(node.x - node.radius, node.y - node.radius, node.radius * 2, node.radius * 2)
      ctx.shadowBlur = 0
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1
      ctx.strokeRect(node.x - node.radius, node.y - node.radius, node.radius * 2, node.radius * 2)
      ctx.shadowBlur = 8
    } else {
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
      ctx.fillStyle = node.color
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.shadowBlur = 8
    }
  }

  ctx.restore()

  const fontSize = Math.max(10, 14 / cam.scale)
  for (const node of nodes) {
    ctx.fillStyle = '#E0E0E0'
    ctx.font = `${fontSize}px "JetBrains Mono", monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const label = node.title.length > 20 ? node.title.slice(0, 18) + '…' : node.title
    ctx.fillText(label, node.x, node.y + node.radius + fontSize * 0.7)
  }

  ctx.restore()
}