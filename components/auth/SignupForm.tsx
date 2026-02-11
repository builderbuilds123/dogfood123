'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PersonaSelector } from './PersonaSelector'
import { toast } from '@/components/ui/Toast'
import type { Persona } from '@/lib/types'

export function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [persona, setPersona] = useState<Persona | null>(null)
  const [lockedPersona, setLockedPersona] = useState<Persona | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      setReferralCode(ref)
      // Look up the referrer's persona to auto-assign the opposite
      async function lookupReferrer() {
        const { data } = await supabase
          .from('profiles')
          .select('persona')
          .eq('referral_code', ref)
          .single()

        if (data?.persona) {
          const opposite: Persona = data.persona === 'doggo' ? 'princess' : 'doggo'
          setLockedPersona(opposite)
          setPersona(opposite)
        }
      }
      lookupReferrer()
    }
  }, [searchParams, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!persona) {
      toast('Please select a persona', 'error')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split('@')[0], persona },
      },
    })

    if (error) {
      toast(error.message, 'error')
      setLoading(false)
      return
    }

    // Update profile with persona
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ persona, display_name: displayName || email.split('@')[0] })
        .eq('id', data.user.id)

      // If there's a referral code, accept it
      if (referralCode) {
        try {
          await fetch('/api/referral/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referralCode }),
          })
        } catch {
          // Non-blocking — link may fail but signup succeeded
          console.error('Failed to accept referral')
        }
      }
    }

    router.push('/blackhole')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
      <Input
        id="display-name"
        label="Display Name"
        type="text"
        placeholder="Your name"
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
      />
      <Input
        id="email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <Input
        id="password"
        label="Password"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        minLength={6}
      />

      <div>
        <p className="text-sm font-medium text-foreground/70 mb-3">Choose your persona</p>
        {referralCode && lockedPersona && (
          <p className="text-xs text-neon-cyan/70 mb-2">
            Your partner chose {lockedPersona === 'princess' ? 'doggo' : 'princess'}, so you&apos;re the {lockedPersona}!
          </p>
        )}
        <PersonaSelector selected={persona} onSelect={setPersona} locked={lockedPersona} />
      </div>

      <Button type="submit" loading={loading} className="mt-2">
        Create Account
      </Button>
    </form>
  )
}
