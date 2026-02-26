import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockSupabase, jsonRequest, getRequest } from '../helpers'

// ---------------------------------------------------------------------------
// GET /api/calendar
// ---------------------------------------------------------------------------

describe('GET /api/calendar', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { GET } = await import('@/app/api/calendar/route')

    const res = await GET(
      getRequest('http://localhost/api/calendar?linkId=link-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when linkId missing', async () => {
    mockSupabase()
    const { GET } = await import('@/app/api/calendar/route')

    const res = await GET(getRequest('http://localhost/api/calendar'))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Missing linkId')
  })

  it('returns events array on success', async () => {
    const events = [
      { id: 'evt-1', link_id: 'link-1', title: 'Anniversary', event_date: '2026-06-15' },
      { id: 'evt-2', link_id: 'link-1', title: 'Birthday', event_date: '2026-09-20' },
    ]

    const { chain } = mockSupabase({
      queryResult: { data: events, error: null },
    })
    const { GET } = await import('@/app/api/calendar/route')

    const res = await GET(
      getRequest('http://localhost/api/calendar?linkId=link-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.events).toEqual(events)
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.eq).toHaveBeenCalledWith('link_id', 'link-1')
    expect(chain.order).toHaveBeenCalledWith('event_date', { ascending: true })
  })
})

// ---------------------------------------------------------------------------
// POST /api/calendar
// ---------------------------------------------------------------------------

describe('POST /api/calendar', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { POST } = await import('@/app/api/calendar/route')

    const res = await POST(
      jsonRequest('http://localhost/api/calendar', 'POST', {
        linkId: 'link-1',
        title: 'Anniversary',
        eventDate: '2026-06-15',
        eventType: 'anniversary',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when title, eventDate, or eventType missing', async () => {
    mockSupabase()
    const { POST } = await import('@/app/api/calendar/route')

    // Missing title
    const res1 = await POST(
      jsonRequest('http://localhost/api/calendar', 'POST', {
        linkId: 'link-1',
        eventDate: '2026-06-15',
        eventType: 'anniversary',
      }),
    )
    expect(res1.status).toBe(400)
    const json1 = await res1.json()
    expect(json1.error).toBe('Missing required fields')

    // Missing eventDate
    const res2 = await POST(
      jsonRequest('http://localhost/api/calendar', 'POST', {
        linkId: 'link-1',
        title: 'Anniversary',
        eventType: 'anniversary',
      }),
    )
    expect(res2.status).toBe(400)
    const json2 = await res2.json()
    expect(json2.error).toBe('Missing required fields')

    // Missing eventType
    const res3 = await POST(
      jsonRequest('http://localhost/api/calendar', 'POST', {
        linkId: 'link-1',
        title: 'Anniversary',
        eventDate: '2026-06-15',
      }),
    )
    expect(res3.status).toBe(400)
    const json3 = await res3.json()
    expect(json3.error).toBe('Missing required fields')
  })

  it('returns 200 with event on success', async () => {
    const eventRow = {
      id: 'evt-1',
      link_id: 'link-1',
      user_id: 'user-aaa-111',
      title: 'Anniversary',
      description: null,
      event_date: '2026-06-15',
      event_type: 'anniversary',
      emoji: '💕',
      recurring_yearly: false,
    }

    const { chain } = mockSupabase({
      queryResult: { data: eventRow, error: null },
    })
    const { POST } = await import('@/app/api/calendar/route')

    const res = await POST(
      jsonRequest('http://localhost/api/calendar', 'POST', {
        linkId: 'link-1',
        title: 'Anniversary',
        eventDate: '2026-06-15',
        eventType: 'anniversary',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.event).toEqual(eventRow)
    expect(chain.insert).toHaveBeenCalledWith({
      link_id: 'link-1',
      user_id: 'user-aaa-111',
      title: 'Anniversary',
      description: null,
      event_date: '2026-06-15',
      event_type: 'anniversary',
      emoji: '💕',
      recurring_yearly: false,
    })
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/calendar
// ---------------------------------------------------------------------------

describe('PATCH /api/calendar', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { PATCH } = await import('@/app/api/calendar/route')

    const res = await PATCH(
      jsonRequest('http://localhost/api/calendar', 'PATCH', {
        id: 'evt-1',
        title: 'Updated Title',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when id missing', async () => {
    mockSupabase()
    const { PATCH } = await import('@/app/api/calendar/route')

    const res = await PATCH(
      jsonRequest('http://localhost/api/calendar', 'PATCH', {
        title: 'Updated Title',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Missing event id')
  })

  it('returns 200 with updated event on success', async () => {
    const updatedRow = {
      id: 'evt-1',
      link_id: 'link-1',
      user_id: 'user-aaa-111',
      title: 'Updated Anniversary',
      description: null,
      event_date: '2026-06-15',
      event_type: 'anniversary',
      emoji: '🎉',
      recurring_yearly: false,
    }

    const { chain } = mockSupabase({
      queryResult: { data: updatedRow, error: null },
    })
    const { PATCH } = await import('@/app/api/calendar/route')

    const res = await PATCH(
      jsonRequest('http://localhost/api/calendar', 'PATCH', {
        id: 'evt-1',
        title: 'Updated Anniversary',
        emoji: '🎉',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.event).toEqual(updatedRow)
    expect(chain.update).toHaveBeenCalledWith({
      title: 'Updated Anniversary',
      emoji: '🎉',
    })
    expect(chain.eq).toHaveBeenCalledWith('id', 'evt-1')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/calendar
// ---------------------------------------------------------------------------

describe('DELETE /api/calendar', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { DELETE } = await import('@/app/api/calendar/route')

    const res = await DELETE(
      jsonRequest('http://localhost/api/calendar', 'DELETE', {
        id: 'evt-1',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when id missing', async () => {
    mockSupabase()
    const { DELETE } = await import('@/app/api/calendar/route')

    const res = await DELETE(
      jsonRequest('http://localhost/api/calendar', 'DELETE', {}),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Missing event id')
  })

  it('returns 200 with deleted:true on success', async () => {
    const { chain } = mockSupabase()
    const { DELETE } = await import('@/app/api/calendar/route')

    const res = await DELETE(
      jsonRequest('http://localhost/api/calendar', 'DELETE', {
        id: 'evt-1',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.deleted).toBe(true)
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'evt-1')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-aaa-111')
  })
})
