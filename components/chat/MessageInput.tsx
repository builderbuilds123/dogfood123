'use client'

import { useState, useRef } from 'react'

interface MessageInputProps {
  onSendText: (text: string) => void
  onAttachImage: () => void
  onToggleAudio: () => void
  isRecording: boolean
  disabled?: boolean
}

export function MessageInput({ onSendText, onAttachImage, onToggleAudio, isRecording, disabled }: MessageInputProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSendText(trimmed)
    setText('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      {/* Image attach button */}
      <button
        type="button"
        onClick={onAttachImage}
        disabled={disabled}
        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-surface-light border border-border hover:border-neon-violet/40 transition-colors disabled:opacity-50"
        title="Attach image"
      >
        <svg className="w-5 h-5 text-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5V19.5a1.5 1.5 0 001.5 1.5z" />
        </svg>
      </button>

      {/* Audio record button */}
      <button
        type="button"
        onClick={onToggleAudio}
        disabled={disabled}
        className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
          isRecording
            ? 'bg-red-500/20 border-red-500/40 text-red-400'
            : 'bg-surface-light border-border hover:border-neon-violet/40 text-foreground/60'
        }`}
        title={isRecording ? 'Stop recording' : 'Record audio'}
      >
        {isRecording ? (
          <div className="w-4 h-4 bg-red-500 rounded-sm" style={{ animation: 'recording-pulse 1.5s ease-in-out infinite' }} />
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {/* Text input */}
      <div className="flex-1 relative">
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message into the void..."
          disabled={disabled}
          rows={1}
          className="w-full px-4 py-2.5 bg-surface border border-border rounded-2xl text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-neon-violet/40 resize-none text-sm max-h-32 transition-colors disabled:opacity-50"
          style={{ minHeight: '42px' }}
        />
      </div>

      {/* Send button */}
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-neon-violet/80 hover:bg-neon-violet transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(139,0,255,0.4)]"
        title="Send"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
      </button>
    </form>
  )
}
