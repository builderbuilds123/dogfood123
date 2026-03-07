import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('BlackholeScene Viewport Height Handling', () => {
  const blackholeScenePath = resolve(__dirname, '../components/blackhole/BlackholeScene.tsx')
  const blackholeScene = readFileSync(blackholeScenePath, 'utf-8')

  describe('main container viewport height', () => {
    it('should use min-h-[100dvh] or h-[100dvh] for dynamic viewport height', () => {
      // Check for either min-h-[100dvh] or h-[100dvh] in the main container
      const hasDynamicHeight = 
        blackholeScene.includes('min-h-[100dvh]') || 
        blackholeScene.includes('h-[100dvh]')
      expect(hasDynamicHeight).toBe(true)
    })

    it('should not use h-screen which causes issues on mobile browsers', () => {
      // The main container should not use h-screen
      const mainContainerMatch = blackholeScene.match(/return\s*\(\s*<div\s+className="[^"]*h-screen[^"]*"/)
      expect(mainContainerMatch).toBeNull()
    })
  })

  describe('status bar safe-area-inset handling', () => {
    it('should have pt-[env(safe-area-inset-top)] for status bar padding', () => {
      // Check that the status bar div has safe-area-inset-top padding
      expect(blackholeScene).toContain('pt-[env(safe-area-inset-top)]')
    })
  })

  describe('bottom bar safe-area-inset handling', () => {
    it('should have pb-[env(safe-area-inset-bottom)] for bottom bar padding', () => {
      // Check that the bottom bar div has safe-area-inset-bottom padding
      expect(blackholeScene).toContain('pb-[env(safe-area-inset-bottom)]')
    })
  })

  describe('blackhole centering', () => {
    it('should maintain flex centering for blackhole container', () => {
      // The blackhole section should use flex items-center justify-center for vertical centering
      expect(blackholeScene).toContain('flex-1 flex items-center justify-center')
    })
  })
})
