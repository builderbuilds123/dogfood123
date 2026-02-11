'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BlackholeVortex } from '@/components/blackhole/BlackholeVortex'
import { BlackholeParticles } from '@/components/blackhole/BlackholeParticles'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'

interface WaitingRoomProps {
  userId: string
  referralCode: string
}

export function WaitingRoom({ userId, referralCode }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const referralUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${referralCode}`

  useEffect(() => {
    // Listen for a new link being created
    const channel = supabase
      .channel('waiting-for-link')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_links',
        },
        (payload) => {
          const link = payload.new as { user_a: string; user_b: string }
          if (link.user_a === userId || link.user_b === userId) {
            toast('Your partner has connected!', 'success')
            router.push('/blackhole')
            router.refresh()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase, router])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      toast('Link copied!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Failed to copy', 'error')
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Dogfood!',
          text: 'Send messages through a blackhole with me',
          url: referralUrl,
        })
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy()
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4 gap-8">
      {/* Mini blackhole pulsing */}
      <div className="relative opacity-60">
        <BlackholeParticles count={10} />
        <BlackholeVortex size="sm" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-magenta to-neon-cyan bg-clip-text text-transparent mb-2">
          Waiting for Connection
        </h1>
        <p className="text-foreground/50 text-sm max-w-md">
          Share your referral link with someone to connect through the void.
          They&apos;ll be assigned the opposite persona and linked to you.
        </p>
      </div>

      <Card glow className="w-full max-w-md">
        <p className="text-sm text-foreground/50 mb-3">Your referral link</p>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 bg-background/50 rounded-xl border border-border text-sm text-foreground/70 truncate font-mono">
            {referralUrl}
          </div>
          <Button size="sm" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <Button variant="secondary" className="w-full mt-3" onClick={handleShare}>
          Share Link
        </Button>
      </Card>
    </div>
  )
}
