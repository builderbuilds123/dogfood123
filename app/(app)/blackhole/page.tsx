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

  if (!profile || !profile.persona) redirect('/select-persona')

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

  // Fetch all messages for this link
  const { data: allMessages } = await supabase
    .from('messages')
    .select('*')
    .eq('link_id', link.id)
    .order('created_at', { ascending: true })

  const all = allMessages || []

  // Split: messages already seen are history; undelivered messages for this user animate on load
  const history = all.filter(
    m => m.status !== 'sent' || m.sender_id === user.id
  )
  const pendingDelivery = all.filter(
    m => m.status === 'sent' && m.receiver_id === user.id
  )

  // Fetch latest mood check-ins for each partner
  const { data: moodData } = await supabase
    .from('mood_checkins')
    .select('*')
    .eq('link_id', link.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const moods = moodData ?? []
  const latestMoods = new Map<string, (typeof moods)[0]>()
  for (const checkin of moods) {
    if (!latestMoods.has(checkin.user_id)) {
      latestMoods.set(checkin.user_id, checkin)
    }
    if (latestMoods.size >= 2) break
  }

  const partnerMood = latestMoods.get(partnerId) ?? null

  return (
    <BlackholeScene
      userId={user.id}
      partner={partner}
      link={link}
      initialMessages={history}
      pendingDeliveryMessages={pendingDelivery}
      initialPartnerMood={partnerMood}
    />
  )
}
