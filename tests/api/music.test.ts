import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockSupabase, jsonRequest, getRequest } from '../helpers'

// ---------------------------------------------------------------------------
// GET /api/music
// ---------------------------------------------------------------------------

describe('GET /api/music', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { GET } = await import('@/app/api/music/route')

    const res = await GET(getRequest('http://localhost/api/music?linkId=link-1'))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when linkId missing', async () => {
    mockSupabase()
    const { GET } = await import('@/app/api/music/route')

    const res = await GET(getRequest('http://localhost/api/music'))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Missing linkId')
  })

  it('returns songs array on success', async () => {
    const songs = [
      { id: '1', track_name: 'Song A', artist_name: 'Artist A' },
      { id: '2', track_name: 'Song B', artist_name: 'Artist B' },
    ]
    const { chain } = mockSupabase({
      queryResult: { data: songs, error: null },
    })
    const { GET } = await import('@/app/api/music/route')

    const res = await GET(getRequest('http://localhost/api/music?linkId=link-1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.songs).toEqual(songs)
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.eq).toHaveBeenCalledWith('link_id', 'link-1')
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })
})

// ---------------------------------------------------------------------------
// POST /api/music
// ---------------------------------------------------------------------------

describe('POST /api/music', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { POST } = await import('@/app/api/music/route')

    const req = jsonRequest('http://localhost/api/music', 'POST', {
      linkId: 'link-1',
      trackName: 'Song',
      artistName: 'Artist',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when trackName is missing', async () => {
    mockSupabase()
    const { POST } = await import('@/app/api/music/route')

    const req = jsonRequest('http://localhost/api/music', 'POST', {
      linkId: 'link-1',
      artistName: 'Artist',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Missing required fields')
  })

  it('returns 400 when artistName is missing', async () => {
    mockSupabase()
    const { POST } = await import('@/app/api/music/route')

    const req = jsonRequest('http://localhost/api/music', 'POST', {
      linkId: 'link-1',
      trackName: 'Song',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Missing required fields')
  })

  it('returns 400 when trackName is whitespace-only', async () => {
    mockSupabase()
    const { POST } = await import('@/app/api/music/route')

    const req = jsonRequest('http://localhost/api/music', 'POST', {
      linkId: 'link-1',
      trackName: '   ',
      artistName: 'Artist',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Missing required fields')
  })

  it('returns 400 when artistName is whitespace-only', async () => {
    mockSupabase()
    const { POST } = await import('@/app/api/music/route')

    const req = jsonRequest('http://localhost/api/music', 'POST', {
      linkId: 'link-1',
      trackName: 'Song',
      artistName: '   ',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Missing required fields')
  })

  it('returns 200 with song on success', async () => {
    const song = {
      id: 'song-1',
      link_id: 'link-1',
      user_id: 'user-aaa-111',
      track_name: 'My Song',
      artist_name: 'My Artist',
      artwork_url: 'https://art.url/img.jpg',
      track_view_url: 'https://itunes.apple.com/track/1',
      preview_url: 'https://preview.url/song.m4a',
    }
    const { chain, fromMock } = mockSupabase({
      queryResult: { data: song, error: null },
    })
    const { POST } = await import('@/app/api/music/route')

    const req = jsonRequest('http://localhost/api/music', 'POST', {
      linkId: 'link-1',
      trackName: 'My Song',
      artistName: 'My Artist',
      artworkUrl: 'https://art.url/img.jpg',
      trackViewUrl: 'https://itunes.apple.com/track/1',
      previewUrl: 'https://preview.url/song.m4a',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.song).toEqual(song)
    expect(fromMock).toHaveBeenCalledWith('shared_songs')
    expect(chain.insert).toHaveBeenCalledWith({
      link_id: 'link-1',
      user_id: 'user-aaa-111',
      track_name: 'My Song',
      artist_name: 'My Artist',
      artwork_url: 'https://art.url/img.jpg',
      track_view_url: 'https://itunes.apple.com/track/1',
      preview_url: 'https://preview.url/song.m4a',
    })
    expect(chain.select).toHaveBeenCalled()
    expect(chain.single).toHaveBeenCalled()
  })

  it('trims trackName and artistName', async () => {
    const song = {
      id: 'song-2',
      track_name: 'Trimmed Song',
      artist_name: 'Trimmed Artist',
    }
    const { chain } = mockSupabase({
      queryResult: { data: song, error: null },
    })
    const { POST } = await import('@/app/api/music/route')

    const req = jsonRequest('http://localhost/api/music', 'POST', {
      linkId: 'link-1',
      trackName: '  Trimmed Song  ',
      artistName: '  Trimmed Artist  ',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.song).toEqual(song)
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        track_name: 'Trimmed Song',
        artist_name: 'Trimmed Artist',
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// GET /api/music/search
// ---------------------------------------------------------------------------

describe('GET /api/music/search', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns empty results when term is missing', async () => {
    const { GET } = await import('@/app/api/music/search/route')

    const res = await GET(getRequest('http://localhost/api/music/search'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.results).toEqual([])
  })

  it('returns empty results when term is whitespace-only', async () => {
    const { GET } = await import('@/app/api/music/search/route')

    const res = await GET(getRequest('http://localhost/api/music/search?term=%20%20'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.results).toEqual([])
  })

  it('returns results from iTunes API on success', async () => {
    const iTunesResults = [
      {
        trackId: 1,
        trackName: 'Test Song',
        artistName: 'Test Artist',
        collectionName: 'Test Album',
        artworkUrl100: 'https://art.url/100.jpg',
        trackViewUrl: 'https://itunes.apple.com/track/1',
        previewUrl: 'https://preview.url/song.m4a',
      },
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ resultCount: 1, results: iTunesResults }),
      }),
    )

    const { GET } = await import('@/app/api/music/search/route')

    const res = await GET(getRequest('http://localhost/api/music/search?term=test'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.results).toEqual(iTunesResults)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://itunes.apple.com/search?term=test'),
      expect.any(Object),
    )
  })

  it('returns empty results when iTunes returns no results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ resultCount: 0, results: [] }),
      }),
    )

    const { GET } = await import('@/app/api/music/search/route')

    const res = await GET(getRequest('http://localhost/api/music/search?term=zzzznonexistent'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.results).toEqual([])
  })
})
