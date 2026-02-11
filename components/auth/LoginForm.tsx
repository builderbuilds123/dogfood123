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

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast(error.message, 'error')
      setLoading(false)
      return
    }

    router.push('/blackhole')
    router.refresh()
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
