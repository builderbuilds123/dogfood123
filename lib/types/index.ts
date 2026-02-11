import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type UserLink = Database['public']['Tables']['user_links']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Referral = Database['public']['Tables']['referrals']['Row']

export type Persona = 'doggo' | 'princess'
export type MessageType = 'text' | 'image' | 'audio'
export type MessageStatus = 'sent' | 'delivered' | 'read'

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
