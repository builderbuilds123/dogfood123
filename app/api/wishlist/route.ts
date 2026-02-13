import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { linkId, title, category } = await request.json()

  if (!linkId || !title?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('wishlist_items')
    .insert({
      link_id: linkId,
      user_id: user.id,
      title: title.trim(),
      category: category || 'other',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, completed, title } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Missing item id' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (typeof completed === 'boolean') {
    updates.completed = completed
    updates.completed_by = completed ? user.id : null
    updates.completed_at = completed ? new Date().toISOString() : null
  }

  if (typeof title === 'string') {
    updates.title = title.trim()
  }

  const { data, error } = await supabase
    .from('wishlist_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Missing item id' }, { status: 400 })
  }

  const { error } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
