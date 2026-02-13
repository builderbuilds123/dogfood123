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
  const all = searchParams.get('all')

  if (!linkId) {
    return NextResponse.json({ error: 'Missing linkId' }, { status: 400 })
  }

  if (all === 'true') {
    const { data, error } = await supabase
      .from('weekly_recaps')
      .select('*')
      .eq('link_id', linkId)
      .order('week_start', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ recaps: data })
  }

  // Check for the most recent recap
  const { data: existing } = await supabase
    .from('weekly_recaps')
    .select('*')
    .eq('link_id', linkId)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Calculate last week's Monday
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay() // ISO day (Mon=1, Sun=7)
  const lastMonday = new Date(now)
  lastMonday.setDate(now.getDate() - dayOfWeek - 6) // Go to last week's Monday
  lastMonday.setHours(0, 0, 0, 0)
  const lastMondayStr = lastMonday.toISOString().split('T')[0]

  // If we already have a recap for last week, return it
  if (existing && existing.week_start === lastMondayStr) {
    return NextResponse.json({ recap: existing })
  }

  // Lazy generation: generate recap for last completed week
  const { data: result, error: rpcError } = await supabase.rpc('generate_weekly_recap', {
    p_link_id: linkId,
  })

  if (rpcError) {
    // If the RPC fails (table might not exist yet), return existing or null
    return NextResponse.json({ recap: existing || null })
  }

  // If it already existed, fetch and return it
  if (result && typeof result === 'object' && 'exists' in result) {
    const { data: recap } = await supabase
      .from('weekly_recaps')
      .select('*')
      .eq('id', (result as { exists: boolean; id: string }).id)
      .single()

    return NextResponse.json({ recap })
  }

  // Fetch the newly created recap
  const { data: newRecap } = await supabase
    .from('weekly_recaps')
    .select('*')
    .eq('link_id', linkId)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ recap: newRecap })
}
