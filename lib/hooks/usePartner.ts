'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, UserLink, PartnerInfo } from '@/lib/types'

export function usePartner(userId: string | undefined) {
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    async function fetchPartner() {
      const { data: link } = await supabase
        .from('user_links')
        .select('*')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .maybeSingle()

      if (!link) {
        setLoading(false)
        return
      }

      const partnerId = link.user_a === userId ? link.user_b : link.user_a

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', partnerId)
        .single()

      if (profile) {
        setPartner({ profile, link })
      }

      setLoading(false)
    }

    fetchPartner()
  }, [userId, supabase])

  return { partner, loading }
}
