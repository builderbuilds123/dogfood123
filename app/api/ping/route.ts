import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { linkId } = await request.json()

  if (!linkId) {
    return NextResponse.json({ error: 'Missing linkId' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('pings')
    .insert({ link_id: linkId, sender_id: user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ping: data })
}
