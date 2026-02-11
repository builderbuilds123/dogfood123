'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { toast } from '@/components/ui/Toast'
import type { Profile } from '@/lib/types'

interface SettingsPageProps {
  profile: Profile
  partner: Profile | null
}

export function SettingsPage({ profile, partner }: SettingsPageProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || '')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const referralUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${profile.referral_code}`

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', profile.id)

    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Profile updated', 'success')
    }
    setSaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

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

  return (
    <div className="max-w-lg mx-auto p-4 py-8 flex flex-col gap-6">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-magenta to-neon-cyan bg-clip-text text-transparent">
        Settings
      </h1>

      {/* Profile */}
      <Card>
        <h2 className="font-semibold mb-4 text-foreground/80">Profile</h2>
        <div className="flex items-center gap-3 mb-4">
          <Avatar persona={profile.persona} size="lg" />
          <div>
            <p className="font-medium">{profile.display_name || profile.email}</p>
            <p className="text-sm text-foreground/40 capitalize">{profile.persona || 'No persona'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Display name"
          />
          <Button onClick={handleSave} loading={saving} size="sm">
            Save
          </Button>
        </div>
      </Card>

      {/* Partner */}
      {partner && (
        <Card>
          <h2 className="font-semibold mb-4 text-foreground/80">Your Partner</h2>
          <div className="flex items-center gap-3">
            <Avatar persona={partner.persona} size="lg" />
            <div>
              <p className="font-medium">{partner.display_name || partner.email}</p>
              <p className="text-sm text-foreground/40 capitalize">{partner.persona}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Referral */}
      {!partner && (
        <Card>
          <h2 className="font-semibold mb-4 text-foreground/80">Referral Link</h2>
          <p className="text-sm text-foreground/50 mb-3">Share this link to connect with someone</p>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2 bg-background/50 rounded-xl border border-border text-xs text-foreground/60 truncate font-mono">
              {referralUrl}
            </div>
            <Button size="sm" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </Card>
      )}

      {/* Logout */}
      <Button variant="ghost" onClick={handleLogout} className="text-foreground/40 hover:text-red-400">
        Sign Out
      </Button>
    </div>
  )
}
