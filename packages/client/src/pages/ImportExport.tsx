import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Node, Relation } from '@babel-plus/shared'

interface ExportData {
  nodes: Node[]
  relations: Relation[]
  lists: { id: string; name: string; description: string | null; nodeIds: string[] }[]
}

export default function ImportExport() {
  const [searchParams] = useSearchParams()
  const listId = searchParams.get('listId')
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [msg, setMsg] = useState('')
  const [log, setLog] = useState<string[]>([])

  async function handleExport() {
    setExporting(true)
    setMsg('')
    try {
      let nodes: Node[]
      let relations: Relation[]
      let lists: ExportData['lists']

      if (listId) {
        const full = await api.lists.get(listId)
        nodes = full.nodes ?? []
        const nodeIds = new Set(nodes.map((n: Node) => n.id))
        const allRelations: Relation[] = await api.relations.list()
        relations = allRelations.filter((r: Relation) => nodeIds.has(r.sourceId) && nodeIds.has(r.targetId))
        lists = [{ id: full.id, name: full.name, description: full.description, nodeIds: [...nodeIds] }]
      } else {
        const [allNodes, allRelations, allLists] = await Promise.all([
          api.nodes.list(),
          api.relations.list(),
          api.lists.list(),
        ])
        nodes = allNodes
        relations = allRelations
        lists = []
        for (const list of allLists) {
          const full = await api.lists.get(list.id)
          const nodeIds = (full.nodes ?? []).map((n: any) => n.id)
          lists.push({ id: list.id, name: list.name, description: list.description, nodeIds })
        }
      }

      const data: ExportData = { nodes, relations, lists }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const label = listId ? lists[0].name : 'all'
      a.href = url
      a.download = `babel-${label}-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMsg(`Exportado: ${nodes.length} nodos, ${relations.length} relaciones${listId ? `, lista: ${lists[0].name}` : `, ${lists.length} listas`}`)
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : 'desconocido'}`)
    }
    setExporting(false)
  }

  async function handleImport(file: File) {
    setImporting(true)
    setLog([])
    try {
      const text = await file.text()
      const data: ExportData = JSON.parse(text)

      if (!data.nodes || !data.relations || !data.lists) {
        throw new Error('Formato inválido')
      }

      const idMap = new Map<string, string>()

      for (const n of data.nodes) {
        const created = await api.nodes.create({
          title: n.title,
          type: n.type,
          description: n.description ?? undefined,
          status: n.status,
          priority: n.priority,
          tags: n.tags ? JSON.parse(n.tags) : undefined,
          author: n.author ?? undefined,
          year: n.year ?? undefined,
          link: n.link ?? undefined,
          rating: n.rating ?? undefined,
        })
        idMap.set(n.id, created.id)
        setLog(l => [...l, `Nodo creado: ${n.title}`])
      }

      for (const r of data.relations) {
        const newSourceId = idMap.get(r.sourceId)
        const newTargetId = idMap.get(r.targetId)
        if (!newSourceId || !newTargetId) continue
        await api.relations.create({
          sourceId: newSourceId,
          targetId: newTargetId,
          type: r.type,
          weight: r.weight,
        })
        setLog(l => [...l, `Relación creada: ${r.type}`])
      }

      for (const list of data.lists) {
        const created = await api.lists.create({ name: list.name, description: list.description ?? undefined })
        for (const nodeId of list.nodeIds) {
          const newId = idMap.get(nodeId)
          if (newId) {
            await api.lists.addNode(created.id, newId)
          }
        }
        setLog(l => [...l, `Lista creada: ${list.name}`])
      }

      setMsg('Importación completada')
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : 'desconocido'}`)
    }
    setImporting(false)
  }

  return (
    <div>
      <div className="card">
        <div className="card-label">01 // EXPORT</div>
        <h2>Exportar datos</h2>
        <p className="desc">{listId ? 'Descarga solo los nodos y relaciones de esta lista como JSON.' : 'Descarga todas las listas, nodos y relaciones como JSON.'}</p>
        <button className="btn" onClick={handleExport} disabled={exporting} style={{ fontSize: 11 }}>
          {exporting ? 'Exportando...' : 'Descargar JSON'}
        </button>
      </div>

      <div className="card">
        <div className="card-label">02 // IMPORT</div>
        <h2>Importar datos</h2>
        <p className="desc">Subí un archivo JSON exportado para importar nodos, relaciones y listas.</p>
        <label style={{ cursor: importing ? 'default' : 'pointer' }}>
          <input
            type="file"
            accept=".json"
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
            disabled={importing}
            style={{ display: 'none' }}
          />
          <span className="btn" style={{ fontSize: 11, opacity: importing ? 0.5 : 1 }}>
            {importing ? 'Importando...' : 'Seleccionar archivo'}
          </span>
        </label>
      </div>

      {msg && (
        <div className="card">
          <div className="card-label">STATUS</div>
          <p className="desc" style={{ color: msg.startsWith('Error') ? '#b71c1c' : '#66bb6a' }}>{msg}</p>
        </div>
      )}

      {log.length > 0 && (
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-label">03 // LOG</div>
          <h2>Registro</h2>
          <div style={{ maxHeight: 300, overflowY: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#757575' }}>
            {log.map((l, i) => <div key={i}>{'>'} {l}</div>)}
          </div>
        </div>
      )}
    </div>
  )
}
