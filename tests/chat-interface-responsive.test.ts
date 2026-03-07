import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('ChatInterface Responsive Layout', () => {
  const globalsCssPath = resolve(__dirname, '../app/globals.css')
  const globalsCss = readFileSync(globalsCssPath, 'utf-8')
  const messageInputPath = resolve(__dirname, '../components/chat/MessageInput.tsx')
  const messageInput = readFileSync(messageInputPath, 'utf-8')

  describe('safe-area-inset padding on form container', () => {
    it('should define .chat-form-container with padding-left using safe-area-inset-left', () => {
      expect(globalsCss).toMatch(/\.chat-form-container\s*\{[^}]*padding-left:\s*var\(--safe-area-inset-left\)/)
    })

    it('should define .chat-form-container with padding-right using safe-area-inset-right', () => {
      expect(globalsCss).toMatch(/\.chat-form-container\s*\{[^}]*padding-right:\s*var\(--safe-area-inset-right\)/)
    })

    it('should apply chat-form-container class to form wrapper in MessageInput', () => {
      expect(messageInput).toContain('className="chat-form-container"')
    })
  })

  describe('no horizontal scroll on 320px screens', () => {
    it('should have overflow-x: hidden on .chat-form-container at max-width: 320px', () => {
      expect(globalsCss).toMatch(/@media\s*\(\s*max-width:\s*320px\s*\)\s*\{[^}]*\.chat-form-container\s*\{[^}]*overflow-x:\s*hidden/)
    })
  })

  describe('button size reduction on screens < 380px', () => {
    it('should reduce .chat-button-attach to w-9 h-9 (2.25rem) on screens < 380px', () => {
      expect(globalsCss).toMatch(/@media\s*\(\s*max-width:\s*379px\s*\)\s*\{[^}]*\.chat-button-attach[^}]*width:\s*2\.25rem/)
      expect(globalsCss).toMatch(/@media\s*\(\s*max-width:\s*379px\s*\)\s*\{[^}]*\.chat-button-attach[^}]*height:\s*2\.25rem/)
    })

    it('should reduce .chat-button-audio to w-9 h-9 (2.25rem) on screens < 380px', () => {
      expect(globalsCss).toMatch(/@media\s*\(\s*max-width:\s*379px\s*\)\s*\{[^}]*\.chat-button-audio[^}]*width:\s*2\.25rem/)
      expect(globalsCss).toMatch(/@media\s*\(\s*max-width:\s*379px\s*\)\s*\{[^}]*\.chat-button-audio[^}]*height:\s*2\.25rem/)
    })

    it('should apply chat-button-attach class to image button', () => {
      expect(messageInput).toMatch(/className="chat-button-attach/)
    })

    it('should apply chat-button-audio class to audio button', () => {
      expect(messageInput).toMatch(/className=.*chat-button-audio/)
    })
  })

  describe('textarea min-height for mobile typing', () => {
    it('should have textarea with minHeight of 44px in MessageInput', () => {
      expect(messageInput).toMatch(/minHeight:\s*['"]44px['"]/)
    })
  })

  describe('send button touch target', () => {
    it('should have send button with min-w-[44px] min-h-[44px] for touch target', () => {
      expect(messageInput).toMatch(/min-w-\[44px\].*min-h-\[44px\]|min-h-\[44px\].*min-w-\[44px\]/)
    })
  })

  describe('stacking buttons on very narrow screens', () => {
    it('should stack chat-input-row with flex-wrap on screens < 340px', () => {
      expect(globalsCss).toMatch(/@media\s*\(max-width:\s*340px\)/)
      expect(globalsCss).toMatch(/\.chat-input-row\s*\{[^}]*flex-wrap:\s*wrap/)
    })

    it('should make chat-buttons-left full width on screens < 340px', () => {
      expect(globalsCss).toContain('.chat-input-row .chat-buttons-left')
      expect(globalsCss).toMatch(/\.chat-input-row\s*\.chat-buttons-left\s*\{[^}]*width:\s*100%/)
    })

    it('should apply chat-input-row class to form element', () => {
      expect(messageInput).toMatch(/className="flex items-end gap-2 chat-input-row"/)
    })
  })
})

describe('ChatInterface Component Structure', () => {
  const chatInterfacePath = resolve(__dirname, '../components/chat/ChatInterface.tsx')
  const chatInterface = readFileSync(chatInterfacePath, 'utf-8')

  it('should import MessageInput component', () => {
    expect(chatInterface).toContain("import { MessageInput } from './MessageInput'")
  })

  it('should render MessageInput in text mode', () => {
    expect(chatInterface).toContain('<MessageInput')
  })
})
