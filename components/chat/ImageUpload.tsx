'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

interface ImageUploadProps {
  onUpload: (file: File) => void
  onCancel: () => void
}

export function ImageUpload({ onUpload, onCancel }: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
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
          className="w-full py-8 border-2 border-dashed border-border rounded-2xl text-foreground/40 hover:border-neon-violet/40 hover:text-foreground/60 transition-colors text-sm"
        >
          Click to select an image
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
