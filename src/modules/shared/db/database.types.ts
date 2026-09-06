// 생성 파일 — 손으로 고치지 않는다. 재생성: npm run db:types (scripts/gen-db-types.sh)
// 원본은 Supabase 실제 스키마(public). 마이그레이션 뒤 재생성하지 않으면 src/schema.test.ts가 표 목록 불일치를 잡는다
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_feed: {
        Row: {
          action: string
          domain: string
          entity_id: number
          entity_type: string
          id: number
          occurred_at: string
          summary: string
        }
        Insert: {
          action: string
          domain: string
          entity_id: number
          entity_type: string
          id?: never
          occurred_at?: string
          summary: string
        }
        Update: {
          action?: string
          domain?: string
          entity_id?: number
          entity_type?: string
          id?: never
          occurred_at?: string
          summary?: string
        }
        Relationships: []
      }
      book: {
        Row: {
          author: string
          created_at: string
          id: number
          note: string | null
          pub_year: string
          publisher: string
          title: string
          translator: string | null
        }
        Insert: {
          author: string
          created_at?: string
          id?: never
          note?: string | null
          pub_year: string
          publisher: string
          title: string
          translator?: string | null
        }
        Update: {
          author?: string
          created_at?: string
          id?: never
          note?: string | null
          pub_year?: string
          publisher?: string
          title?: string
          translator?: string | null
        }
        Relationships: []
      }
      en_review_log: {
        Row: {
          id: number
          rating: number
          reviewed_at: string
          word_id: number
        }
        Insert: {
          id?: never
          rating: number
          reviewed_at?: string
          word_id: number
        }
        Update: {
          id?: never
          rating?: number
          reviewed_at?: string
          word_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "en_review_log_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "en_words"
            referencedColumns: ["id"]
          },
        ]
      }
      en_sentence_fetch: {
        Row: {
          fetched_at: string
          word_id: number
        }
        Insert: {
          fetched_at?: string
          word_id: number
        }
        Update: {
          fetched_at?: string
          word_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "en_sentence_fetch_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: true
            referencedRelation: "en_words"
            referencedColumns: ["id"]
          },
        ]
      }
      en_sentences: {
        Row: {
          en_text: string | null
          id: number
          ko_text: string | null
          source_url: string | null
          text: string
          word_id: number
        }
        Insert: {
          en_text?: string | null
          id?: never
          ko_text?: string | null
          source_url?: string | null
          text: string
          word_id: number
        }
        Update: {
          en_text?: string | null
          id?: never
          ko_text?: string | null
          source_url?: string | null
          text?: string
          word_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "en_sentences_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "en_words"
            referencedColumns: ["id"]
          },
        ]
      }
      en_words: {
        Row: {
          created_at: string
          difficulty: number | null
          due: string | null
          elapsed_days: number
          id: number
          lapses: number
          last_review: string | null
          learning_steps: number
          meaning: string
          norm: string
          reps: number
          scheduled_days: number
          stability: number | null
          state: number
          word: string
        }
        Insert: {
          created_at?: string
          difficulty?: number | null
          due?: string | null
          elapsed_days?: number
          id?: never
          lapses?: number
          last_review?: string | null
          learning_steps?: number
          meaning: string
          norm: string
          reps?: number
          scheduled_days?: number
          stability?: number | null
          state?: number
          word: string
        }
        Update: {
          created_at?: string
          difficulty?: number | null
          due?: string | null
          elapsed_days?: number
          id?: never
          lapses?: number
          last_review?: string | null
          learning_steps?: number
          meaning?: string
          norm?: string
          reps?: number
          scheduled_days?: number
          stability?: number | null
          state?: number
          word?: string
        }
        Relationships: []
      }
      es_review_log: {
        Row: {
          id: number
          rating: number
          reviewed_at: string
          word_id: number
        }
        Insert: {
          id?: never
          rating: number
          reviewed_at?: string
          word_id: number
        }
        Update: {
          id?: never
          rating?: number
          reviewed_at?: string
          word_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "es_review_log_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "es_words"
            referencedColumns: ["id"]
          },
        ]
      }
      es_sentence_fetch: {
        Row: {
          fetched_at: string
          word_id: number
        }
        Insert: {
          fetched_at?: string
          word_id: number
        }
        Update: {
          fetched_at?: string
          word_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "es_sentence_fetch_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: true
            referencedRelation: "es_words"
            referencedColumns: ["id"]
          },
        ]
      }
      es_sentences: {
        Row: {
          en_text: string | null
          id: number
          ko_text: string | null
          source_url: string | null
          text: string
          word_id: number
        }
        Insert: {
          en_text?: string | null
          id?: never
          ko_text?: string | null
          source_url?: string | null
          text: string
          word_id: number
        }
        Update: {
          en_text?: string | null
          id?: never
          ko_text?: string | null
          source_url?: string | null
          text?: string
          word_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "es_sentences_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "es_words"
            referencedColumns: ["id"]
          },
        ]
      }
      es_words: {
        Row: {
          created_at: string
          difficulty: number | null
          due: string | null
          elapsed_days: number
          gender: string
          id: number
          lapses: number
          last_review: string | null
          learning_steps: number
          meaning: string
          norm: string
          reps: number
          scheduled_days: number
          stability: number | null
          state: number
          word: string
        }
        Insert: {
          created_at?: string
          difficulty?: number | null
          due?: string | null
          elapsed_days?: number
          gender: string
          id?: never
          lapses?: number
          last_review?: string | null
          learning_steps?: number
          meaning: string
          norm: string
          reps?: number
          scheduled_days?: number
          stability?: number | null
          state?: number
          word: string
        }
        Update: {
          created_at?: string
          difficulty?: number | null
          due?: string | null
          elapsed_days?: number
          gender?: string
          id?: never
          lapses?: number
          last_review?: string | null
          learning_steps?: number
          meaning?: string
          norm?: string
          reps?: number
          scheduled_days?: number
          stability?: number | null
          state?: number
          word?: string
        }
        Relationships: []
      }
      reading: {
        Row: {
          book_id: number
          created_at: string
          finished_on: string
          id: number
          rating: number | null
        }
        Insert: {
          book_id: number
          created_at?: string
          finished_on?: string
          id?: never
          rating?: number | null
        }
        Update: {
          book_id?: number
          created_at?: string
          finished_on?: string
          id?: never
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "book"
            referencedColumns: ["id"]
          },
        ]
      }
      reflection_entry: {
        Row: {
          content: string
          context: string | null
          created_at: string
          id: number
          thread_id: number
        }
        Insert: {
          content: string
          context?: string | null
          created_at?: string
          id?: never
          thread_id: number
        }
        Update: {
          content?: string
          context?: string | null
          created_at?: string
          id?: never
          thread_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "reflection_entry_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "reflection_thread"
            referencedColumns: ["id"]
          },
        ]
      }
      reflection_thread: {
        Row: {
          created_at: string
          id: number
          subject_id: number
          subject_type: string
        }
        Insert: {
          created_at?: string
          id?: never
          subject_id: number
          subject_type: string
        }
        Update: {
          created_at?: string
          id?: never
          subject_id?: number
          subject_type?: string
        }
        Relationships: []
      }
      tag: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: never
          name: string
        }
        Update: {
          id?: never
          name?: string
        }
        Relationships: []
      }
      tagging: {
        Row: {
          id: number
          subject_id: number
          subject_type: string
          tag_id: number
        }
        Insert: {
          id?: never
          subject_id: number
          subject_type: string
          tag_id: number
        }
        Update: {
          id?: never
          subject_id?: number
          subject_type?: string
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tagging_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tag"
            referencedColumns: ["id"]
          },
        ]
      }
      thought: {
        Row: {
          content: string
          created_at: string
          id: number
          topics: string[] | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: never
          topics?: string[] | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          topics?: string[] | null
        }
        Relationships: []
      }
      thought_digest: {
        Row: {
          created_at: string
          day: string
          id: number
          model: string
          summary: string
          topics: string[]
        }
        Insert: {
          created_at?: string
          day: string
          id?: never
          model: string
          summary: string
          topics?: string[]
        }
        Update: {
          created_at?: string
          day?: string
          id?: never
          model?: string
          summary?: string
          topics?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      en_daily_stats: {
        Args: { tz: string }
        Returns: {
          correct: number
          day: string
          total: number
        }[]
      }
      en_word_stats: {
        Args: never
        Returns: {
          correct: number
          first_reviewed_at: string
          reviews: number
          word_id: number
        }[]
      }
      es_daily_stats: {
        Args: { tz: string }
        Returns: {
          correct: number
          day: string
          total: number
        }[]
      }
      es_word_stats: {
        Args: never
        Returns: {
          correct: number
          first_reviewed_at: string
          reviews: number
          word_id: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

