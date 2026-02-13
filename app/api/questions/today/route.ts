import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const linkId = searchParams.get('linkId')

  if (!linkId) {
    return NextResponse.json({ error: 'Missing linkId' }, { status: 400 })
  }

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

  // Try to find today's question
  let { data: question } = await supabase
    .from('daily_questions')
    .select('*')
    .eq('display_date', today)
    .single()

  // If no question for today, cycle: pick based on day-of-year modulo total questions
  if (!question) {
    const { data: allQuestions } = await supabase
      .from('daily_questions')
      .select('*')
      .order('display_date', { ascending: true })

    if (allQuestions && allQuestions.length > 0) {
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
      )
      question = allQuestions[dayOfYear % allQuestions.length]
    }
  }

  if (!question) {
    return NextResponse.json({ error: 'No questions available' }, { status: 404 })
  }

  // Fetch answers for this question + link
  const { data: answers } = await supabase
    .from('question_answers')
    .select('*')
    .eq('question_id', question.id)
    .eq('link_id', linkId)

  return NextResponse.json({
    question,
    answers: answers || [],
  })
}
