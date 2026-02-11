'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PersonaSelector } from '@/components/auth/PersonaSelector'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'
import type { Persona } from '@/lib/types'

export default function SelectPersonaPage() {
  const [persona, setPersona] = useState<Persona | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    if (!persona) {
      toast('Please select a persona', 'error')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast('Not authenticated', 'error')
      router.push('/login')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ persona })
      .eq('id', user.id)

    if (error) {
      toast('Failed to save persona: ' + error.message, 'error')
      setLoading(false)
      return
    }

    router.push('/blackhole')
    router.refresh()
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
      <Card glow className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-magenta to-neon-cyan bg-clip-text text-transparent">
            Choose Your Persona
          </h1>
          <p className="text-foreground/50 text-sm mt-1">
            Select who you&apos;ll be in the void
          </p>
        </div>

        <PersonaSelector selected={persona} onSelect={setPersona} />

        <Button onClick={handleSubmit} loading={loading} className="w-full mt-6">
          Continue
        </Button>
      </Card>
    </div>
  )
}
