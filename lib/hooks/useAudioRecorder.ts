'use client'

import { useState, useRef, useCallback } from 'react'

interface AudioRecorderState {
  status: 'idle' | 'recording' | 'recorded'
  audioBlob: Blob | null
  audioUrl: string | null
  duration: number
  error: string | null
}

export function useAudioRecorder(maxDurationMs = 60000) {
  const [state, setState] = useState<AudioRecorderState>({
    status: 'idle',
    audioBlob: null,
    audioUrl: null,
    duration: 0,
    error: null,
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      startTimeRef.current = Date.now()

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        const duration = Date.now() - startTimeRef.current

        setState({
          status: 'recorded',
          audioBlob: blob,
          audioUrl: url,
          duration,
          error: null,
        })

        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start(250)

      timerRef.current = setTimeout(() => {
        stopRecording()
      }, maxDurationMs)

      setState(prev => ({ ...prev, status: 'recording', error: null }))
    } catch {
      setState(prev => ({
        ...prev,
        error: 'Microphone access denied or unavailable',
      }))
    }
  }, [maxDurationMs, stopRecording])

  const discardRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl)
    }
    setState({ status: 'idle', audioBlob: null, audioUrl: null, duration: 0, error: null })
  }, [state.audioUrl])

  return { ...state, startRecording, stopRecording, discardRecording }
}
