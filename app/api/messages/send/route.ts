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

  // RLS policy enforces that sender_id = auth.uid() and link belongs to user
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
