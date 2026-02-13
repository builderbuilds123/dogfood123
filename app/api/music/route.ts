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

  const { data, error } = await supabase
    .from('shared_songs')
    .select('*')
    .eq('link_id', linkId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ songs: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { linkId, trackName, artistName, artworkUrl, trackViewUrl, previewUrl } = await request.json()

  if (!linkId || !trackName?.trim() || !artistName?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('shared_songs')
    .insert({
      link_id: linkId,
      user_id: user.id,
      track_name: trackName.trim(),
      artist_name: artistName.trim(),
      artwork_url: artworkUrl || null,
      track_view_url: trackViewUrl || null,
      preview_url: previewUrl || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ song: data })
}
