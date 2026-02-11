import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BlackholeScene } from '@/components/blackhole/BlackholeScene'

export default async function BlackholePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.persona) redirect('/signup')

  // Find linked partner
  const { data: link } = await supabase
    .from('user_links')
    .select('*')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .maybeSingle()

  if (!link) redirect('/waiting')

  const partnerId = link.user_a === user.id ? link.user_b : link.user_a
  const { data: partner } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', partnerId)
    .single()

  if (!partner) redirect('/waiting')

  return (
    <BlackholeScene
      userId={user.id}
      partner={partner}
      link={link}
    />
  )
}
