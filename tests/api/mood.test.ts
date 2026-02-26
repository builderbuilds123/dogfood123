import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockSupabase, jsonRequest, getRequest } from '../helpers'

// ---------------------------------------------------------------------------
// POST /api/mood/checkin
// ---------------------------------------------------------------------------

describe('POST /api/mood/checkin', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { POST } = await import('@/app/api/mood/checkin/route')

    const res = await POST(
      jsonRequest('http://localhost/api/mood/checkin', 'POST', {
        linkId: 'link-1',
        emoji: '😊',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when linkId or emoji missing', async () => {
    mockSupabase()
    const { POST } = await import('@/app/api/mood/checkin/route')

    // Missing emoji
    const res1 = await POST(
      jsonRequest('http://localhost/api/mood/checkin', 'POST', {
        linkId: 'link-1',
      }),
    )
    expect(res1.status).toBe(400)
    const json1 = await res1.json()
    expect(json1.error).toBe('Missing required fields')

    // Missing linkId
    const res2 = await POST(
      jsonRequest('http://localhost/api/mood/checkin', 'POST', {
        emoji: '😊',
      }),
    )
    expect(res2.status).toBe(400)
    const json2 = await res2.json()
    expect(json2.error).toBe('Missing required fields')
  })

  it('returns 400 when note exceeds 100 characters', async () => {
    mockSupabase()
    const { POST } = await import('@/app/api/mood/checkin/route')

    const longNote = 'a'.repeat(101)
    const res = await POST(
      jsonRequest('http://localhost/api/mood/checkin', 'POST', {
        linkId: 'link-1',
        emoji: '😊',
        note: longNote,
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Note too long (max 100 chars)')
  })

  it('returns 200 with checkin on success', async () => {
    const checkinRow = {
      id: 'checkin-1',
      link_id: 'link-1',
      user_id: 'user-aaa-111',
      emoji: '😊',
      note: 'feeling good',
      created_at: '2026-01-15T12:00:00Z',
    }

    const { chain } = mockSupabase({
      queryResult: { data: checkinRow, error: null },
    })
    const { POST } = await import('@/app/api/mood/checkin/route')

    const res = await POST(
      jsonRequest('http://localhost/api/mood/checkin', 'POST', {
        linkId: 'link-1',
        emoji: '😊',
        note: 'feeling good',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.checkin).toEqual(checkinRow)
    expect(chain.insert).toHaveBeenCalledWith({
      link_id: 'link-1',
      user_id: 'user-aaa-111',
      emoji: '😊',
      note: 'feeling good',
    })
  })

  it('handles null note gracefully', async () => {
    const checkinRow = {
      id: 'checkin-2',
      link_id: 'link-1',
      user_id: 'user-aaa-111',
      emoji: '🥳',
      note: null,
      created_at: '2026-01-15T12:00:00Z',
    }

    const { chain } = mockSupabase({
      queryResult: { data: checkinRow, error: null },
    })
    const { POST } = await import('@/app/api/mood/checkin/route')

    const res = await POST(
      jsonRequest('http://localhost/api/mood/checkin', 'POST', {
        linkId: 'link-1',
        emoji: '🥳',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.checkin).toEqual(checkinRow)
    expect(chain.insert).toHaveBeenCalledWith({
      link_id: 'link-1',
      user_id: 'user-aaa-111',
      emoji: '🥳',
      note: null,
    })
  })
})

// ---------------------------------------------------------------------------
// GET /api/mood/latest
// ---------------------------------------------------------------------------

describe('GET /api/mood/latest', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { GET } = await import('@/app/api/mood/latest/route')

    const res = await GET(
      getRequest('http://localhost/api/mood/latest?linkId=link-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when linkId missing', async () => {
    mockSupabase()
    const { GET } = await import('@/app/api/mood/latest/route')

    const res = await GET(getRequest('http://localhost/api/mood/latest'))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Missing linkId')
  })

  it('returns checkins array deduplicating by user_id', async () => {
    const rows = [
      { user_id: 'user-a', emoji: '😊', created_at: '2026-01-02' },
      { user_id: 'user-a', emoji: '😢', created_at: '2026-01-01' },
      { user_id: 'user-b', emoji: '🥳', created_at: '2026-01-02' },
      { user_id: 'user-b', emoji: '😎', created_at: '2026-01-01' },
    ]

    mockSupabase({
      queryResult: { data: rows, error: null },
    })
    const { GET } = await import('@/app/api/mood/latest/route')

    const res = await GET(
      getRequest('http://localhost/api/mood/latest?linkId=link-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    // The Map keeps only the first occurrence per user_id (most recent)
    expect(json.checkins).toEqual([
      { user_id: 'user-a', emoji: '😊', created_at: '2026-01-02' },
      { user_id: 'user-b', emoji: '🥳', created_at: '2026-01-02' },
    ])
  })

  it('returns at most 2 checkins (one per user)', async () => {
    // Even if 3 distinct users are in the results, the route caps at 2
    const rows = [
      { user_id: 'user-a', emoji: '😊', created_at: '2026-01-03' },
      { user_id: 'user-b', emoji: '🥳', created_at: '2026-01-02' },
      { user_id: 'user-c', emoji: '😎', created_at: '2026-01-01' },
    ]

    mockSupabase({
      queryResult: { data: rows, error: null },
    })
    const { GET } = await import('@/app/api/mood/latest/route')

    const res = await GET(
      getRequest('http://localhost/api/mood/latest?linkId=link-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.checkins).toHaveLength(2)
    expect(json.checkins).toEqual([
      { user_id: 'user-a', emoji: '😊', created_at: '2026-01-03' },
      { user_id: 'user-b', emoji: '🥳', created_at: '2026-01-02' },
    ])
  })
})
