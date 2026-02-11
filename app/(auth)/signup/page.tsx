export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { SignupForm } from '@/components/auth/SignupForm'

function SignupContent() {
  return <SignupForm />
}

export default function SignupPage() {
  return (
    <Card glow className="w-full max-w-md">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-magenta to-neon-cyan bg-clip-text text-transparent">
          Join the Void
        </h1>
        <p className="text-foreground/50 text-sm mt-1">Create your account and choose your persona</p>
      </div>
      <Suspense fallback={<div className="text-center text-foreground/30">Loading...</div>}>
        <SignupContent />
      </Suspense>
      <p className="text-center text-sm text-foreground/40 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-neon-cyan hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  )
}
