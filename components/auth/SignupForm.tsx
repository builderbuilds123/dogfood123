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

      async function handleRef() {
        // Check if user is already logged in
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (currentUser) {
          // Already logged in — just accept the referral and redirect
          setLoading(true)
          const { data: rpcResult, error: rpcError } = await supabase.rpc('accept_referral', {
            ref_code: ref,
            accepter_id: currentUser.id,
          })

          if (rpcError) {
            toast('Referral linking failed: ' + rpcError.message, 'error')
            setLoading(false)
          } else if (rpcResult?.error) {
            toast(rpcResult.error, 'error')
            setLoading(false)
          } else {
            toast('Connected with your partner!', 'success')
            router.push('/blackhole')
            router.refresh()
          }
          return
        }

        // Not logged in — look up referrer's persona to auto-assign the opposite
        const { data } = await supabase.rpc('get_referrer_persona', { ref_code: ref })
        if (data) {
          const opposite: Persona = data === 'doggo' ? 'princess' : 'doggo'
          setLockedPersona(opposite)
          setPersona(opposite)
        }
      }
      handleRef()
    }
  }, [searchParams, supabase, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!persona) {
      toast('Please select a persona', 'error')
      return
    }

    setLoading(true)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split('@')[0], persona },
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    })

    if (error) {
      toast(error.message, 'error')
      setLoading(false)
      return
    }

    // Check if email confirmation is required (no session means confirmation pending)
    if (data.user && !data.session) {
      // User created but email confirmation required
      // Check if this is a "fake" signup (user already exists - identities will be empty)
      if (data.user.identities && data.user.identities.length === 0) {
        toast('An account with this email already exists. Please sign in instead.', 'error')
        setLoading(false)
        return
      }

      toast('Check your email for a confirmation link to complete signup!', 'success')
      setLoading(false)
      return
    }

    // Session exists - email confirmation is disabled or auto-confirmed
    if (data.user && data.session) {
      // Update profile with persona (session is active so RLS will work)
      await supabase
        .from('profiles')
        .update({ persona, display_name: displayName || email.split('@')[0] })
        .eq('id', data.user.id)

      // If there's a referral code, accept it and link the users via RPC
      if (referralCode) {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('accept_referral', {
          ref_code: referralCode,
          accepter_id: data.user.id,
        })

        if (rpcError) {
          console.error('Referral accept RPC error:', rpcError)
          toast('Referral linking failed: ' + rpcError.message, 'error')
        } else if (rpcResult?.error) {
          console.error('Referral accept failed:', rpcResult.error)
          toast('Referral linking failed: ' + rpcResult.error, 'error')
        }
      }

      router.push('/blackhole')
      router.refresh()
    }
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
