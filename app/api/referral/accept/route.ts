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

  // Use SECURITY DEFINER RPC to bypass RLS and handle entire referral flow
  const { data, error } = await supabase.rpc('accept_referral', {
    ref_code: referralCode,
    accepter_id: user.id,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to accept referral: ' + error.message }, { status: 500 })
  }

  if (data?.error) {
    return NextResponse.json({ error: data.error }, { status: 400 })
  }

  return NextResponse.json(data)
}
