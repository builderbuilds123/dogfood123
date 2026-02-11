import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReplayView } from '@/components/replay/ReplayView'

export default async function ReplayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Find link
  const { data: link } = await supabase
    .from('user_links')
    .select('*')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .maybeSingle()

  if (!link) redirect('/waiting')

  // Fetch all messages for replay
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('link_id', link.id)
    .order('created_at', { ascending: true })

  return <ReplayView messages={messages || []} userId={user.id} />
}
