'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

interface NavbarProps {
  user: User
  profile: Profile | null
}

export function Navbar({ user, profile }: NavbarProps) {
  const pathname = usePathname()

  const links = [
    { href: '/blackhole', label: 'Blackhole' },
    { href: '/settings', label: 'Settings' },
  ]

  return (
    <nav className="h-14 border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-5xl mx-auto h-full flex items-center justify-between px-4">
        <Link href="/blackhole" className="font-bold text-lg bg-gradient-to-r from-neon-magenta to-neon-cyan bg-clip-text text-transparent">
          Dogfood
        </Link>

        <div className="flex items-center gap-1">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                pathname === link.href
                  ? 'bg-neon-violet/20 text-neon-cyan'
                  : 'text-foreground/50 hover:text-foreground/80 hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="ml-3">
            <Avatar persona={profile?.persona} size="sm" />
          </div>
        </div>
      </div>
    </nav>
  )
}
