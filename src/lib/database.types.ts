/**
 * Hand-maintained Supabase schema types. Kept in sync with the migrations in
 * /supabase/migrations. Grown per milestone. To regenerate from a live DB:
 *   supabase gen types typescript --local > src/lib/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "user" | "admin" | "seed" | "company";
export type PostStatus = "published" | "hidden" | "deleted";
export type AiStatus = "pending" | "processing" | "done" | "failed";
export type ResolvedBy = "solution" | "self" | "other";
export type Frequency = "daily" | "weekly" | "monthly" | "rarely";
export type SolutionStatus = "active" | "paused";
export type SolutionSource = "master" | "ai_generated";
export type ReportStatus = "open" | "reviewing" | "closed";
export type ContactCategory =
  | "general"
  | "disclosure"
  | "deletion"
  | "infringement"
  | "ad"
  | "other";
export type ContactStatus = "open" | "closed";
export type Gender = "male" | "female" | "other" | "unspecified";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          display_name: string;
          bio: string | null;
          role: UserRole;
          contribution_score: number;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          bio?: string | null;
          role?: UserRole;
          contribution_score?: number;
          created_at?: string;
        };
        Update: {
          display_name?: string;
          bio?: string | null;
          role?: UserRole;
          contribution_score?: number;
        };
        Relationships: [];
      };
      /** 本人にしか見えない属性(0015 で users から分離)。 */
      user_private: {
        Row: {
          user_id: string;
          gender: Gender | null;
          age: number | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          gender?: Gender | null;
          age?: number | null;
          updated_at?: string;
        };
        Update: {
          gender?: Gender | null;
          age?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: number;
          slug: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          description: string;
        };
        Insert: {
          id?: number;
          slug: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          description?: string;
        };
        Update: {
          slug?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
          description?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          category_id: number;
          title: string;
          body: string;
          severity: number;
          frequency: Frequency | null;
          status: PostStatus;
          ai_status: AiStatus;
          ai_started_at: string | null;
          resolved_at: string | null;
          resolved_by: ResolvedBy | null;
          resolved_solution_id: string | null;
          resolution_note: string | null;
          empathy_count: number;
          quality_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: number;
          title: string;
          body: string;
          severity: number;
          frequency?: Frequency | null;
          status?: PostStatus;
          ai_status?: AiStatus;
        };
        Update: {
          category_id?: number;
          title?: string;
          body?: string;
          severity?: number;
          frequency?: Frequency | null;
          status?: PostStatus;
          ai_status?: AiStatus;
          ai_started_at?: string | null;
          quality_score?: number | null;
          resolved_at?: string | null;
          resolved_by?: ResolvedBy | null;
          resolved_solution_id?: string | null;
          resolution_note?: string | null;
        };
        Relationships: [];
      };
      solutions: {
        Row: {
          id: string;
          name: string;
          description: string;
          url: string;
          is_affiliate: boolean;
          commercial_types: string[];
          category_ids: number[];
          status: SolutionStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          url: string;
          is_affiliate?: boolean;
          commercial_types?: string[];
          category_ids?: number[];
          status?: SolutionStatus;
        };
        Update: {
          name?: string;
          description?: string;
          url?: string;
          is_affiliate?: boolean;
          commercial_types?: string[];
          category_ids?: number[];
          status?: SolutionStatus;
        };
        Relationships: [];
      };
      post_analyses: {
        Row: {
          id: string;
          post_id: string;
          sub_tags: Json;
          commercial_type: string | null;
          moderation_flags: Json;
          is_sensitive: boolean;
          quality_score: number | null;
          follow_up_question: string | null;
          raw_llm_output: Json | null;
          model: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          sub_tags?: Json;
          commercial_type?: string | null;
          moderation_flags?: Json;
          is_sensitive?: boolean;
          quality_score?: number | null;
          follow_up_question?: string | null;
          raw_llm_output?: Json | null;
          model?: string | null;
        };
        Update: {
          sub_tags?: Json;
          commercial_type?: string | null;
          moderation_flags?: Json;
          is_sensitive?: boolean;
          quality_score?: number | null;
          follow_up_question?: string | null;
          raw_llm_output?: Json | null;
          model?: string | null;
        };
        Relationships: [];
      };
      post_solutions: {
        Row: {
          id: string;
          post_id: string;
          solution_id: string | null;
          source: SolutionSource;
          pitch_text: string;
          rank: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          solution_id?: string | null;
          source: SolutionSource;
          pitch_text: string;
          rank?: number;
        };
        Update: {
          pitch_text?: string;
          rank?: number;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: number;
          type: string;
          user_id: string | null;
          post_id: string | null;
          solution_id: string | null;
          meta: Json;
          created_at: string;
        };
        Insert: {
          type: string;
          user_id?: string | null;
          post_id?: string | null;
          solution_id?: string | null;
          meta?: Json;
        };
        Update: {
          meta?: Json;
        };
        Relationships: [];
      };
      empathies: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: { id?: string; post_id: string; user_id: string };
        Update: { post_id?: string; user_id?: string };
        Relationships: [];
      };
      helpful_marks: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: { id?: string; post_id: string; user_id: string };
        Update: { post_id?: string; user_id?: string };
        Relationships: [];
      };
      contribution_logs: {
        Row: {
          id: string;
          user_id: string;
          post_id: string | null;
          points: number;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id?: string | null;
          points: number;
          reason: string;
        };
        Update: { points?: number; reason?: string };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          payload: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          payload?: Json;
          read_at?: string | null;
        };
        Update: { read_at?: string | null };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          post_id: string;
          user_id: string | null;
          reason: string;
          status: ReportStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id?: string | null;
          reason: string;
          status?: ReportStatus;
        };
        Update: { status?: ReportStatus };
        Relationships: [];
      };
      /** 問い合わせ窓口(/contact)の受信箱。サービスロール専用(0016)。 */
      contact_messages: {
        Row: {
          id: string;
          user_id: string | null;
          name: string | null;
          email: string;
          category: ContactCategory;
          message: string;
          ip: string | null;
          status: ContactStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name?: string | null;
          email: string;
          category: ContactCategory;
          message: string;
          ip?: string | null;
          status?: ContactStatus;
        };
        Update: { status?: ContactStatus };
        Relationships: [];
      };
    };
    Views: {
      post_public_analysis: {
        Row: {
          post_id: string | null;
          sub_tags: Json | null;
          follow_up_question: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      /** 一覧・関連投稿の並び(0019)。id のみ返す。 */
      feed_post_ids: {
        Args: {
          p_sort?: string;
          p_category_id?: number | null;
          p_search?: string | null;
          p_exclude_post_id?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: string[];
      };
    };
    Enums: Record<string, never>;
  };
}
