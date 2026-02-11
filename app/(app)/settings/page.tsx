import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsPage } from '@/components/settings/SettingsPage'

export default async function Settings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Find linked partner
  let partnerProfile = null
  const { data: link } = await supabase
    .from('user_links')
    .select('*')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .maybeSingle()

  if (link) {
    const partnerId = link.user_a === user.id ? link.user_b : link.user_a
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', partnerId)
      .single()
    partnerProfile = data
  }

  return <SettingsPage profile={profile!} partner={partnerProfile} />
}
