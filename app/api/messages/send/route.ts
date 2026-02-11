import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { linkId, receiverId, messageType, content, mediaUrl, mediaMetadata } = body

  if (!linkId || !receiverId || !messageType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate the user is part of this link
  const { data: link } = await supabase
    .from('user_links')
    .select('id, user_a, user_b')
    .eq('id', linkId)
    .single()

  if (!link || (link.user_a !== user.id && link.user_b !== user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      link_id: linkId,
      sender_id: user.id,
      receiver_id: receiverId,
      message_type: messageType,
      content: content || null,
      media_url: mediaUrl || null,
      media_metadata: mediaMetadata || {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message })
}
