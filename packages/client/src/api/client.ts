import type { User, AuthResponse } from '@babel-plus/shared'

const BASE = import.meta.env.VITE_API_URL || '/api'

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('No autenticado')
  }
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
  auth: {
    login: (email: string, password: string) =>
      request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (email: string, username: string, password: string) =>
      request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ email, username, password }) }),
    me: () => request<User>('/auth/me'),
    updatePassword: (currentPassword: string, newPassword: string) =>
      request<{ ok: boolean }>('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
    searchUsers: (q: string) => request<{ id: string; username: string; createdAt: string }[]>(`/auth/search?q=${encodeURIComponent(q)}`),
    getProfile: (id: string) => request<any>(`/auth/profile/${id}`),
  },
  nodes: {
    list: (params?: string) => request<any[]>(`/nodes${params ? `?${params}` : ''}`),
    get: (id: string) => request<any>(`/nodes/${id}`),
    create: (data: any) => request<any>('/nodes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/nodes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/nodes/${id}`, { method: 'DELETE' }),
    reorder: (nodeIds: string[]) => request<any>('/nodes/reorder', { method: 'PUT', body: JSON.stringify({ nodeIds }) }),
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
    reevaluate: (nodeId: string) => request<any>(`/ai/reevaluate/${nodeId}`, { method: 'POST' }),
    research: (url: string) => request<any>('/ai/research', { method: 'POST', body: JSON.stringify({ url }) }),
  },
  lists: {
    list: () => request<any[]>('/lists'),
    get: (id: string) => request<any>(`/lists/${id}`),
    create: (data: any) => request<any>('/lists', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/lists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/lists/${id}`, { method: 'DELETE' }),
    addNode: (listId: string, nodeId: string) => request<any>(`/lists/${listId}/nodes`, { method: 'POST', body: JSON.stringify({ nodeId }) }),
    updateNodeRating: (listId: string, nodeId: string, rating: number | null) => request<any>(`/lists/${listId}/nodes/${nodeId}/rating`, { method: 'PUT', body: JSON.stringify({ rating }) }),
    removeNode: (listId: string, nodeId: string) => request<any>(`/lists/${listId}/nodes/${nodeId}`, { method: 'DELETE' }),
    reorder: (listId: string, nodeIds: string[]) => request<any>(`/lists/${listId}/nodes/reorder`, { method: 'PUT', body: JSON.stringify({ nodeIds }) }),
  },
}
