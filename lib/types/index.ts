import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type UserLink = Database['public']['Tables']['user_links']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Referral = Database['public']['Tables']['referrals']['Row']
export type MoodCheckin = Database['public']['Tables']['mood_checkins']['Row']
export type WishlistItem = Database['public']['Tables']['wishlist_items']['Row']

export type Ping = Database['public']['Tables']['pings']['Row']
export type SharedSong = Database['public']['Tables']['shared_songs']['Row']
export type DailyQuestion = Database['public']['Tables']['daily_questions']['Row']
export type QuestionAnswer = Database['public']['Tables']['question_answers']['Row']
export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row']
export type WeeklyRecap = Database['public']['Tables']['weekly_recaps']['Row']

export type Persona = 'doggo' | 'princess'
export type MessageType = 'text' | 'image' | 'audio'
export type MessageStatus = 'sent' | 'delivered' | 'read'
export type WishlistCategory = 'dates' | 'travel' | 'food' | 'gifts' | 'goals' | 'other'
export type CalendarEventType = 'milestone' | 'date'

export interface WeeklyRecapStats {
  messages_count: number
  moods_used: string[]
  streak: number
  pings_sent: number
  wishlist_completed: number
  questions_answered: number
  photos_shared: number
  songs_shared: number
  events_added: number
}

export interface MessageWithSender extends Message {
  sender: Pick<Profile, 'id' | 'display_name' | 'persona' | 'avatar_url'>
}

export interface PartnerInfo {
  profile: Profile
  link: UserLink
}

export interface MediaMetadata {
  duration?: number
  size?: number
  mimeType?: string
  width?: number
  height?: number
}
