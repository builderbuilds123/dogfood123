export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BlackholeVortex } from '@/components/blackhole/BlackholeVortex'
import { BlackholeParticles } from '@/components/blackhole/BlackholeParticles'
import { BlackholeGlow } from '@/components/blackhole/BlackholeGlow'
import { Button } from '@/components/ui/Button'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/blackhole')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 synthwave-grid opacity-30 pointer-events-none" />

      {/* Blackhole */}
      <div className="relative mb-8">
        <BlackholeGlow />
        <BlackholeParticles count={15} />
        <BlackholeVortex size="md" />
      </div>

      {/* Content */}
      <div className="text-center z-10 max-w-md">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-neon-magenta via-neon-violet to-neon-cyan bg-clip-text text-transparent">
          Dogfood
        </h1>
        <p className="text-foreground/50 text-lg mb-8">
          Send messages through the void to your linked soul
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
