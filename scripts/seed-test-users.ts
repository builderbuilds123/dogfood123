/**
 * Seed script to create test users for dogfood123
 *
 * Run: npx tsx scripts/seed-test-users.ts
 *
 * Creates 4 test accounts (2 per persona):
 *   - doggo1@test.com / testpass123 (doggo)
 *   - doggo2@test.com / testpass123 (doggo)
 *   - princess1@test.com / testpass123 (princess)
 *   - princess2@test.com / testpass123 (princess)
 *
 * NOTE: Requires SUPABASE_SERVICE_ROLE_KEY in .env.local for admin user creation.
 * If not available, use Supabase Dashboard to create users manually.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually (avoids dotenv dependency)
try {
  const envPath = resolve(__dirname, '../.env.local')
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex)
        const value = trimmed.substring(eqIndex + 1)
        if (!process.env[key]) process.env[key] = value
      }
    }
  }
} catch {
  // .env.local not found - rely on existing env vars
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

if (!serviceRoleKey) {
  console.log('')
  console.log('=== No SUPABASE_SERVICE_ROLE_KEY found ===')
  console.log('')
  console.log('To create test users, add this to your .env.local:')
  console.log('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
  console.log('')
  console.log('Find it at: https://supabase.com/dashboard/project/_/settings/api')
  console.log('')
  console.log('Alternatively, create users manually in Supabase Dashboard:')
  console.log('  https://supabase.com/dashboard/project/_/auth/users')
  console.log('')
  console.log('Test credentials to create:')
  console.log('  1. doggo1@test.com  / testpass123 (persona: doggo)')
  console.log('  2. doggo2@test.com  / testpass123 (persona: doggo)')
  console.log('  3. princess1@test.com / testpass123 (persona: princess)')
  console.log('  4. princess2@test.com / testpass123 (persona: princess)')
  console.log('')
  process.exit(0)
}

// Admin client with service role key (bypasses RLS + email confirmation)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface TestUser {
  email: string
  password: string
  display_name: string
  persona: 'doggo' | 'princess'
}

const TEST_USERS: TestUser[] = [
  { email: 'doggo1@test.com', password: 'testpass123', display_name: 'Doggo One', persona: 'doggo' },
  { email: 'doggo2@test.com', password: 'testpass123', display_name: 'Doggo Two', persona: 'doggo' },
  { email: 'princess1@test.com', password: 'testpass123', display_name: 'Princess One', persona: 'princess' },
  { email: 'princess2@test.com', password: 'testpass123', display_name: 'Princess Two', persona: 'princess' },
]

async function seedUsers() {
  console.log('Seeding test users...\n')

  for (const user of TEST_USERS) {
    // Create user via admin API (auto-confirms email)
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        display_name: user.display_name,
        persona: user.persona,
      },
    })

    if (error) {
      if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
        console.log(`  [skip] ${user.email} already exists`)

        // Still update profile persona in case it's missing
        const { data: users } = await supabase.auth.admin.listUsers()
        const existingUser = users?.users?.find(u => u.email === user.email)
        if (existingUser) {
          await supabase
            .from('profiles')
            .update({ persona: user.persona, display_name: user.display_name })
            .eq('id', existingUser.id)
          console.log(`         Updated profile persona to: ${user.persona}`)
        }
      } else {
        console.error(`  [error] ${user.email}: ${error.message}`)
      }
      continue
    }

    if (data.user) {
      // Update profile with persona (trigger may not include it yet)
      await supabase
        .from('profiles')
        .update({ persona: user.persona, display_name: user.display_name })
        .eq('id', data.user.id)

      console.log(`  [ok] ${user.email} (${user.persona}) - ${user.display_name}`)
    }
  }

  console.log('\nDone! Test credentials:')
  console.log('  Email             | Password     | Persona')
  console.log('  ------------------|--------------|--------')
  for (const user of TEST_USERS) {
    console.log(`  ${user.email.padEnd(18)}| testpass123  | ${user.persona}`)
  }
}

seedUsers().catch(console.error)
