import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code, persona')
    .eq('id', user.id)
    .single()

  if (!profile?.persona) {
    return NextResponse.json({ error: 'Must select persona first' }, { status: 400 })
  }

  const { data: existingLink } = await supabase
    .from('user_links')
    .select('id')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .maybeSingle()

  if (existingLink) {
    return NextResponse.json({ error: 'Already linked to a partner' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const url = `${appUrl}/signup?ref=${profile.referral_code}`

  return NextResponse.json({ url, referralCode: profile.referral_code })
}
