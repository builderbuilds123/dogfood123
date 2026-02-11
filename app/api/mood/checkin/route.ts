import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { linkId, emoji, note } = body

  if (!linkId || !emoji) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (note && note.length > 100) {
    return NextResponse.json({ error: 'Note too long (max 100 chars)' }, { status: 400 })
  }

  const { data: checkin, error } = await supabase
    .from('mood_checkins')
    .insert({
      link_id: linkId,
      user_id: user.id,
      emoji,
      note: note || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ checkin })
}
