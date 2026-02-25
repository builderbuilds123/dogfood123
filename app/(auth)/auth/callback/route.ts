import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/blackhole'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // After email confirmation, update profile with persona from user metadata
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const persona = user.user_metadata?.persona
        const displayName = user.user_metadata?.display_name

        if (persona) {
          await supabase
            .from('profiles')
            .update({ persona, display_name: displayName })
            .eq('id', user.id)
        }
      }

      // If persona still not set, redirect to select-persona
      const { data: profile } = await supabase
        .from('profiles')
        .select('persona')
        .eq('id', user!.id)
        .single()

      if (!profile?.persona) {
        return NextResponse.redirect(`${origin}/select-persona`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}
