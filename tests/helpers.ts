import { vi } from 'vitest'

// -------------------------------------------------------------------
// Supabase mock builder
// -------------------------------------------------------------------
// The Supabase JS client uses a fluent/chainable API:
//   supabase.from('table').select('*').eq('col', val).single()
// Each method returns the builder so we need every method to return `this`.
// The terminal methods (.single(), .maybeSingle(), awaiting the builder)
// resolve to { data, error }.
// -------------------------------------------------------------------

export interface MockUser {
  id: string
  email: string
}

interface ChainResult {
  data: unknown
  error: unknown
  count?: number | null
}

/** Creates a chainable mock that mimics the Supabase query builder. */
function createChain(result: ChainResult) {
  const chain: Record<string, unknown> = {}

  // Every chainable method returns the chain itself
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'in', 'is', 'or', 'not', 'like', 'ilike',
    'order', 'limit', 'range', 'filter',
    'textSearch', 'match', 'contains', 'containedBy',
    'overlaps', 'csv',
  ]

  for (const m of chainMethods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }

  // Terminal methods resolve the result
  chain.single = vi.fn().mockResolvedValue(result)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)

  // When the chain is awaited directly (no .single()), it resolves too.
  // Vitest/JS awaits the `.then` property if present.
  chain.then = (resolve: (v: ChainResult) => void) => Promise.resolve(result).then(resolve)

  return chain
}

export interface SupabaseMockConfig {
  user?: MockUser | null       // null = unauthenticated
  queryResult?: ChainResult    // default result for from().select() etc
  rpcResult?: ChainResult      // result for supabase.rpc()
  storageUpload?: { data: { path: string } | null; error: unknown }
  storageSignedUrl?: { data: { signedUrl: string } | null; error: unknown }
}

const DEFAULT_USER: MockUser = { id: 'user-aaa-111', email: 'test@example.com' }

/**
 * Mocks `@/lib/supabase/server` so that `createClient()` returns a
 * controllable fake Supabase client.  Call this inside `beforeEach` or at
 * the top of a test file.
 *
 * Returns the mock client so tests can further customise individual calls.
 */
export function mockSupabase(config: SupabaseMockConfig = {}) {
  const {
    user = DEFAULT_USER,
    queryResult = { data: null, error: null },
    rpcResult = { data: null, error: null },
    storageUpload = { data: { path: 'test/path.png' }, error: null },
    storageSignedUrl = { data: { signedUrl: 'https://signed.url/file' }, error: null },
  } = config

  const chain = createChain(queryResult)

  const fromMock = vi.fn().mockReturnValue(chain)
  const rpcMock = vi.fn().mockResolvedValue(rpcResult)

  const storageBucket = {
    upload: vi.fn().mockResolvedValue(storageUpload),
    createSignedUrl: vi.fn().mockResolvedValue(storageSignedUrl),
  }
  const storageMock = { from: vi.fn().mockReturnValue(storageBucket) }

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    from: fromMock,
    rpc: rpcMock,
    storage: storageMock,
  }

  vi.doMock('@/lib/supabase/server', () => ({
    createClient: vi.fn().mockResolvedValue(client),
  }))

  return { client, chain, fromMock, rpcMock, storageMock, storageBucket }
}

// -------------------------------------------------------------------
// Request helpers
// -------------------------------------------------------------------

export function jsonRequest(
  url: string,
  method: string,
  body?: Record<string, unknown>,
): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

export function getRequest(url: string): Request {
  return new Request(url, { method: 'GET' })
}
