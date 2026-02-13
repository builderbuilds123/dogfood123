import { NextResponse } from 'next/server'

interface iTunesResult {
  trackId: number
  trackName: string
  artistName: string
  collectionName: string
  artworkUrl100: string
  trackViewUrl: string
  previewUrl: string
}

interface iTunesResponse {
  resultCount: number
  results: iTunesResult[]
}

const searchCache = new Map<string, { data: iTunesResponse; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const term = searchParams.get('term')

  if (!term?.trim()) {
    return NextResponse.json({ results: [] })
  }

  const cacheKey = term.trim().toLowerCase()
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ results: cached.data.results })
  }

  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term.trim())}&entity=song&limit=10`,
      { next: { revalidate: 300 } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'iTunes API error' }, { status: 502 })
    }

    const data: iTunesResponse = await res.json()

    searchCache.set(cacheKey, { data, timestamp: Date.now() })

    // Prune stale cache entries on every request
    const now = Date.now()
    for (const [key, value] of searchCache) {
      if (now - value.timestamp > CACHE_TTL) {
        searchCache.delete(key)
      }
    }

    return NextResponse.json({ results: data.results })
  } catch {
    return NextResponse.json({ error: 'Failed to search iTunes' }, { status: 500 })
  }
}
