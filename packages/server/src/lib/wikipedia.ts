import { eq } from 'drizzle-orm'
import { db } from '../db'
import { nodes } from '../db/schema'

// shortcut: match por título sobre los primeros resultados de búsqueda; títulos
// ambiguos ("It") pueden traer otra obra. Mejorar con verificación de autor/tipo.
export interface CoverSource {
  id: string
  title: string
  type: string
  author: string | null
  link: string | null
  coverUrl: string | null
}

interface WikiPage {
  title: string
  thumbnail?: { source?: string }
  pageprops?: { disambiguation?: boolean }
}

function wikiTitleFromLink(link: string | null): { lang: string; title: string } | null {
  if (!link) return null
  try {
    const url = new URL(link)
    if (!/(^|\.)wikipedia\.org$/.test(url.hostname)) return null
    const match = url.pathname.match(/^\/wiki\/(.+)$/)
    if (!match) return null
    return {
      lang: url.hostname.split('.')[0],
      title: decodeURIComponent(match[1]).replace(/_/g, ' '),
    }
  } catch {
    return null
  }
}

// undefined = no se pudo consultar (red/429); null = consultado sin resultado
async function fetchPages(lang: string, params: string): Promise<WikiPage[] | undefined> {
  try {
    const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': 'BaBelBot/1.0 (personal library)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return undefined
    const data = await res.json() as { query?: { pages?: WikiPage[] } }
    return data.query?.pages ?? []
  } catch {
    return undefined
  }
}

function normalize(s: string) {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickImage(pages: WikiPage[], title: string): string | null {
  const target = normalize(title)
  let best: string | null = null
  let bestScore = 3
  for (const page of pages) {
    const url = page.thumbnail?.source
    if (!url || page.pageprops?.disambiguation) continue
    const pageTitle = normalize(page.title)
    const score = pageTitle === target ? 0
      : pageTitle.startsWith(`${target} `) || target.startsWith(`${pageTitle} `) ? 1
      : pageTitle.includes(target) ? 2
      : 3
    if (score < bestScore) { best = url; bestScore = score }
    if (score === 0) break
  }
  return best
}

function exactParams(title: string) {
  return `action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=400&format=json&formatversion=2&redirects=1`
}

function searchParams(query: string) {
  return `action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&prop=pageimages|pageprops&pithumbsize=400&format=json&formatversion=2`
}

export async function findCoverUrl(node: Pick<CoverSource, 'title' | 'author' | 'link'>): Promise<string | null | undefined> {
  let hadError = false

  const fromLink = wikiTitleFromLink(node.link)
  if (fromLink) {
    const pages = await fetchPages(fromLink.lang, exactParams(fromLink.title))
    if (pages === undefined) hadError = true
    else {
      const url = pickImage(pages, node.title)
      if (url) return url
    }
  }

  const phrase = `"${node.title.replace(/"/g, '').trim()}"`
  const queries = [[phrase, node.author].filter(Boolean).join(' '), phrase]

  for (const lang of ['es', 'en']) {
    for (const query of queries) {
      const pages = await fetchPages(lang, searchParams(query))
      if (pages === undefined) { hadError = true; continue }
      const url = pickImage(pages, node.title)
      if (url) return url
    }
  }
  return hadError ? undefined : null
}

export async function resolveCovers(rows: CoverSource[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {}
  // secuencial: evita ráfagas que Wikipedia limita con 429
  for (const row of rows) {
    if (row.coverUrl !== null) {
      result[row.id] = row.coverUrl || null
      continue
    }
    const url = await findCoverUrl(row)
    if (url !== undefined) {
      await db.update(nodes).set({ coverUrl: url ?? '' }).where(eq(nodes.id, row.id))
    }
    result[row.id] = url ?? null
  }
  return result
}
