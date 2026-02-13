'use client'

import { useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'

interface ImageUploadProps {
  onUpload: (file: File) => void
  onCancel: () => void
}

export function ImageUpload({ onUpload, onCancel }: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  function handleSend() {
    if (file) {
      onUpload(file)
      if (preview) URL.revokeObjectURL(preview)
    }
  }

  function handleCancel() {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    onCancel()
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      handleFile(droppedFile)
    }
  }, [handleFile])

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!preview ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full py-8 border-2 border-dashed rounded-2xl text-sm transition-colors ${
            isDragging
              ? 'border-neon-violet/60 bg-neon-violet/10 text-neon-violet/80'
              : 'border-border text-foreground/40 hover:border-neon-violet/40 hover:text-foreground/60'
          }`}
        >
          {isDragging ? 'Drop image here' : 'Click or drag & drop an image'}
        </button>
      ) : (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full max-h-48 object-contain rounded-xl" />
          <div className="flex gap-2 mt-3">
            <Button variant="secondary" size="sm" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSend} className="flex-1">
              Send Image
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
