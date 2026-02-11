import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const linkId = searchParams.get('linkId')
  const cursor = searchParams.get('cursor')
  const limit = parseInt(searchParams.get('limit') || '50')

  if (!linkId) {
    return NextResponse.json({ error: 'Missing linkId' }, { status: 400 })
  }

  let query = supabase
    .from('messages')
    .select('*')
    .eq('link_id', linkId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: data })
}
