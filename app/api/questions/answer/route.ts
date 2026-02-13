import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { questionId, linkId, answerText } = await request.json()

  if (!questionId || !linkId || !answerText?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('question_answers')
    .insert({
      question_id: questionId,
      link_id: linkId,
      user_id: user.id,
      answer_text: answerText.trim(),
    })
    .select()
    .single()

  if (error) {
    // Could be unique constraint violation (already answered)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You already answered this question' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ answer: data })
}
