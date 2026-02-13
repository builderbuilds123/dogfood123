'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import type { DailyQuestion, QuestionAnswer } from '@/lib/types'

interface QuestionDrawerProps {
  linkId: string
  userId: string
  partnerName: string
}

interface TodayData {
  question: DailyQuestion | null
  myAnswer: QuestionAnswer | null
  partnerAnswer: QuestionAnswer | null
}

interface HistoryEntry {
  question: DailyQuestion
  myAnswer: QuestionAnswer
  partnerAnswer: QuestionAnswer | null
}

export function QuestionDrawer({ linkId, userId, partnerName }: QuestionDrawerProps) {
  const [open, setOpen] = useState(false)
  const [today, setToday] = useState<TodayData>({ question: null, myAnswer: null, partnerAnswer: null })
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch today's question + answers
  const fetchToday = useCallback(async () => {
    try {
      const res = await fetch(`/api/questions/today?linkId=${linkId}`)
      if (!res.ok) return
      const data = await res.json()

      const question = data.question as DailyQuestion
      const answers = (data.answers || []) as QuestionAnswer[]
      const myAnswer = answers.find((a: QuestionAnswer) => a.user_id === userId) || null
      const partnerAnswer = answers.find((a: QuestionAnswer) => a.user_id !== userId) || null

      setToday({ question, myAnswer, partnerAnswer })
      setHasAnswered(!!myAnswer)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [linkId, userId])

  // Fetch history (past answered questions)
  const fetchHistory = useCallback(async () => {
    try {
      const supabase = createClient()
      // Get all my past answers
      const { data: myAnswers } = await supabase
        .from('question_answers')
        .select('*, daily_questions(*)')
        .eq('link_id', linkId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!myAnswers || myAnswers.length === 0) return

      // Get today's question ID to exclude it
      const todayDate = new Date().toISOString().split('T')[0]

      // Get all partner answers for questions I've answered
      const questionIds = myAnswers.map(a => a.question_id)
      const { data: partnerAnswers } = await supabase
        .from('question_answers')
        .select('*')
        .eq('link_id', linkId)
        .neq('user_id', userId)
        .in('question_id', questionIds)

      const partnerMap = new Map<string, QuestionAnswer>()
      partnerAnswers?.forEach(a => partnerMap.set(a.question_id, a as QuestionAnswer))

      const entries: HistoryEntry[] = myAnswers
        .filter(a => {
          const q = a.daily_questions as unknown as DailyQuestion
          return q && q.display_date !== todayDate
        })
        .map(a => ({
          question: a.daily_questions as unknown as DailyQuestion,
          myAnswer: a as unknown as QuestionAnswer,
          partnerAnswer: partnerMap.get(a.question_id) || null,
        }))

      setHistory(entries)
    } catch {
      // silently fail
    }
  }, [linkId, userId])

  useEffect(() => {
    fetchToday()
    fetchHistory()
  }, [fetchToday, fetchHistory])

  // Realtime: listen for partner's answer
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let activeChannel: ReturnType<typeof supabase.channel> | null = null

    async function setup() {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token)
      }
      if (cancelled) return

      const channel = supabase
        .channel(`questions:${linkId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'question_answers', filter: `link_id=eq.${linkId}` },
          (payload) => {
            const answer = payload.new as QuestionAnswer
            if (answer.user_id !== userId) {
              // Partner answered — update if it's for today's question
              setToday(prev => {
                if (prev.question && answer.question_id === prev.question.id) {
                  return { ...prev, partnerAnswer: answer }
                }
                return prev
              })
            }
          }
        )
        .subscribe()

      activeChannel = channel
      if (cancelled) supabase.removeChannel(channel)
    }

    setup()

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'TOKEN_REFRESHED' && session?.access_token) {
          supabase.realtime.setAuth(session.access_token)
        }
      }
    )

    return () => {
      cancelled = true
      if (activeChannel) supabase.removeChannel(activeChannel)
      authListener.unsubscribe()
    }
  }, [linkId, userId])

  const handleSubmit = useCallback(async () => {
    if (!answerText.trim() || !today.question || submitting) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/questions/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: today.question.id,
          linkId,
          answerText: answerText.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setToday(prev => ({ ...prev, myAnswer: data.answer }))
      setHasAnswered(true)
      setAnswerText('')
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }, [answerText, today.question, submitting, linkId])

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-16 left-4 z-30 w-9 h-9 rounded-full flex items-center justify-center bg-surface-light/40 backdrop-blur-md border border-border/30 hover:border-amber-400/40 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Question of the Day"
      >
        <span className="text-sm">❓</span>
        {/* Orange dot badge if unanswered */}
        {!loading && !hasAnswered && today.question && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border border-black/20" />
        )}
      </motion.button>

      {/* Drawer overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              className="fixed z-50 bottom-0 left-0 right-0 max-h-[80vh] flex flex-col bg-surface border-t border-border/50 rounded-t-3xl overflow-hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-foreground/15" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3 shrink-0">
                <div>
                  <h2 className="text-base font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                    Question of the Day
                  </h2>
                  <p className="text-[10px] text-foreground/30 mt-0.5">
                    Answer to reveal your partner&apos;s response
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-foreground/30 hover:text-foreground/60 hover:bg-surface-light/40 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-5 space-y-5">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-xs text-foreground/25">Loading...</div>
                  </div>
                ) : !today.question ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <div className="text-2xl mb-2">🌌</div>
                    <p className="text-xs text-foreground/25">No question today. Check back tomorrow!</p>
                  </div>
                ) : (
                  <>
                    {/* Today's question */}
                    <div className="bg-surface-light/30 border border-border/25 rounded-2xl p-4">
                      <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                        {today.question.question_text}
                      </p>
                    </div>

                    {/* My answer section */}
                    {today.myAnswer ? (
                      <div className="space-y-1">
                        <p className="text-[10px] text-foreground/30 font-medium uppercase tracking-wider">Your answer</p>
                        <div className="bg-neon-violet/10 border border-neon-violet/20 rounded-xl p-3">
                          <p className="text-xs text-foreground/70 leading-relaxed">{today.myAnswer.answer_text}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[10px] text-foreground/30 font-medium uppercase tracking-wider">Your answer</p>
                        <textarea
                          ref={inputRef}
                          value={answerText}
                          onChange={e => setAnswerText(e.target.value)}
                          placeholder="Type your answer..."
                          maxLength={500}
                          rows={3}
                          className="w-full bg-surface-light/40 border border-border/30 rounded-xl px-3 py-2.5 text-xs text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-amber-400/30 resize-none"
                        />
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={!answerText.trim() || submitting}
                          className="w-full py-2 rounded-xl text-xs font-medium bg-amber-400/20 border border-amber-400/30 text-amber-300 hover:bg-amber-400/30 transition-colors disabled:opacity-25"
                        >
                          {submitting ? 'Submitting...' : 'Submit Answer'}
                        </button>
                      </div>
                    )}

                    {/* Partner's answer section */}
                    <div className="space-y-1">
                      <p className="text-[10px] text-foreground/30 font-medium uppercase tracking-wider">{partnerName}&apos;s answer</p>
                      {!hasAnswered ? (
                        // Blurred placeholder — must answer first
                        <div className="bg-surface-light/20 border border-border/15 rounded-xl p-3 relative overflow-hidden">
                          <p className="text-xs text-foreground/10 blur-sm select-none">
                            This answer is hidden until you answer the question first...
                          </p>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] text-foreground/30">Answer to reveal 👀</span>
                          </div>
                        </div>
                      ) : today.partnerAnswer ? (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-neon-cyan/10 border border-neon-cyan/20 rounded-xl p-3"
                        >
                          <p className="text-xs text-foreground/70 leading-relaxed">{today.partnerAnswer.answer_text}</p>
                        </motion.div>
                      ) : (
                        <div className="bg-surface-light/20 border border-border/15 rounded-xl p-3">
                          <p className="text-xs text-foreground/25 italic">Waiting for {partnerName}...</p>
                        </div>
                      )}
                    </div>

                    {/* History */}
                    {history.length > 0 && (
                      <div className="space-y-3 pt-2 border-t border-border/15">
                        <p className="text-[10px] text-foreground/25 font-medium uppercase tracking-wider">Past Questions</p>
                        {history.map(entry => (
                          <div key={entry.question.id} className="space-y-1.5 bg-surface-light/15 border border-border/10 rounded-xl p-3">
                            <p className="text-[10px] text-foreground/50 font-medium leading-snug">{entry.question.question_text}</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-[8px] text-foreground/20 mb-0.5">You</p>
                                <p className="text-[10px] text-foreground/40 leading-snug">{entry.myAnswer.answer_text}</p>
                              </div>
                              <div>
                                <p className="text-[8px] text-foreground/20 mb-0.5">{partnerName}</p>
                                <p className="text-[10px] text-foreground/40 leading-snug">
                                  {entry.partnerAnswer ? entry.partnerAnswer.answer_text : 'No answer yet'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
