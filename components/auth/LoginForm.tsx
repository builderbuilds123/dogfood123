'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // Provide friendlier messages for common errors
      if (error.message === 'Invalid login credentials') {
        toast('Invalid email or password. Please try again.', 'error')
      } else if (error.message === 'Email not confirmed') {
        toast('Please check your email and confirm your account first.', 'error')
      } else {
        toast(error.message, 'error')
      }
      setLoading(false)
      return
    }

    // Check if user has a persona set
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('persona')
        .eq('id', data.user.id)
        .single()

      if (!profile?.persona) {
        router.push('/select-persona')
      } else {
        router.push('/blackhole')
      }
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
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
      <Button type="submit" loading={loading} className="mt-2">
        Sign In
      </Button>
    </form>
  )
}
