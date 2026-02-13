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

  if (!linkId) {
    return NextResponse.json({ error: 'Missing linkId' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('get_streak', { p_link_id: linkId })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ streak: data ?? 0 })
}
