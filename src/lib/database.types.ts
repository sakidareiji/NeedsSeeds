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
          resolved_at?: string | null;
          resolved_by?: ResolvedBy | null;
          resolved_solution_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
