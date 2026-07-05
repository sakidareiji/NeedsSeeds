import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";

type EventType =
  | "post_create"
  | "solution_imp"
  | "solution_click"
  | "empathy"
  | "resolution";

/** イベントを1件記録する(F9)。計測はサービスロールで書き込む。 */
export async function logEvent(input: {
  type: EventType;
  userId?: string | null;
  postId?: string | null;
  solutionId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("events").insert({
    type: input.type,
    user_id: input.userId ?? null,
    post_id: input.postId ?? null,
    solution_id: input.solutionId ?? null,
    meta: (input.meta ?? {}) as Json,
  });
}

/** 解決のヒント表示(imp)をまとめて記録する(F9)。 */
export async function logImpressions(
  postId: string,
  postSolutionIds: string[]
): Promise<void> {
  if (postSolutionIds.length === 0) return;
  const admin = createAdminClient();
  await admin.from("events").insert(
    postSolutionIds.map((psId) => ({
      type: "solution_imp",
      post_id: postId,
      meta: { post_solution_id: psId },
    }))
  );
}
