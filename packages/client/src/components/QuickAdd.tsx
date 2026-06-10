import { useState } from 'react'
import { api } from '../api/client'
import { NODE_TYPES } from '@babel-plus/shared'
import type { NodeType } from '@babel-plus/shared'

interface Props {
  onAdded: () => void
}

export default function QuickAdd({ onAdded }: Props) {
  const [text, setText] = useState('')
  const [typeHint, setTypeHint] = useState<NodeType | ''>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await api.ai.smartAdd(text, typeHint || undefined)
      setResult(res)
      setText('')
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={typeHint}
          onChange={(e) => setTypeHint(e.target.value as NodeType | '')}
          title="Seleccionar tipo de nodo"
          style={{
            padding: '9px 8px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            background: '#1a1a1a',
            border: '1px solid #546E7A',
            color: '#E0E0E0',
            cursor: 'pointer',
            minWidth: 110,
            outline: 'none',
          }}
        >
          <option value="">Auto</option>
          <optgroup label="Material">
            {NODE_TYPES.filter(t => ['libro','pelicula','articulo','video','curso','videojuego'].includes(t)).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </optgroup>
          <optgroup label="Evento">
            <option value="evento">evento</option>
          </optgroup>
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Agrega lo que quieras... ej: 'El Padrino de 1972'"
          style={{ flex: 1 }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className={`btn ${loading ? '' : 'btn-primary'}`}
          style={{ opacity: loading || !text.trim() ? 0.5 : 1 }}
        >
          {loading ? '...' : 'Agregar'}
        </button>
      </form>

      {loading && (
        <div style={{ marginTop: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#546E7A' }}>
          {'>'} Procesando con IA...
        </div>
      )}

      {error && (
        <div style={{ marginTop: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#b71c1c' }}>
          {'>'} ERROR: {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: 12,
          padding: 12,
          border: '1px solid #2A2A2A',
          background: 'rgba(102, 187, 106, 0.05)',
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          <div style={{ color: '#66bb6a', marginBottom: 4 }}>
            {'>'} NODE_CREATED: {result.node.title}
            <span style={{ color: '#757575' }}> ({result.node.type})</span>
          </div>
          {result.relations.length > 0 && (
            <div style={{ color: '#757575', fontSize: 11, lineHeight: 1.8 }}>
              {result.relations.map((r: any) => (
                <div key={r.id}>
                  {'  '}→ {r.targetTitle}
                  <span style={{ color: '#546E7A' }}> [{r.type}]</span>
                  <span style={{ color: '#555' }}> w={r.weight}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
