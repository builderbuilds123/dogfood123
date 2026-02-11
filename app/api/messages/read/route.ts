import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messageIds } = await request.json()

  if (!messageIds || !Array.isArray(messageIds)) {
    return NextResponse.json({ error: 'Missing messageIds' }, { status: 400 })
  }

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .in('id', messageIds)
    .eq('receiver_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
