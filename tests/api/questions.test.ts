import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockSupabase, jsonRequest, getRequest } from '../helpers'

// ─── GET /api/questions/today ───────────────────────────────────────────
describe('GET /api/questions/today', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { GET } = await import('@/app/api/questions/today/route')
    const res = await GET(getRequest('http://localhost/api/questions/today'))
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 400 when linkId missing', async () => {
    mockSupabase()
    const { GET } = await import('@/app/api/questions/today/route')
    const res = await GET(getRequest('http://localhost/api/questions/today'))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Missing linkId' })
  })

  it('returns question and answers on success', async () => {
    const question = { id: 'q-1', question_text: 'Fave color?', display_date: '2026-01-01' }
    // The route calls .single() for the first query (daily_questions)
    // and awaits the chain directly for the second query (question_answers).
    // Our mock resolves both paths with the same queryResult.
    mockSupabase({
      queryResult: { data: question, error: null },
    })
    const { GET } = await import('@/app/api/questions/today/route')
    const res = await GET(getRequest('http://localhost/api/questions/today?linkId=link-1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('question')
    expect(json).toHaveProperty('answers')
  })

  it('returns 404 when no questions available', async () => {
    // .single() returns null (no question for today), and the fallback
    // query also returns null/empty
    mockSupabase({
      queryResult: { data: null, error: null },
    })
    const { GET } = await import('@/app/api/questions/today/route')
    const res = await GET(getRequest('http://localhost/api/questions/today?linkId=link-1'))
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ error: 'No questions available' })
  })
})

// ─── POST /api/questions/answer ─────────────────────────────────────────
describe('POST /api/questions/answer', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const { POST } = await import('@/app/api/questions/answer/route')
    const req = jsonRequest('http://localhost/api/questions/answer', 'POST', {
      questionId: 'q-1', linkId: 'link-1', answerText: 'Blue',
    })
    expect((await POST(req)).status).toBe(401)
  })

  it('returns 400 when required fields missing', async () => {
    mockSupabase()
    const { POST } = await import('@/app/api/questions/answer/route')
    const res = await POST(jsonRequest('http://localhost/api/questions/answer', 'POST', { questionId: 'q-1' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Missing required fields' })
  })

  it('returns 400 when answerText is whitespace only', async () => {
    mockSupabase()
    const { POST } = await import('@/app/api/questions/answer/route')
    const res = await POST(jsonRequest('http://localhost/api/questions/answer', 'POST', {
      questionId: 'q-1', linkId: 'link-1', answerText: '   ',
    }))
    expect(res.status).toBe(400)
  })

  it('returns 200 with answer on success', async () => {
    const answer = { id: 'a-1', answer_text: 'Blue', question_id: 'q-1' }
    mockSupabase({ queryResult: { data: answer, error: null } })
    const { POST } = await import('@/app/api/questions/answer/route')
    const res = await POST(jsonRequest('http://localhost/api/questions/answer', 'POST', {
      questionId: 'q-1', linkId: 'link-1', answerText: 'Blue',
    }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ answer })
  })

  it('returns 409 when answer already exists (unique violation)', async () => {
    mockSupabase({
      queryResult: { data: null, error: { code: '23505', message: 'duplicate key' } },
    })
    const { POST } = await import('@/app/api/questions/answer/route')
    const res = await POST(jsonRequest('http://localhost/api/questions/answer', 'POST', {
      questionId: 'q-1', linkId: 'link-1', answerText: 'Blue',
    }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'You already answered this question' })
  })

  it('returns 500 on other database errors', async () => {
    mockSupabase({
      queryResult: { data: null, error: { code: '42P01', message: 'table not found' } },
    })
    const { POST } = await import('@/app/api/questions/answer/route')
    const res = await POST(jsonRequest('http://localhost/api/questions/answer', 'POST', {
      questionId: 'q-1', linkId: 'link-1', answerText: 'Blue',
    }))
    expect(res.status).toBe(500)
  })
})
