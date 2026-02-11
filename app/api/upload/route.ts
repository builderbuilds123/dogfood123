import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
  const type = formData.get('type') as string

  if (!file || !type) {
    return NextResponse.json({ error: 'Missing file or type' }, { status: 400 })
  }

  const bucket = type === 'image' ? 'message-images' : 'message-audio'
  const ext = file.name?.split('.').pop() || (type === 'image' ? 'png' : 'webm')
  const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: signedUrl } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365)

  return NextResponse.json({
    url: signedUrl?.signedUrl,
    path: data?.path,
    metadata: {
      size: file.size,
      mimeType: file.type,
    },
  })
}
