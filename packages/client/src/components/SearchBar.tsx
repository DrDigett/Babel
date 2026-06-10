import { useState, type FormEvent } from 'react'

interface SearchBarProps {
  onSearch: (q: string) => void
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(value)
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Buscar por título..."
          style={{ flex: 1, maxWidth: 400 }}
        />
        <button type="submit" className="btn" style={{ fontSize: 11 }}>
          Buscar
        </button>
        {value && (
          <button
            type="button"
            className="btn"
            style={{ fontSize: 11 }}
            onClick={() => {
              setValue('')
              onSearch('')
            }}
          >
            ✕
          </button>
        )}
      </div>
    </form>
  )
}
