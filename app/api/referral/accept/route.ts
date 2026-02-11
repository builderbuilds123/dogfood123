import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { referralCode } = await request.json()

  if (!referralCode) {
    return NextResponse.json({ error: 'Missing referral code' }, { status: 400 })
  }

  // Look up the referrer
  const { data: referrer } = await supabase
    .from('profiles')
    .select('id, persona, referral_code')
    .eq('referral_code', referralCode)
    .single()

  if (!referrer) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
  }

  if (referrer.id === user.id) {
    return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 })
  }

  if (!referrer.persona) {
    return NextResponse.json({ error: 'Referrer has no persona' }, { status: 400 })
  }

  // Check if either user is already linked
  const { data: existingLink } = await supabase
    .from('user_links')
    .select('id')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id},user_a.eq.${referrer.id},user_b.eq.${referrer.id}`)
    .maybeSingle()

  if (existingLink) {
    return NextResponse.json({ error: 'One of the users is already linked' }, { status: 400 })
  }

  // Assign opposite persona
  const newPersona = referrer.persona === 'doggo' ? 'princess' : 'doggo'
  await supabase
    .from('profiles')
    .update({ persona: newPersona })
    .eq('id', user.id)

  // Create user_link (sort IDs for consistency)
  const [userA, userB] = [user.id, referrer.id].sort()
  const { error: linkError } = await supabase
    .from('user_links')
    .insert({ user_a: userA, user_b: userB })

  if (linkError) {
    return NextResponse.json({ error: 'Failed to create link: ' + linkError.message }, { status: 500 })
  }

  // Update referral status
  await supabase
    .from('referrals')
    .update({
      referred_user_id: user.id,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('referral_code', referralCode)
    .eq('status', 'pending')

  return NextResponse.json({ linked: true, partnerId: referrer.id, assignedPersona: newPersona })
}
