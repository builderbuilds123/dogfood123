import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockSupabase, jsonRequest, getRequest } from '../helpers'

// ─── GET /api/streak ────────────────────────────────────────────────────
describe('GET /api/streak', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { GET } = await import('@/app/api/streak/route')
    const res = await GET(getRequest('http://localhost/api/streak?linkId=link-1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when linkId missing', async () => {
    mockSupabase()
    const { GET } = await import('@/app/api/streak/route')
    const res = await GET(getRequest('http://localhost/api/streak'))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Missing linkId' })
  })

  it('returns streak count on success', async () => {
    mockSupabase({ rpcResult: { data: 7, error: null } })
    const { GET } = await import('@/app/api/streak/route')
    const res = await GET(getRequest('http://localhost/api/streak?linkId=link-1'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ streak: 7 })
  })

  it('defaults streak to 0 when rpc returns null', async () => {
    mockSupabase({ rpcResult: { data: null, error: null } })
    const { GET } = await import('@/app/api/streak/route')
    const res = await GET(getRequest('http://localhost/api/streak?linkId=link-1'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ streak: 0 })
  })

  it('returns 500 on rpc error', async () => {
    mockSupabase({ rpcResult: { data: null, error: { message: 'rpc failed' } } })
    const { GET } = await import('@/app/api/streak/route')
    const res = await GET(getRequest('http://localhost/api/streak?linkId=link-1'))
    expect(res.status).toBe(500)
  })
})

// ─── GET /api/recap ─────────────────────────────────────────────────────
describe('GET /api/recap', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { GET } = await import('@/app/api/recap/route')
    const res = await GET(getRequest('http://localhost/api/recap?linkId=link-1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when linkId missing', async () => {
    mockSupabase()
    const { GET } = await import('@/app/api/recap/route')
    const res = await GET(getRequest('http://localhost/api/recap'))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Missing linkId' })
  })

  it('returns recaps array when all=true', async () => {
    const recaps = [{ id: 'r-1', week_start: '2026-01-01' }]
    mockSupabase({ queryResult: { data: recaps, error: null } })
    const { GET } = await import('@/app/api/recap/route')
    const res = await GET(getRequest('http://localhost/api/recap?linkId=link-1&all=true'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('recaps')
  })

  it('returns recap on default (single) query', async () => {
    // The route first queries weekly_recaps via .maybeSingle(), then may call rpc.
    // With our mock, .maybeSingle() returns the queryResult data.
    // If data is null, the route proceeds to rpc; if rpc also returns null, it fetches again.
    // For a simple test, when the existing recap's week_start doesn't match lastMonday,
    // the route falls through to rpc → fetch new recap. Our mock resolves all these.
    mockSupabase({
      queryResult: { data: null, error: null },
      rpcResult: { data: { generated: true }, error: null },
    })
    const { GET } = await import('@/app/api/recap/route')
    const res = await GET(getRequest('http://localhost/api/recap?linkId=link-1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('recap')
  })
})

// ─── POST /api/referral/generate ────────────────────────────────────────
describe('POST /api/referral/generate', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { POST } = await import('@/app/api/referral/generate/route')
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('returns 400 when persona not set', async () => {
    // .single() returns profile with persona: null
    mockSupabase({
      queryResult: { data: { referral_code: 'ref-abc', persona: null }, error: null },
    })
    const { POST } = await import('@/app/api/referral/generate/route')
    const res = await POST()
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Must select persona first' })
  })

  it('returns 400 when already linked', async () => {
    // .single() returns profile with persona, then .maybeSingle() returns a link
    // Since our mock returns the same chain for all from() calls:
    // .single() resolves to data, .maybeSingle() also resolves to data
    // So if data is { persona: 'doggo', referral_code: 'abc', id: 'link-1' },
    // profile?.persona is truthy, and existingLink is truthy → "Already linked"
    mockSupabase({
      queryResult: {
        data: { referral_code: 'ref-abc', persona: 'doggo', id: 'link-1' },
        error: null,
      },
    })
    const { POST } = await import('@/app/api/referral/generate/route')
    const res = await POST()
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Already linked to a partner' })
  })
})

// ─── POST /api/referral/accept ──────────────────────────────────────────
describe('POST /api/referral/accept', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { POST } = await import('@/app/api/referral/accept/route')
    const req = jsonRequest('http://localhost/api/referral/accept', 'POST', { referralCode: 'abc' })
    expect((await POST(req)).status).toBe(401)
  })

  it('returns 400 when referralCode missing', async () => {
    mockSupabase()
    const { POST } = await import('@/app/api/referral/accept/route')
    const res = await POST(jsonRequest('http://localhost/api/referral/accept', 'POST', {}))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Missing referral code' })
  })

  it('returns success data on successful accept', async () => {
    const rpcData = { linked: true, link_id: 'new-link', partner_id: 'p-1', persona: 'princess' }
    mockSupabase({ rpcResult: { data: rpcData, error: null } })
    const { POST } = await import('@/app/api/referral/accept/route')
    const res = await POST(jsonRequest('http://localhost/api/referral/accept', 'POST', {
      referralCode: 'valid-code',
    }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ linked: true })
  })

  it('returns 500 on rpc error', async () => {
    mockSupabase({ rpcResult: { data: null, error: { message: 'rpc failed' } } })
    const { POST } = await import('@/app/api/referral/accept/route')
    const res = await POST(jsonRequest('http://localhost/api/referral/accept', 'POST', {
      referralCode: 'bad-code',
    }))
    expect(res.status).toBe(500)
  })

  it('returns 400 when rpc returns data-level error', async () => {
    mockSupabase({ rpcResult: { data: { error: 'Invalid referral code' }, error: null } })
    const { POST } = await import('@/app/api/referral/accept/route')
    const res = await POST(jsonRequest('http://localhost/api/referral/accept', 'POST', {
      referralCode: 'bad-code',
    }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Invalid referral code' })
  })
})

// ─── POST /api/upload ───────────────────────────────────────────────────
describe('POST /api/upload', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { POST } = await import('@/app/api/upload/route')
    const formData = new FormData()
    formData.append('file', new Blob(['test'], { type: 'image/png' }), 'test.png')
    formData.append('type', 'image')
    const req = new Request('http://localhost/api/upload', { method: 'POST', body: formData })
    expect((await POST(req)).status).toBe(401)
  })

  it('returns 400 when file or type missing', async () => {
    mockSupabase()
    const { POST } = await import('@/app/api/upload/route')
    const formData = new FormData()
    // No file, no type
    const req = new Request('http://localhost/api/upload', { method: 'POST', body: formData })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Missing file or type' })
  })

  it('returns url and metadata on success', async () => {
    mockSupabase({
      storageUpload: { data: { path: 'user-aaa-111/123-uuid.png' }, error: null },
      storageSignedUrl: { data: { signedUrl: 'https://signed.url/file.png' }, error: null },
    })
    const { POST } = await import('@/app/api/upload/route')
    const formData = new FormData()
    formData.append('file', new Blob(['test-image-data'], { type: 'image/png' }), 'photo.png')
    formData.append('type', 'image')
    const req = new Request('http://localhost/api/upload', { method: 'POST', body: formData })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toBe('https://signed.url/file.png')
    expect(json.path).toBe('user-aaa-111/123-uuid.png')
    expect(json.metadata).toMatchObject({ mimeType: 'image/png' })
  })

  it('returns 500 when storage upload fails', async () => {
    mockSupabase({
      storageUpload: { data: null, error: { message: 'upload failed' } },
    })
    const { POST } = await import('@/app/api/upload/route')
    const formData = new FormData()
    formData.append('file', new Blob(['data'], { type: 'audio/webm' }), 'voice.webm')
    formData.append('type', 'audio')
    const req = new Request('http://localhost/api/upload', { method: 'POST', body: formData })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})

// ─── /api/wishlist (POST, PATCH, DELETE) ────────────────────────────────
describe('POST /api/wishlist', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { POST } = await import('@/app/api/wishlist/route')
    const req = jsonRequest('http://localhost/api/wishlist', 'POST', { linkId: 'l-1', title: 'Wish' })
    expect((await POST(req)).status).toBe(401)
  })

  it('returns 400 when title missing', async () => {
    mockSupabase()
    const { POST } = await import('@/app/api/wishlist/route')
    const res = await POST(jsonRequest('http://localhost/api/wishlist', 'POST', { linkId: 'l-1' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Missing required fields' })
  })

  it('returns 400 when title is whitespace only', async () => {
    mockSupabase()
    const { POST } = await import('@/app/api/wishlist/route')
    const res = await POST(jsonRequest('http://localhost/api/wishlist', 'POST', {
      linkId: 'l-1', title: '   ',
    }))
    expect(res.status).toBe(400)
  })

  it('returns 200 with item on success', async () => {
    const item = { id: 'w-1', title: 'Trip to Paris', category: 'travel' }
    mockSupabase({ queryResult: { data: item, error: null } })
    const { POST } = await import('@/app/api/wishlist/route')
    const res = await POST(jsonRequest('http://localhost/api/wishlist', 'POST', {
      linkId: 'l-1', title: 'Trip to Paris', category: 'travel',
    }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ item })
  })
})

describe('PATCH /api/wishlist', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { PATCH } = await import('@/app/api/wishlist/route')
    const req = jsonRequest('http://localhost/api/wishlist', 'PATCH', { id: 'w-1', completed: true })
    expect((await PATCH(req)).status).toBe(401)
  })

  it('returns 400 when id missing', async () => {
    mockSupabase()
    const { PATCH } = await import('@/app/api/wishlist/route')
    const res = await PATCH(jsonRequest('http://localhost/api/wishlist', 'PATCH', { completed: true }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Missing item id' })
  })

  it('returns 200 with updated item on success', async () => {
    const item = { id: 'w-1', title: 'Trip', completed: true }
    mockSupabase({ queryResult: { data: item, error: null } })
    const { PATCH } = await import('@/app/api/wishlist/route')
    const res = await PATCH(jsonRequest('http://localhost/api/wishlist', 'PATCH', {
      id: 'w-1', completed: true,
    }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ item })
  })
})

describe('DELETE /api/wishlist', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { DELETE } = await import('@/app/api/wishlist/route')
    const req = jsonRequest('http://localhost/api/wishlist', 'DELETE', { id: 'w-1' })
    expect((await DELETE(req)).status).toBe(401)
  })

  it('returns 400 when id missing', async () => {
    mockSupabase()
    const { DELETE } = await import('@/app/api/wishlist/route')
    const res = await DELETE(jsonRequest('http://localhost/api/wishlist', 'DELETE', {}))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Missing item id' })
  })

  it('returns 200 with deleted:true on success', async () => {
    mockSupabase({ queryResult: { data: null, error: null } })
    const { DELETE } = await import('@/app/api/wishlist/route')
    const res = await DELETE(jsonRequest('http://localhost/api/wishlist', 'DELETE', { id: 'w-1' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ deleted: true })
  })
})
