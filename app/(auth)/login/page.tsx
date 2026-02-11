export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <Card glow className="w-full max-w-md">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-magenta to-neon-cyan bg-clip-text text-transparent">
          Welcome Back
        </h1>
        <p className="text-foreground/50 text-sm mt-1">Sign in to your blackhole</p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-foreground/40 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-neon-cyan hover:underline">
          Sign up
        </Link>
      </p>
    </Card>
  )
}
