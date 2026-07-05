import { createClient } from "@/lib/supabase/server";

export type SolutionHint = {
  /** post_solutions.id — /go/[id] のクリック計測キー */
  id: string;
  source: "master" | "ai_generated";
  pitchText: string;
  solution: {
    id: string;
    name: string;
    isAffiliate: boolean;
  } | null;
};

/**
 * 投稿詳細に出す「解決のヒント」を取得(F4)。RLS により公開投稿のみ。
 * 一般アドバイス(source=ai_generated)は solution が null。
 */
export async function getPostHints(postId: string): Promise<SolutionHint[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("post_solutions")
    .select(
      "id, source, pitch_text, rank, solution:solutions(id, name, is_affiliate)"
    )
    .eq("post_id", postId)
    .order("rank", { ascending: true });

  type Row = {
    id: string;
    source: "master" | "ai_generated";
    pitch_text: string;
    solution: { id: string; name: string; is_affiliate: boolean } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    source: r.source,
    pitchText: r.pitch_text,
    solution: r.solution
      ? {
          id: r.solution.id,
          name: r.solution.name,
          isAffiliate: r.solution.is_affiliate,
        }
      : null,
  }));
}

/** 投稿詳細に出す運営AIからの追記促し(F3-7)。公開ビュー経由(quality等は非公開)。 */
export async function getFollowUpQuestion(
  postId: string
): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("post_public_analysis")
    .select("follow_up_question")
    .eq("post_id", postId)
    .maybeSingle();
  return data?.follow_up_question ?? null;
}
