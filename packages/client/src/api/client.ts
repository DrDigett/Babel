const BASE = import.meta.env.VITE_API_URL || '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let msg = `API error: ${res.status}`
    try {
      const body = await res.json()
      if (body?.error) msg = body.error
    } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export const api = {
  nodes: {
    list: (params?: string) => request<any[]>(`/nodes${params ? `?${params}` : ''}`),
    get: (id: string) => request<any>(`/nodes/${id}`),
    create: (data: any) => request<any>('/nodes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/nodes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/nodes/${id}`, { method: 'DELETE' }),
  },
  relations: {
    list: (params?: string) => request<any[]>(`/relations${params ? `?${params}` : ''}`),
    create: (data: any) => request<any>('/relations', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/relations/${id}`, { method: 'DELETE' }),
  },
  search: (q: string) => request<any[]>(`/search?q=${encodeURIComponent(q)}`),
  ai: {
    classify: (text: string, typeHint?: string) => request<any>('/ai/classify', { method: 'POST', body: JSON.stringify({ text, typeHint }) }),
    smartAdd: (text: string, typeHint?: string) => request<any>('/ai/smart-add', { method: 'POST', body: JSON.stringify({ text, typeHint }) }),
  },
}
