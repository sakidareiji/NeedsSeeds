import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostById, listRelatedPosts } from "@/lib/posts/queries";
import { getAuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPostHints, getFollowUpQuestion } from "@/lib/solutions";
import { logImpressions } from "@/lib/events";
import {
  idFromHandle,
  postHandle,
  timeAgo,
  FREQUENCY_LABELS,
} from "@/lib/format";
import type { Frequency } from "@/lib/database.types";
import { DeletePostButton } from "@/components/DeletePostButton";
import { SolutionHints } from "@/components/SolutionHints";
import { SeverityBadge } from "@/components/SeverityBadge";
import { AnalyzingHints } from "@/components/AnalyzingHints";
import { FollowUpComment } from "@/components/FollowUpComment";
import { EmpathyButton } from "@/components/EmpathyButton";
import { ResolutionReport } from "@/components/ResolutionReport";
import { HelpfulButton } from "@/components/HelpfulButton";
import { GradeBadge } from "@/components/GradeBadge";
import { CompanyBadge } from "@/components/CompanyBadge";
import { Avatar } from "@/components/Avatar";
import { ReportButton } from "@/components/ReportButton";

export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}): Promise<Metadata> {
  const id = idFromHandle(params.handle);
  const post = id ? await getPostById(id) : null;
  if (!post || post.status !== "published") {
    return { title: "投稿が見つかりません" };
  }
  const description = post.body.slice(0, 120);
  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url: `/posts/${postHandle(post.id, post.title)}`,
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: { handle: string };
}) {
  const id = idFromHandle(params.handle);
  if (!id) notFound();

  const post = await getPostById(id);
  // 非公開・削除済みは 404(F11)。ただし本人は自分の非公開投稿を閲覧可(RLS)。
  const user = await getAuthUser();
  const isOwner = user?.id === post?.user_id;
  if (!post || post.status === "deleted") notFound();
  if (post.status !== "published" && !isOwner) notFound();

  const [hints, followUp, related] = await Promise.all([
    getPostHints(post.id),
    getFollowUpQuestion(post.id),
    post.status === "published"
      ? listRelatedPosts({ id: post.id, category_id: post.category_id })
      : Promise.resolve([]),
  ]);
  const handle = postHandle(post.id, post.title);

  // QAPage 構造化データ(SEO)。回答に相当するもの(解決報告・解決のヒント)が
  // ある公開投稿のみ出力する(Google のリッチリザルトは回答必須のため)。
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const postUrl = `${siteUrl}/posts/${handle}`;
  const qaAnswers = [
    ...(post.resolved_at && post.resolution_note ? [post.resolution_note] : []),
    ...hints.map((h) => h.pitchText),
  ];
  const qaJsonLd =
    post.status === "published" && qaAnswers.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "QAPage",
          mainEntity: {
            "@type": "Question",
            name: post.title,
            text: post.body,
            dateCreated: post.created_at,
            answerCount: qaAnswers.length,
            ...(post.author
              ? { author: { "@type": "Person", name: post.author.display_name } }
              : {}),
            ...(post.resolved_at && post.resolution_note
              ? {
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: post.resolution_note,
                    url: postUrl,
                    upvoteCount: post.empathy_count,
                  },
                }
              : {}),
            ...(hints.length > 0
              ? {
                  suggestedAnswer: hints.map((h) => ({
                    "@type": "Answer",
                    text: h.pitchText,
                    url: postUrl,
                  })),
                }
              : {}),
          },
        }
      : null;

  // 現在ユーザーのリアクション状態(F5/F6)。
  let empathized = false;
  let helpfulMarked = false;
  if (user) {
    const supabase = createClient();
    const [{ data: e }, { data: h }] = await Promise.all([
      supabase.from("empathies").select("id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle(),
      supabase.from("helpful_marks").select("id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle(),
    ]);
    empathized = !!e;
    helpfulMarked = !!h;
  }

  // 解決報告の「提示された解決策」候補(マスタのみ)。
  const presentedSolutions = hints
    .filter((hn) => hn.source === "master" && hn.solution)
    .map((hn) => ({ id: hn.solution!.id, name: hn.solution!.name }));

  // 解決のヒント表示(imp)を計測(F9)。描画をブロックしないよう fire-and-forget。
  if (hints.length > 0) {
    void logImpressions(
      post.id,
      hints.map((h) => h.id)
    ).catch(() => {});
  }

  const showAnalyzing =
    post.status === "published" && post.ai_status === "pending" && hints.length === 0;

  return (
    // 本文の読みやすさのため、広いレイアウトの中でも読み幅は保つ。
    <article className="mx-auto max-w-3xl space-y-6">
      {qaJsonLd && (
        <script
          type="application/ld+json"
          // JSON内の "</script>" 等でHTMLが壊れないよう < をエスケープする
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(qaJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          {post.category && (
            <Link
              href={`/c/${post.category.slug}`}
              className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700"
            >
              {post.category.name}
            </Link>
          )}
          {post.status === "hidden" && (
            <span className="rounded-full bg-neutral-200 px-2 py-0.5">非公開</span>
          )}
          {post.resolved_at && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
              解決済み
            </span>
          )}
          <span>{timeAgo(post.created_at)}</span>
        </div>

        <h1 className="text-2xl font-bold leading-snug">{post.title}</h1>

        <div className="mt-2 flex items-center gap-3 text-sm text-neutral-500">
          {post.author && (
            <span className="flex items-center gap-1.5">
              <Avatar name={post.author.display_name} userId={post.author.id} size="md" />
              <Link href={`/u/${post.author.id}`} className="hover:text-brand-600">
                {post.author.display_name}
              </Link>
              {post.author.role === "company" && <CompanyBadge />}
              <GradeBadge score={post.author.contribution_score} />
            </span>
          )}
          <span className="flex items-center gap-1">
            困り度: <SeverityBadge severity={post.severity} />
          </span>
          {post.frequency && (
            <span>頻度: {FREQUENCY_LABELS[post.frequency as Frequency]}</span>
          )}
        </div>
      </div>

      <div className="whitespace-pre-wrap leading-relaxed text-neutral-800">
        {post.body}
      </div>

      {/* 投稿者が報告した解決方法(F6/F9)。自力・その他で記述があれば公開する。 */}
      {post.resolved_at && post.resolution_note && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="mb-1 text-sm font-medium text-emerald-800">
            投稿者による解決方法
          </p>
          <p className="whitespace-pre-wrap text-sm text-emerald-900/80">
            {post.resolution_note}
          </p>
        </div>
      )}

      {/* 解決のヒント(F4): マスタ提示 + 一般アドバイスを同一UIで。センシティブ/
          NG投稿には何も出さない(パイプライン側で post_solutions を作らない)。 */}
      <SolutionHints hints={hints} />

      {showAnalyzing && <AnalyzingHints />}

      {/* 追記促し(F3-7): 品質が低めの投稿に運営AIからの問いかけ */}
      {followUp && (
        <FollowUpComment question={followUp} canRespond={isOwner} postId={post.id} />
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-4 text-sm text-neutral-500">
        {/* F5「わかる」/ F6 解決報告・私も解決した */}
        <EmpathyButton
          postId={post.id}
          initialCount={post.empathy_count}
          initialEmpathized={empathized}
          canReact={!!user}
          isOwnPost={isOwner}
        />
        {isOwner
          ? !post.resolved_at && (
              <ResolutionReport postId={post.id} presentedSolutions={presentedSolutions} />
            )
          : hints.length > 0 && (
              // 解決のヒントがある投稿にだけ「私も解決した」を出す(F6)
              <HelpfulButton
                postId={post.id}
                initialMarked={helpfulMarked}
                canReact={!!user}
              />
            )}
        {isOwner ? (
          <div className="ml-auto flex items-center gap-3">
            {/* 「わかる」が一つでも付いたら編集不可(共感後の改ざん防止) */}
            {post.empathy_count === 0 && (
              <Link href={`/posts/${handle}/edit`} className="hover:text-brand-600">
                編集
              </Link>
            )}
            <DeletePostButton postId={post.id} />
          </div>
        ) : (
          <div className="ml-auto">
            <ReportButton postId={post.id} canReact={!!user} />
          </div>
        )}
      </div>

      {/* 関連する困りごと(SEO内部リンク): 同カテゴリの注目投稿へ回遊を促す */}
      {related.length > 0 && (
        <section className="border-t border-neutral-200 pt-5">
          <h2 className="mb-3 text-sm font-bold text-neutral-700">
            関連する困りごと
          </h2>
          <ul className="space-y-2">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/posts/${postHandle(r.id, r.title)}`}
                  className="group flex items-baseline gap-2 text-sm"
                >
                  <span className="text-neutral-800 underline-offset-2 group-hover:text-brand-600 group-hover:underline">
                    {r.title}
                  </span>
                  {r.resolved_at && (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
                      解決済み
                    </span>
                  )}
                  {r.empathy_count > 0 && (
                    <span className="shrink-0 text-xs text-neutral-400">
                      わかる {r.empathy_count}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          {post.category && (
            <p className="mt-3 text-xs">
              <Link
                href={`/c/${post.category.slug}`}
                className="text-brand-600 hover:underline"
              >
                {post.category.name}の困りごとをもっと見る →
              </Link>
            </p>
          )}
        </section>
      )}
    </article>
  );
}
