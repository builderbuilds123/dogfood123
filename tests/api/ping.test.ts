import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockSupabase, jsonRequest, getRequest } from '../helpers'

// ---------------------------------------------------------------------------
// POST /api/ping
// ---------------------------------------------------------------------------
describe('POST /api/ping', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })

    const { POST } = await import('@/app/api/ping/route')
    const res = await POST(jsonRequest('http://localhost/api/ping', 'POST', { linkId: 'link-1' }))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when linkId is missing', async () => {
    mockSupabase()

    const { POST } = await import('@/app/api/ping/route')
    const res = await POST(jsonRequest('http://localhost/api/ping', 'POST', {}))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Missing linkId')
  })

  it('returns 200 with ping on success', async () => {
    const pingData = { id: 'ping-1', link_id: 'link-1', sender_id: 'user-aaa-111' }
    mockSupabase({
      queryResult: { data: pingData, error: null },
    })

    const { POST } = await import('@/app/api/ping/route')
    const res = await POST(jsonRequest('http://localhost/api/ping', 'POST', { linkId: 'link-1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ping).toEqual(pingData)
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/ping/seen
// ---------------------------------------------------------------------------
describe('PATCH /api/ping/seen', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })

    const { PATCH } = await import('@/app/api/ping/seen/route')
    const res = await PATCH(jsonRequest('http://localhost/api/ping/seen', 'PATCH', { linkId: 'link-1' }))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when linkId is missing', async () => {
    mockSupabase()

    const { PATCH } = await import('@/app/api/ping/seen/route')
    const res = await PATCH(jsonRequest('http://localhost/api/ping/seen', 'PATCH', {}))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Missing linkId')
  })

  it('returns 200 with ok:true on success', async () => {
    mockSupabase({
      queryResult: { data: null, error: null },
    })

    const { PATCH } = await import('@/app/api/ping/seen/route')
    const res = await PATCH(jsonRequest('http://localhost/api/ping/seen', 'PATCH', { linkId: 'link-1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// GET /api/ping/unseen
// ---------------------------------------------------------------------------
describe('GET /api/ping/unseen', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })

    const { GET } = await import('@/app/api/ping/unseen/route')
    const res = await GET(getRequest('http://localhost/api/ping/unseen?linkId=link-1'))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when linkId is missing', async () => {
    mockSupabase()

    const { GET } = await import('@/app/api/ping/unseen/route')
    const res = await GET(getRequest('http://localhost/api/ping/unseen'))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Missing linkId')
  })

  it('returns count on success', async () => {
    mockSupabase({
      queryResult: { data: null, error: null, count: 5 },
    })

    const { GET } = await import('@/app/api/ping/unseen/route')
    const res = await GET(getRequest('http://localhost/api/ping/unseen?linkId=link-1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.count).toBe(5)
  })
})
