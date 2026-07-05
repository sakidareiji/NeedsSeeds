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

export type UserRole = "user" | "admin" | "seed";
export type PostStatus = "published" | "hidden" | "deleted";
export type AiStatus = "pending" | "done" | "failed";
export type ResolvedBy = "solution" | "self" | "other";
export type Frequency = "daily" | "weekly" | "monthly" | "rarely";
export type SolutionStatus = "active" | "paused";
export type SolutionSource = "master" | "ai_generated";

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
      categories: {
        Row: {
          id: number;
          slug: string;
          name: string;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: number;
          slug: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          slug?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
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
          resolved_at: string | null;
          resolved_by: ResolvedBy | null;
          resolved_solution_id: string | null;
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
          quality_score?: number | null;
          resolved_at?: string | null;
          resolved_by?: ResolvedBy | null;
          resolved_solution_id?: string | null;
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
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
