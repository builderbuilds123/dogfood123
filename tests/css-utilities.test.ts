import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Mobile-Safe Viewport Utilities', () => {
  const globalsCssPath = resolve(__dirname, '../app/globals.css')
  const globalsCss = readFileSync(globalsCssPath, 'utf-8')

  describe('safe-area-inset CSS custom properties', () => {
    it('should define --safe-area-inset-top with env() fallback', () => {
      expect(globalsCss).toContain('--safe-area-inset-top: env(safe-area-inset-top, 0px)')
    })

    it('should define --safe-area-inset-bottom with env() fallback', () => {
      expect(globalsCss).toContain('--safe-area-inset-bottom: env(safe-area-inset-bottom, 0px)')
    })

    it('should define --safe-area-inset-left with env() fallback', () => {
      expect(globalsCss).toContain('--safe-area-inset-left: env(safe-area-inset-left, 0px)')
    })

    it('should define --safe-area-inset-right with env() fallback', () => {
      expect(globalsCss).toContain('--safe-area-inset-right: env(safe-area-inset-right, 0px)')
    })
  })

  describe('.mobile-safe-top utility class', () => {
    it('should exist with padding-top using safe-area-inset', () => {
      expect(globalsCss).toMatch(/\.mobile-safe-top\s*\{[^}]*padding-top:\s*var\(--safe-area-inset-top\)/)
    })
  })

  describe('.mobile-safe-bottom utility class', () => {
    it('should exist with padding-bottom using safe-area-inset', () => {
      expect(globalsCss).toMatch(/\.mobile-safe-bottom\s*\{[^}]*padding-bottom:\s*var\(--safe-area-inset-bottom\)/)
    })
  })

  describe('.h-dvh-full utility class', () => {
    it('should exist with height: 100dvh', () => {
      expect(globalsCss).toMatch(/\.h-dvh-full\s*\{[^}]*height:\s*100dvh/)
    })
  })
})

describe('Status Bar Responsive Layout', () => {
  const globalsCssPath = resolve(__dirname, '../app/globals.css')
  const globalsCss = readFileSync(globalsCssPath, 'utf-8')

  describe('.status-bar-wrapper utility class', () => {
    it('should exist with flex display', () => {
      expect(globalsCss).toMatch(/\.status-bar-wrapper\s*\{[^}]*display:\s*flex/)
    })

    it('should have align-items: center', () => {
      expect(globalsCss).toMatch(/\.status-bar-wrapper\s*\{[^}]*align-items:\s*center/)
    })

    it('should have justify-content: space-between', () => {
      expect(globalsCss).toMatch(/\.status-bar-wrapper\s*\{[^}]*justify-content:\s*space-between/)
    })

    it('should have gap: 0.5rem', () => {
      expect(globalsCss).toMatch(/\.status-bar-wrapper\s*\{[^}]*gap:\s*0\.5rem/)
    })

    it('should use flex-wrap on screens < 400px', () => {
      expect(globalsCss).toMatch(/@media\s*\(\s*max-width:\s*400px\s*\)\s*\{[^}]*\.status-bar-wrapper\s*\{[^}]*flex-wrap:\s*wrap/)
    })

    it('should center content on screens < 400px', () => {
      expect(globalsCss).toMatch(/@media\s*\(\s*max-width:\s*400px\s*\)\s*\{[^}]*\.status-bar-wrapper\s*\{[^}]*justify-content:\s*center/)
    })
  })

  describe('.status-bar-elements utility class', () => {
    it('should exist with flex display', () => {
      expect(globalsCss).toMatch(/\.status-bar-elements\s*\{[^}]*display:\s*flex/)
    })

    it('should have align-items: center', () => {
      expect(globalsCss).toMatch(/\.status-bar-elements\s*\{[^}]*align-items:\s*center/)
    })

    it('should have gap: 0.5rem', () => {
      expect(globalsCss).toMatch(/\.status-bar-elements\s*\{[^}]*gap:\s*0\.5rem/)
    })

    it('should use flex-wrap on screens < 380px', () => {
      expect(globalsCss).toMatch(/@media\s*\(\s*max-width:\s*380px\s*\)\s*\{[^}]*\.status-bar-elements\s*\{[^}]*flex-wrap:\s*wrap/)
    })

    it('should center content on screens < 380px', () => {
      expect(globalsCss).toMatch(/@media\s*\(\s*max-width:\s*380px\s*\)\s*\{[^}]*\.status-bar-elements\s*\{[^}]*justify-content:\s*center/)
    })
  })
})
