import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { linkId } = await request.json()

  if (!linkId) {
    return NextResponse.json({ error: 'Missing linkId' }, { status: 400 })
  }

  // Mark all unseen pings (sent by partner, not by me) as seen
  const { error } = await supabase
    .from('pings')
    .update({ seen_at: new Date().toISOString() })
    .eq('link_id', linkId)
    .neq('sender_id', user.id)
    .is('seen_at', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
