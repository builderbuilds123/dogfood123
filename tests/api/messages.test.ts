import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockSupabase, jsonRequest, getRequest } from '../helpers'

// ---------------------------------------------------------------------------
// GET /api/messages/history
// ---------------------------------------------------------------------------
describe('GET /api/messages/history', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { GET } = await import('@/app/api/messages/history/route')

    const res = await GET(getRequest('http://localhost/api/messages/history'))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 400 when linkId is missing', async () => {
    mockSupabase()
    const { GET } = await import('@/app/api/messages/history/route')

    const res = await GET(getRequest('http://localhost/api/messages/history'))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toMatchObject({ error: 'Missing linkId' })
  })

  it('returns messages array on success', async () => {
    const messages = [
      { id: 'msg-1', content: 'hello', created_at: '2025-01-01T00:00:00Z' },
      { id: 'msg-2', content: 'world', created_at: '2025-01-01T00:01:00Z' },
    ]

    const { chain } = mockSupabase({
      queryResult: { data: messages, error: null },
    })
    const { GET } = await import('@/app/api/messages/history/route')

    const res = await GET(
      getRequest('http://localhost/api/messages/history?linkId=link-123'),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toMatchObject({ messages })
    expect(chain.eq).toHaveBeenCalledWith('link_id', 'link-123')
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(chain.limit).toHaveBeenCalledWith(50)
  })

  it('supports cursor-based pagination', async () => {
    const { chain } = mockSupabase({
      queryResult: { data: [], error: null },
    })
    const { GET } = await import('@/app/api/messages/history/route')

    const cursor = '2025-01-01T00:00:00Z'
    const res = await GET(
      getRequest(
        `http://localhost/api/messages/history?linkId=link-123&cursor=${cursor}&limit=20`,
      ),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toMatchObject({ messages: [] })
    expect(chain.lt).toHaveBeenCalledWith('created_at', cursor)
    expect(chain.limit).toHaveBeenCalledWith(20)
  })

  it('returns 500 when query errors', async () => {
    mockSupabase({
      queryResult: { data: null, error: { message: 'db error' } },
    })
    const { GET } = await import('@/app/api/messages/history/route')

    const res = await GET(
      getRequest('http://localhost/api/messages/history?linkId=link-123'),
    )
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toMatchObject({ error: 'db error' })
  })
})

// ---------------------------------------------------------------------------
// POST /api/messages/send
// ---------------------------------------------------------------------------
describe('POST /api/messages/send', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { POST } = await import('@/app/api/messages/send/route')

    const res = await POST(
      jsonRequest('http://localhost/api/messages/send', 'POST', {
        linkId: 'link-1',
        receiverId: 'user-b',
        messageType: 'text',
        content: 'hi',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 400 when required fields are missing', async () => {
    mockSupabase()
    const { POST } = await import('@/app/api/messages/send/route')

    // Missing receiverId and messageType
    const res = await POST(
      jsonRequest('http://localhost/api/messages/send', 'POST', {
        linkId: 'link-1',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toMatchObject({ error: 'Missing required fields' })
  })

  it('returns 400 when linkId is missing', async () => {
    mockSupabase()
    const { POST } = await import('@/app/api/messages/send/route')

    const res = await POST(
      jsonRequest('http://localhost/api/messages/send', 'POST', {
        receiverId: 'user-b',
        messageType: 'text',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toMatchObject({ error: 'Missing required fields' })
  })

  it('returns 200 with message on success', async () => {
    const insertedMessage = {
      id: 'msg-new',
      link_id: 'link-1',
      sender_id: 'user-aaa-111',
      receiver_id: 'user-b',
      message_type: 'text',
      content: 'hello',
      media_url: null,
      media_metadata: {},
    }

    const { chain, fromMock } = mockSupabase({
      queryResult: { data: insertedMessage, error: null },
    })
    const { POST } = await import('@/app/api/messages/send/route')

    const res = await POST(
      jsonRequest('http://localhost/api/messages/send', 'POST', {
        linkId: 'link-1',
        receiverId: 'user-b',
        messageType: 'text',
        content: 'hello',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toMatchObject({ message: insertedMessage })
    expect(fromMock).toHaveBeenCalledWith('messages')
    expect(chain.insert).toHaveBeenCalledWith({
      link_id: 'link-1',
      sender_id: 'user-aaa-111',
      receiver_id: 'user-b',
      message_type: 'text',
      content: 'hello',
      media_url: null,
      media_metadata: {},
    })
    expect(chain.select).toHaveBeenCalled()
    expect(chain.single).toHaveBeenCalled()
  })

  it('handles null content and mediaUrl gracefully', async () => {
    const insertedMessage = {
      id: 'msg-media',
      link_id: 'link-1',
      sender_id: 'user-aaa-111',
      receiver_id: 'user-b',
      message_type: 'image',
      content: null,
      media_url: null,
      media_metadata: {},
    }

    const { chain } = mockSupabase({
      queryResult: { data: insertedMessage, error: null },
    })
    const { POST } = await import('@/app/api/messages/send/route')

    // Omit content and mediaUrl entirely
    const res = await POST(
      jsonRequest('http://localhost/api/messages/send', 'POST', {
        linkId: 'link-1',
        receiverId: 'user-b',
        messageType: 'image',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toMatchObject({ message: insertedMessage })
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        content: null,
        media_url: null,
        media_metadata: {},
      }),
    )
  })

  it('returns 500 when insert errors', async () => {
    mockSupabase({
      queryResult: { data: null, error: { message: 'insert failed' } },
    })
    const { POST } = await import('@/app/api/messages/send/route')

    const res = await POST(
      jsonRequest('http://localhost/api/messages/send', 'POST', {
        linkId: 'link-1',
        receiverId: 'user-b',
        messageType: 'text',
        content: 'hi',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toMatchObject({ error: 'insert failed' })
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/messages/status
// ---------------------------------------------------------------------------
describe('PATCH /api/messages/status', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { PATCH } = await import('@/app/api/messages/status/route')

    const res = await PATCH(
      jsonRequest('http://localhost/api/messages/status', 'PATCH', {
        messageIds: ['msg-1'],
        status: 'read',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 400 when messageIds is missing', async () => {
    mockSupabase()
    const { PATCH } = await import('@/app/api/messages/status/route')

    const res = await PATCH(
      jsonRequest('http://localhost/api/messages/status', 'PATCH', {
        status: 'read',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toMatchObject({ error: 'Missing messageIds' })
  })

  it('returns 400 when messageIds is empty array', async () => {
    mockSupabase()
    const { PATCH } = await import('@/app/api/messages/status/route')

    const res = await PATCH(
      jsonRequest('http://localhost/api/messages/status', 'PATCH', {
        messageIds: [],
        status: 'read',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toMatchObject({ error: 'Missing messageIds' })
  })

  it('returns 400 when status is invalid', async () => {
    mockSupabase()
    const { PATCH } = await import('@/app/api/messages/status/route')

    const res = await PATCH(
      jsonRequest('http://localhost/api/messages/status', 'PATCH', {
        messageIds: ['msg-1'],
        status: 'invalid-status',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toMatchObject({ error: 'Invalid status' })
  })

  it('returns 200 on success with delivered status', async () => {
    const { chain, fromMock } = mockSupabase({
      queryResult: { data: null, error: null },
    })
    const { PATCH } = await import('@/app/api/messages/status/route')

    const res = await PATCH(
      jsonRequest('http://localhost/api/messages/status', 'PATCH', {
        messageIds: ['msg-1', 'msg-2'],
        status: 'delivered',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toMatchObject({ success: true })
    expect(fromMock).toHaveBeenCalledWith('messages')
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'delivered' }),
    )
    expect(chain.in).toHaveBeenCalledWith('id', ['msg-1', 'msg-2'])
    expect(chain.eq).toHaveBeenCalledWith('receiver_id', 'user-aaa-111')
  })

  it('returns 200 on success with read status', async () => {
    mockSupabase({
      queryResult: { data: null, error: null },
    })
    const { PATCH } = await import('@/app/api/messages/status/route')

    const res = await PATCH(
      jsonRequest('http://localhost/api/messages/status', 'PATCH', {
        messageIds: ['msg-1'],
        status: 'read',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toMatchObject({ success: true })
  })

  it('returns 500 when update errors', async () => {
    mockSupabase({
      queryResult: { data: null, error: { message: 'update failed' } },
    })
    const { PATCH } = await import('@/app/api/messages/status/route')

    const res = await PATCH(
      jsonRequest('http://localhost/api/messages/status', 'PATCH', {
        messageIds: ['msg-1'],
        status: 'read',
      }),
    )
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toMatchObject({ error: 'update failed' })
  })
})
