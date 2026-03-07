import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Drawer Mobile Layout - US-005', () => {
  const drawerFiles = [
    { name: 'QuestionDrawer', path: '../components/questions/QuestionDrawer.tsx' },
    { name: 'RecapDrawer', path: '../components/recap/RecapDrawer.tsx' },
    { name: 'CalendarDrawer', path: '../components/calendar/CalendarDrawer.tsx' },
    { name: 'PhotoDrawer', path: '../components/photos/PhotoDrawer.tsx' },
    { name: 'WishlistDrawer', path: '../components/wishlist/WishlistDrawer.tsx' },
  ]

  describe('Dynamic viewport height for drawer panels', () => {
    it.each(drawerFiles)('$name should use max-h-[calc(100dvh-120px)] for mobile browser chrome', ({ path }) => {
      const filePath = resolve(__dirname, path)
      const content = readFileSync(filePath, 'utf-8')
      expect(content).toContain('max-h-[calc(100dvh-120px)]')
    })

    it.each(drawerFiles)('$name should not use max-h-[80vh] (old static value)', ({ path }) => {
      const filePath = resolve(__dirname, path)
      const content = readFileSync(filePath, 'utf-8')
      expect(content).not.toContain('max-h-[80vh]')
    })
  })

  describe('Safe-area padding for home indicator clearance', () => {
    it.each(drawerFiles)('$name should have pb-[env(safe-area-inset-bottom)] for content area', ({ path }) => {
      const filePath = resolve(__dirname, path)
      const content = readFileSync(filePath, 'utf-8')
      expect(content).toContain('pb-[env(safe-area-inset-bottom)]')
    })
  })

  describe('Drawer handle bar visibility', () => {
    it.each(drawerFiles)('$name should have handle bar with shrink-0 to remain visible', ({ path }) => {
      const filePath = resolve(__dirname, path)
      const content = readFileSync(filePath, 'utf-8')
      // Handle bar should have shrink-0 to prevent it from collapsing
      expect(content).toMatch(/Handle bar[\s\S]{0,200}shrink-0/)
    })

    it.each(drawerFiles)('$name should have handle bar positioned at top of drawer', ({ path }) => {
      const filePath = resolve(__dirname, path)
      const content = readFileSync(filePath, 'utf-8')
      // Handle bar should appear before header in the JSX structure
      const handleBarIndex = content.indexOf('Handle bar')
      const headerIndex = content.indexOf('Header')
      expect(handleBarIndex).toBeLessThan(headerIndex)
    })
  })

  describe('Drawer panel structure', () => {
    it.each(drawerFiles)('$name should have fixed positioning at bottom', ({ path }) => {
      const filePath = resolve(__dirname, path)
      const content = readFileSync(filePath, 'utf-8')
      expect(content).toMatch(/fixed[\s\S]{0,100}bottom-0/)
    })

    it.each(drawerFiles)('$name should use flex-col layout', ({ path }) => {
      const filePath = resolve(__dirname, path)
      const content = readFileSync(filePath, 'utf-8')
      expect(content).toContain('flex flex-col')
    })

    it.each(drawerFiles)('$name should have overflow-hidden on panel', ({ path }) => {
      const filePath = resolve(__dirname, path)
      const content = readFileSync(filePath, 'utf-8')
      expect(content).toContain('overflow-hidden')
    })
  })

  describe('Content area scroll behavior', () => {
    it.each(drawerFiles)('$name should have flex-1 overflow-y-auto for scrollable content', ({ path }) => {
      const filePath = resolve(__dirname, path)
      const content = readFileSync(filePath, 'utf-8')
      expect(content).toMatch(/flex-1[\s\S]{0,50}overflow-y-auto/)
    })

    it.each(drawerFiles)('$name should have min-h-0 on content area for proper scrolling', ({ path }) => {
      const filePath = resolve(__dirname, path)
      const content = readFileSync(filePath, 'utf-8')
      expect(content).toContain('min-h-0')
    })
  })
})
