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

  // Fetch all data in parallel (async-parallel: eliminates sequential waterfall)
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: allMessages },
    { data: moodData },
    { data: wishlistData },
    { count: unseenPingCount },
    { data: latestSong },
    { data: nextEvent },
    { data: latestRecap },
  ] = await Promise.all([
    supabase
      .from('messages')
      .select('*')
      .eq('link_id', link.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('mood_checkins')
      .select('*')
      .eq('link_id', link.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('wishlist_items')
      .select('*')
      .eq('link_id', link.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('pings')
      .select('*', { count: 'exact', head: true })
      .eq('link_id', link.id)
      .neq('sender_id', user.id)
      .is('seen_at', null),
    supabase
      .from('shared_songs')
      .select('*')
      .eq('link_id', link.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('calendar_events')
      .select('*')
      .eq('link_id', link.id)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('weekly_recaps')
      .select('*')
      .eq('link_id', link.id)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const all = allMessages || []

  // Split: messages already seen are history; undelivered messages for this user animate on load
  const history = all.filter(
    m => m.status !== 'sent' || m.sender_id === user.id
  )
  const pendingDelivery = all.filter(
    m => m.status === 'sent' && m.receiver_id === user.id
  )

  // Derive partner mood from fetched data
  const moods = moodData ?? []
  const latestMoods = new Map<string, (typeof moods)[0]>()
  for (const checkin of moods) {
    if (!latestMoods.has(checkin.user_id)) {
      latestMoods.set(checkin.user_id, checkin)
    }
    if (latestMoods.size >= 2) break
  }
  const partnerMood = latestMoods.get(partnerId) ?? null

  // Extract image messages for photo gallery (newest first)
  const photos = all
    .filter(m => m.message_type === 'image')
    .reverse()

  // Show recap notification on Sundays
  const isSunday = new Date().getDay() === 0

  return (
    <BlackholeScene
      userId={user.id}
      partner={partner}
      link={link}
      initialMessages={history}
      pendingDeliveryMessages={pendingDelivery}
      initialPartnerMood={partnerMood}
      initialWishlistItems={wishlistData || []}
      initialPhotos={photos}
      initialUnseenPingCount={unseenPingCount || 0}
      initialLatestSong={latestSong || null}
      initialNextEvent={nextEvent || null}
      initialRecap={latestRecap || null}
      showRecapNotification={isSunday && !!latestRecap}
    />
  )
}
