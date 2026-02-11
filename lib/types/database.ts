export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          persona: 'doggo' | 'princess' | null
          display_name: string | null
          avatar_url: string | null
          referral_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          persona?: 'doggo' | 'princess' | null
          display_name?: string | null
          avatar_url?: string | null
          referral_code?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          persona?: 'doggo' | 'princess' | null
          display_name?: string | null
          avatar_url?: string | null
          referral_code?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_links: {
        Row: {
          id: string
          user_a: string
          user_b: string
          created_at: string
        }
        Insert: {
          id?: string
          user_a: string
          user_b: string
          created_at?: string
        }
        Update: {
          id?: string
          user_a?: string
          user_b?: string
          created_at?: string
        }
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referral_code: string
          referred_user_id: string | null
          status: 'pending' | 'accepted' | 'expired'
          created_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          referrer_id: string
          referral_code: string
          referred_user_id?: string | null
          status?: 'pending' | 'accepted' | 'expired'
          created_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          referrer_id?: string
          referral_code?: string
          referred_user_id?: string | null
          status?: 'pending' | 'accepted' | 'expired'
          created_at?: string
          accepted_at?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          link_id: string
          sender_id: string
          receiver_id: string
          message_type: 'text' | 'image' | 'audio'
          content: string | null
          media_url: string | null
          media_metadata: Json
          is_read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          link_id: string
          sender_id: string
          receiver_id: string
          message_type: 'text' | 'image' | 'audio'
          content?: string | null
          media_url?: string | null
          media_metadata?: Json
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          link_id?: string
          sender_id?: string
          receiver_id?: string
          message_type?: 'text' | 'image' | 'audio'
          content?: string | null
          media_url?: string | null
          media_metadata?: Json
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
