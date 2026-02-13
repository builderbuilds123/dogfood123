'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from '@/components/ui/Toast'
import type { SharedSong } from '@/lib/types'

interface iTunesResult {
  trackId: number
  trackName: string
  artistName: string
  collectionName: string
  artworkUrl100: string
  trackViewUrl: string
  previewUrl: string
}

interface MusicDrawerProps {
  open: boolean
  onClose: () => void
  linkId: string
  userId: string
  onSongShared: (song: SharedSong) => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function MusicDrawer({ open, onClose, linkId, userId, onSongShared }: MusicDrawerProps) {
  const [songs, setSongs] = useState<SharedSong[]>([])
  const [loaded, setLoaded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<iTunesResult[]>([])
  const [searching, setSearching] = useState(false)
  const [sharing, setSharing] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch song history when drawer opens
  useEffect(() => {
    if (!open || loaded) return

    async function fetchSongs() {
      try {
        const res = await fetch(`/api/music?linkId=${linkId}`)
        const data = await res.json()
        if (data.songs) {
          setSongs(data.songs)
        }
      } catch {
        toast('Failed to load songs', 'error')
      } finally {
        setLoaded(true)
      }
    }

    fetchSongs()
  }, [open, loaded, linkId])

  // Focus input when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    } else {
      setSearchTerm('')
      setSearchResults([])
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!searchTerm.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/music/search?term=${encodeURIComponent(searchTerm.trim())}`)
        const data = await res.json()
        setSearchResults(data.results || [])
      } catch {
        toast('Search failed', 'error')
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchTerm])

  const handleShare = useCallback(async (result: iTunesResult) => {
    // Use functional setState to guard against concurrent shares
    // instead of closing over `sharing` state directly
    let alreadySharing = false
    setSharing(prev => {
      if (prev !== null) {
        alreadySharing = true
        return prev
      }
      return result.trackId
    })
    if (alreadySharing) return

    const tempId = `temp-${Date.now()}`
    const optimisticSong: SharedSong = {
      id: tempId,
      link_id: linkId,
      user_id: userId,
      track_name: result.trackName,
      artist_name: result.artistName,
      artwork_url: result.artworkUrl100,
      track_view_url: result.trackViewUrl,
      preview_url: result.previewUrl,
      created_at: new Date().toISOString(),
    }

    setSongs(prev => [optimisticSong, ...prev])
    setSearchTerm('')
    setSearchResults([])

    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId,
          trackName: result.trackName,
          artistName: result.artistName,
          artworkUrl: result.artworkUrl100,
          trackViewUrl: result.trackViewUrl,
          previewUrl: result.previewUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSongs(prev => prev.filter(s => s.id !== tempId))
        throw new Error(data.error)
      }
      const realSong = data.song as SharedSong
      setSongs(prev => prev.map(s => s.id === tempId ? realSong : s))
      onSongShared(realSong)
    } catch (err) {
      setSongs(prev => prev.filter(s => s.id !== tempId))
      toast(err instanceof Error ? err.message : 'Failed to share song', 'error')
    } finally {
      setSharing(null)
    }
  }, [linkId, userId, onSongShared])

  return (
    <AnimatePresence>
      {open ? (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                <h2 className="text-base font-bold bg-gradient-to-r from-neon-magenta to-neon-cyan bg-clip-text text-transparent">
                  Shared Music
                </h2>
                <p className="text-[10px] text-foreground/30 mt-0.5">
                  {songs.length} song{songs.length !== 1 ? 's' : ''} shared
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-foreground/30 hover:text-foreground/60 hover:bg-surface-light/40 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Search input */}
            <div className="px-5 pb-3 shrink-0">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search for a song..."
                  className="w-full bg-surface-light/40 border border-border/30 rounded-lg px-3 py-2 pl-8 text-xs text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-neon-violet/30"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/25 text-xs">
                  🔍
                </span>
                {searching ? (
                  <motion.span
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-neon-violet/30 border-t-neon-cyan rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                ) : null}
              </div>
            </div>

            {/* Section divider */}
            <div className="px-5 shrink-0">
              <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
            </div>

            {/* Search results / idle state */}
            <AnimatePresence>
              {searchResults.length > 0 ? (
                <motion.div
                  key="search-results"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-5 py-3 shrink-0 overflow-hidden"
                >
                  <p className="text-[10px] text-foreground/25 mb-1.5">Search results</p>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {searchResults.map((result, i) => (
                      <motion.div
                        key={result.trackId}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-light/30 border border-border/25"
                      >
                        <img
                          src={result.artworkUrl100}
                          alt=""
                          className="w-9 h-9 rounded-md shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground/75 truncate">{result.trackName}</p>
                          <p className="text-[10px] text-foreground/30 truncate">{result.artistName}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleShare(result)}
                          disabled={sharing !== null}
                          className="shrink-0 px-2.5 py-1 rounded-md bg-neon-violet/20 border border-neon-violet/30 text-[10px] font-medium text-neon-cyan hover:bg-neon-violet/30 transition-colors disabled:opacity-25"
                        >
                          {sharing === result.trackId ? '...' : 'Share'}
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : searchTerm.trim().length > 0 && !searching ? (
                <motion.div
                  key="search-empty"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-5 py-6 shrink-0 overflow-hidden"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-surface-light/30 border border-border/20 flex items-center justify-center mb-2">
                      <svg className="w-4.5 h-4.5 text-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                    </div>
                    <p className="text-[11px] text-foreground/30">No results found</p>
                    <p className="text-[10px] text-foreground/15 mt-0.5">Try a different search term</p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Song history */}
            <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-5 space-y-1.5">
              {!loaded ? (
                <div className="space-y-1.5 py-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-light/20 border border-border/15 animate-pulse">
                      <div className="w-10 h-10 rounded-md bg-surface-light/30 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-surface-light/30 rounded w-3/4" />
                        <div className="h-2 bg-surface-light/20 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : songs.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="text-2xl mb-2">🎵</div>
                  <p className="text-xs text-foreground/25">No songs shared yet</p>
                  <p className="text-[10px] text-foreground/15 mt-1">Search for a song to share with your partner</p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-foreground/25 mb-1">History</p>
                  <AnimatePresence mode="popLayout">
                    {songs.map((song, i) => {
                      const isOwn = song.user_id === userId
                      const isLatest = i === 0

                      return (
                        <motion.div
                          key={song.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -40 }}
                          transition={{ delay: i * 0.03 }}
                          className={
                            isLatest
                              ? 'relative flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-light/30 border border-neon-violet/40 shadow-[0_0_12px_-3px] shadow-neon-violet/20'
                              : 'flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-light/30 border border-border/25'
                          }
                        >
                          {/* Gradient glow ring on the latest shared song */}
                          {isLatest ? (
                            <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-neon-magenta/20 via-neon-violet/15 to-neon-cyan/20 -z-10 blur-sm" />
                          ) : null}

                          {song.artwork_url ? (
                            <img
                              src={song.artwork_url}
                              alt=""
                              className={
                                isLatest
                                  ? 'w-10 h-10 rounded-md shrink-0 ring-1 ring-neon-violet/30'
                                  : 'w-10 h-10 rounded-md shrink-0'
                              }
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-md shrink-0 bg-surface-light/50 flex items-center justify-center text-lg">
                              🎵
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground/75 truncate">{song.track_name}</p>
                            <p className="text-[10px] text-foreground/30 truncate">{song.artist_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] text-foreground/20">
                                {isOwn ? 'You' : '💕'}
                              </span>
                              <span className="text-[9px] text-foreground/20">
                                {timeAgo(song.created_at)}
                              </span>
                            </div>
                          </div>

                          {song.track_view_url ? (
                            <a
                              href={song.track_view_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 w-7 h-7 rounded-md bg-surface-light/40 border border-border/20 flex items-center justify-center text-foreground/30 hover:text-foreground/60 transition-colors"
                              title="Open in Apple Music"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                              </svg>
                            </a>
                          ) : null}
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
