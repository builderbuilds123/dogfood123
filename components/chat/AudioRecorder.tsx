'use client'

import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder'
import { Button } from '@/components/ui/Button'

interface AudioRecorderProps {
  onSend: (blob: Blob, duration: number) => void
  onCancel: () => void
}

export function AudioRecorder({ onSend, onCancel }: AudioRecorderProps) {
  const { status, audioBlob, audioUrl, duration, error, startRecording, stopRecording, discardRecording } = useAudioRecorder()

  function handleSend() {
    if (audioBlob) {
      onSend(audioBlob, duration)
    }
  }

  function handleDiscard() {
    discardRecording()
    onCancel()
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-400 mb-2">{error}</p>
        <Button variant="secondary" size="sm" onClick={onCancel}>Close</Button>
      </div>
    )
  }

  if (status === 'idle') {
    return (
      <div className="flex items-center gap-3">
        <Button onClick={startRecording} size="sm">
          Start Recording
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    )
  }

  if (status === 'recording') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full" style={{ animation: 'recording-pulse 1.5s ease-in-out infinite' }} />
          <span className="text-sm text-foreground/70 font-mono">
            {Math.floor(duration / 1000)}s
          </span>
          {/* Waveform bars */}
          <div className="flex items-center gap-0.5 h-6">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="w-1 bg-neon-magenta/60 rounded-full"
                style={{
                  animation: `waveform-bar ${0.4 + Math.random() * 0.4}s ease-in-out infinite`,
                  animationDelay: `${i * 0.05}s`,
                  '--bar-height': `${8 + Math.random() * 16}px`,
                  minHeight: '4px',
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={stopRecording}>
          Stop
        </Button>
      </div>
    )
  }

  // status === 'recorded'
  return (
    <div className="flex items-center gap-3">
      {audioUrl && (
        <audio controls src={audioUrl} className="h-8 flex-1" />
      )}
      <Button variant="secondary" size="sm" onClick={handleDiscard}>
        Discard
      </Button>
      <Button size="sm" onClick={handleSend}>
        Send
      </Button>
    </div>
  )
}
