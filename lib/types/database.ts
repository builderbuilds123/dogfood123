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
      mood_checkins: {
        Row: {
          id: string
          link_id: string
          user_id: string
          emoji: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          link_id: string
          user_id: string
          emoji: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          link_id?: string
          user_id?: string
          emoji?: string
          note?: string | null
          created_at?: string
        }
      }
      wishlist_items: {
        Row: {
          id: string
          link_id: string
          user_id: string
          title: string
          category: 'dates' | 'travel' | 'food' | 'gifts' | 'goals' | 'other'
          completed: boolean
          completed_by: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          link_id: string
          user_id: string
          title: string
          category?: 'dates' | 'travel' | 'food' | 'gifts' | 'goals' | 'other'
          completed?: boolean
          completed_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          link_id?: string
          user_id?: string
          title?: string
          category?: 'dates' | 'travel' | 'food' | 'gifts' | 'goals' | 'other'
          completed?: boolean
          completed_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      pings: {
        Row: {
          id: string
          link_id: string
          sender_id: string
          created_at: string
          seen_at: string | null
        }
        Insert: {
          id?: string
          link_id: string
          sender_id: string
          created_at?: string
          seen_at?: string | null
        }
        Update: {
          id?: string
          link_id?: string
          sender_id?: string
          created_at?: string
          seen_at?: string | null
        }
      }
      daily_questions: {
        Row: {
          id: string
          question_text: string
          display_date: string
        }
        Insert: {
          id?: string
          question_text: string
          display_date: string
        }
        Update: {
          id?: string
          question_text?: string
          display_date?: string
        }
      }
      question_answers: {
        Row: {
          id: string
          question_id: string
          link_id: string
          user_id: string
          answer_text: string
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          link_id: string
          user_id: string
          answer_text: string
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          link_id?: string
          user_id?: string
          answer_text?: string
          created_at?: string
        }
      }
      shared_songs: {
        Row: {
          id: string
          link_id: string
          user_id: string
          track_name: string
          artist_name: string
          artwork_url: string | null
          track_view_url: string | null
          preview_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          link_id: string
          user_id: string
          track_name: string
          artist_name: string
          artwork_url?: string | null
          track_view_url?: string | null
          preview_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          link_id?: string
          user_id?: string
          track_name?: string
          artist_name?: string
          artwork_url?: string | null
          track_view_url?: string | null
          preview_url?: string | null
          created_at?: string
        }
      }
      calendar_events: {
        Row: {
          id: string
          link_id: string
          user_id: string
          title: string
          description: string | null
          event_date: string
          event_type: 'milestone' | 'date'
          emoji: string
          recurring_yearly: boolean
          created_at: string
        }
        Insert: {
          id?: string
          link_id: string
          user_id: string
          title: string
          description?: string | null
          event_date: string
          event_type: 'milestone' | 'date'
          emoji?: string
          recurring_yearly?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          link_id?: string
          user_id?: string
          title?: string
          description?: string | null
          event_date?: string
          event_type?: 'milestone' | 'date'
          emoji?: string
          recurring_yearly?: boolean
          created_at?: string
        }
      }
      weekly_recaps: {
        Row: {
          id: string
          link_id: string
          week_start: string
          week_end: string
          stats: Json
          created_at: string
        }
        Insert: {
          id?: string
          link_id: string
          week_start: string
          week_end: string
          stats?: Json
          created_at?: string
        }
        Update: {
          id?: string
          link_id?: string
          week_start?: string
          week_end?: string
          stats?: Json
          created_at?: string
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
          status: 'sent' | 'delivered' | 'read'
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
          status?: 'sent' | 'delivered' | 'read'
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
          status?: 'sent' | 'delivered' | 'read'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_streak: {
        Args: { p_link_id: string }
        Returns: number
      }
      generate_weekly_recap: {
        Args: { p_link_id: string; p_week_start?: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
