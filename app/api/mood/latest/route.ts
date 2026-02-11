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

  // Get the latest check-in from each user in the link
  // We fetch the 2 most recent check-ins per user using DISTINCT ON
  const { data, error } = await supabase
    .from('mood_checkins')
    .select('*')
    .eq('link_id', linkId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get latest per user
  const latestByUser = new Map<string, typeof data[0]>()
  for (const checkin of data ?? []) {
    if (!latestByUser.has(checkin.user_id)) {
      latestByUser.set(checkin.user_id, checkin)
    }
    if (latestByUser.size >= 2) break
  }

  return NextResponse.json({ checkins: Array.from(latestByUser.values()) })
}
