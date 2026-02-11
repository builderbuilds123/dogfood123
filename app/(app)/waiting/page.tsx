import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WaitingRoom } from '@/components/waiting/WaitingRoom'

export default async function WaitingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if already linked
  const { data: link } = await supabase
    .from('user_links')
    .select('id')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .maybeSingle()

  if (link) redirect('/blackhole')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return <WaitingRoom userId={user.id} referralCode={profile?.referral_code || ''} />
}
