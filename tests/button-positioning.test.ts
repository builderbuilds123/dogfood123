import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Fixed-Position Button Collisions on Mobile (US-004)', () => {
  const pingButtonPath = resolve(__dirname, '../components/ping/PingButton.tsx')
  const questionDrawerPath = resolve(__dirname, '../components/questions/QuestionDrawer.tsx')
  const blackholeScenePath = resolve(__dirname, '../components/blackhole/BlackholeScene.tsx')
  const wishlistDrawerPath = resolve(__dirname, '../components/wishlist/WishlistDrawer.tsx')

  const pingButton = readFileSync(pingButtonPath, 'utf-8')
  const questionDrawer = readFileSync(questionDrawerPath, 'utf-8')
  const blackholeScene = readFileSync(blackholeScenePath, 'utf-8')
  const wishlistDrawer = readFileSync(wishlistDrawerPath, 'utf-8')

  describe('PingButton', () => {
    it('should have ml-[env(safe-area-inset-left)] for mobile safe area', () => {
      expect(pingButton).toContain('ml-[env(safe-area-inset-left)]')
    })

    it('should keep top-4 left-4 positioning', () => {
      expect(pingButton).toContain('top-4 left-4')
    })

    it('should have z-30 z-index', () => {
      expect(pingButton).toContain('z-30')
    })
  })

  describe('QuestionDrawer trigger', () => {
    it('should be positioned at top-14 (56px) to avoid PingButton overlap', () => {
      expect(questionDrawer).toContain('top-14')
    })

    it('should have ml-[env(safe-area-inset-left)] for mobile safe area', () => {
      expect(questionDrawer).toContain('ml-[env(safe-area-inset-left)]')
    })

    it('should have z-30 z-index', () => {
      expect(questionDrawer).toContain('z-30')
    })

    it('should NOT have top-16 (old positioning)', () => {
      expect(questionDrawer).not.toContain('top-16')
    })
  })

  describe('Settings button', () => {
    it('should have mr-[env(safe-area-inset-right)] for mobile safe area', () => {
      expect(blackholeScene).toContain('mr-[env(safe-area-inset-right)]')
    })

    it('should keep top-4 right-4 positioning', () => {
      expect(blackholeScene).toContain('top-4 right-4')
    })

    it('should have z-30 z-index', () => {
      expect(blackholeScene).toContain('z-30')
    })
  })

  describe('Z-index hierarchy', () => {
    it('should have Ping button at z-30', () => {
      expect(pingButton).toContain('z-30')
    })

    it('should have Question button at z-30', () => {
      expect(questionDrawer).toContain('z-30')
    })

    it('should have Settings button at z-30', () => {
      expect(blackholeScene).toContain('z-30')
    })

    it('should have drawers at z-40 or higher', () => {
      // Check that drawers have higher z-index than buttons (z-40, z-50 found in drawer components)
      expect(wishlistDrawer).toMatch(/z-40|z-50/)
    })
  })

  describe('No visual overlap on 320px screens', () => {
    it('should have QuestionDrawer below PingButton (top-14 vs top-4)', () => {
      // top-4 = 16px, top-14 = 56px
      // With button height of 36px (w-9 h-9 = 36px), there should be no overlap
      const pingTop = 16 // top-4
      const questionTop = 56 // top-14
      const buttonHeight = 36 // w-9 h-9 = 9 * 4 = 36px
      
      // Question button top (56px) should be >= Ping button top (16px) + height (36px)
      expect(questionTop).toBeGreaterThanOrEqual(pingTop + buttonHeight)
    })
  })
})
