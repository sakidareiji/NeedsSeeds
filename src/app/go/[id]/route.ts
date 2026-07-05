import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 解決策クリックのリダイレクト計測(F9)。/go/[postSolutionId] 経由で必ずログを取る。
 * post_solution からマスタ解決策のURLを引き、クリックを記録してから遷移する。
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("post_solutions")
    .select("id, post_id, solution:solutions(id, url, status)")
    .eq("id", params.id)
    .maybeSingle();

  const solution = (data as unknown as {
    post_id: string;
    solution: { id: string; url: string; status: string } | null;
  } | null)?.solution;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // 一般アドバイス(URLなし)や掲載停止・不明IDはトップへ。
  if (!data || !solution || solution.status !== "active") {
    return NextResponse.redirect(siteUrl || new URL("/", _request.url));
  }

  await logEvent({
    type: "solution_click",
    postId: (data as unknown as { post_id: string }).post_id,
    solutionId: solution.id,
    meta: { post_solution_id: params.id },
  });

  return NextResponse.redirect(solution.url);
}
