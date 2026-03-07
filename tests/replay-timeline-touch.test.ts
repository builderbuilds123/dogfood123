import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('ReplayTimeline Mobile Touch Interaction', () => {
  const globalsCssPath = resolve(__dirname, '../app/globals.css')
  const globalsCss = readFileSync(globalsCssPath, 'utf-8')
  const replayTimelinePath = resolve(__dirname, '../components/replay/ReplayTimeline.tsx')
  const replayTimeline = readFileSync(replayTimelinePath, 'utf-8')

  describe('minimum 44px height for touch targets', () => {
    it('should have timeline track with min-h-[44px] for minimum 44px height', () => {
      expect(replayTimeline).toContain('min-h-[44px]')
    })

    it('should have touch-none class for proper touch interaction', () => {
      expect(replayTimeline).toContain('touch-none')
    })

    it('should have select-none class to prevent text selection during drag', () => {
      expect(replayTimeline).toContain('select-none')
    })
  })

  describe('timeline scrubber 48x48px minimum touch target', () => {
    it('should have scrubber container with min-w-[48px]', () => {
      expect(replayTimeline).toMatch(/min-w-\[48px\]/)
    })

    it('should have scrubber container with min-h-[48px]', () => {
      expect(replayTimeline).toMatch(/min-h-\[48px\]/)
    })

    it('should have flex items-center justify-center for centered scrubber', () => {
      expect(replayTimeline).toMatch(/min-w-\[48px\].*flex.*items-center.*justify-center|flex.*items-center.*justify-center.*min-w-\[48px\]/)
    })
  })

  describe('horizontal scroll for message thumbnails on narrow screens', () => {
    it('should have scrollbar-hide utility class defined in globals.css', () => {
      expect(globalsCss).toMatch(/\.scrollbar-hide\s*\{/)
      expect(globalsCss).toMatch(/scrollbar-width:\s*none/)
    })

    it('should have replay-timeline-container class for narrow screen handling', () => {
      expect(replayTimeline).toContain('replay-timeline-container')
    })

    it('should have @media query for max-width: 400px in globals.css', () => {
      expect(globalsCss).toMatch(/@media\s*\(\s*max-width:\s*400px\s*\)/)
    })

    it('should have overflow-x: auto for replay-timeline-container on narrow screens', () => {
      expect(globalsCss).toMatch(/@media\s*\(\s*max-width:\s*400px\s*\)\s*\{[^}]*\.replay-timeline-container\s*\{[^}]*overflow-x:\s*auto/)
    })

    it('should have -webkit-overflow-scrolling: touch for smooth iOS scrolling', () => {
      expect(globalsCss).toMatch(/-webkit-overflow-scrolling:\s*touch/)
    })
  })

  describe('safe-area-inset-bottom padding', () => {
    it('should apply mobile-safe-bottom class to timeline container', () => {
      expect(replayTimeline).toContain('mobile-safe-bottom')
    })

    it('should define .mobile-safe-bottom with padding-bottom using safe-area-inset-bottom', () => {
      expect(globalsCss).toMatch(/\.mobile-safe-bottom\s*\{[^}]*padding-bottom:\s*var\(--safe-area-inset-bottom\)/)
    })

    it('should define --safe-area-inset-bottom CSS custom property with env() fallback', () => {
      expect(globalsCss).toContain('--safe-area-inset-bottom: env(safe-area-inset-bottom, 0px)')
    })
  })

  describe('pointer event handlers for touch interaction', () => {
    it('should have onPointerDown handler', () => {
      expect(replayTimeline).toMatch(/onPointerDown=\{handlePointerDown\}/)
    })

    it('should have onPointerMove handler', () => {
      expect(replayTimeline).toMatch(/onPointerMove=\{handlePointerMove\}/)
    })

    it('should have onPointerUp handler', () => {
      expect(replayTimeline).toMatch(/onPointerUp=\{handlePointerUp\}/)
    })

    it('should use isDragging ref to track drag state', () => {
      expect(replayTimeline).toContain('isDragging')
    })

    it('should use setPointerCapture for proper pointer tracking', () => {
      expect(replayTimeline).toContain('setPointerCapture')
    })
  })
})

describe('ReplayTimeline Component Structure', () => {
  const replayTimelinePath = resolve(__dirname, '../components/replay/ReplayTimeline.tsx')
  const replayTimeline = readFileSync(replayTimelinePath, 'utf-8')

  it('should be a client component with use client directive', () => {
    expect(replayTimeline).toContain("'use client'")
  })

  it('should import useState, useRef, useCallback from react', () => {
    expect(replayTimeline).toMatch(/import\s*\{\s*useState.*useRef.*useCallback.*\}\s*from\s*['"]react['"]/)
  })

  it('should have ReplayTimelineProps interface', () => {
    expect(replayTimeline).toContain('interface ReplayTimelineProps')
  })

  it('should export ReplayTimeline function component', () => {
    expect(replayTimeline).toContain('export function ReplayTimeline')
  })

  it('should have trackRef for timeline track reference', () => {
    expect(replayTimeline).toContain('trackRef')
  })

  it('should have getIndexFromPosition callback for calculating position from touch', () => {
    expect(replayTimeline).toContain('getIndexFromPosition')
  })
})
