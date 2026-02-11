'use client'

import { useState, useCallback } from 'react'
import { MessageInput } from './MessageInput'
import { ImageUpload } from './ImageUpload'
import { AudioRecorder } from './AudioRecorder'
import { toast } from '@/components/ui/Toast'
import type { Message } from '@/lib/types'

interface ChatInterfaceProps {
  linkId: string
  userId: string
  partnerId: string
  onMessageSent: (message: Message) => void
}

type InputMode = 'text' | 'image' | 'audio'

export function ChatInterface({ linkId, userId, partnerId, onMessageSent }: ChatInterfaceProps) {
  const [mode, setMode] = useState<InputMode>('text')
  const [sending, setSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const sendMessage = useCallback(async (messageType: string, content?: string, mediaFile?: File | Blob) => {
    setSending(true)

    try {
      let mediaUrl: string | undefined
      let mediaMetadata: Record<string, unknown> = {}

      if (mediaFile) {
        const formData = new FormData()
        formData.append('file', mediaFile)
        formData.append('type', messageType === 'image' ? 'image' : 'audio')

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Upload failed')
        }

        mediaUrl = uploadData.url
        mediaMetadata = uploadData.metadata || {}
      }

      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId,
          receiverId: partnerId,
          messageType,
          content: content || null,
          mediaUrl: mediaUrl || null,
          mediaMetadata,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      onMessageSent(data.message)
      setMode('text')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send', 'error')
    } finally {
      setSending(false)
    }
  }, [linkId, partnerId, onMessageSent])

  const handleSendText = useCallback((text: string) => {
    sendMessage('text', text)
  }, [sendMessage])

  const handleUploadImage = useCallback((file: File) => {
    sendMessage('image', undefined, file)
  }, [sendMessage])

  const handleSendAudio = useCallback((blob: Blob, duration: number) => {
    sendMessage('audio', undefined, blob)
  }, [sendMessage])

  const handleToggleAudio = useCallback(() => {
    if (mode === 'audio') {
      setMode('text')
      setIsRecording(false)
    } else {
      setMode('audio')
    }
  }, [mode])

  return (
    <div className="flex flex-col gap-2">
      {mode === 'image' && (
        <ImageUpload
          onUpload={handleUploadImage}
          onCancel={() => setMode('text')}
        />
      )}

      {mode === 'audio' && (
        <AudioRecorder
          onSend={handleSendAudio}
          onCancel={() => { setMode('text'); setIsRecording(false) }}
        />
      )}

      {mode === 'text' && (
        <MessageInput
          onSendText={handleSendText}
          onAttachImage={() => setMode('image')}
          onToggleAudio={handleToggleAudio}
          isRecording={isRecording}
          disabled={sending}
        />
      )}
    </div>
  )
}
