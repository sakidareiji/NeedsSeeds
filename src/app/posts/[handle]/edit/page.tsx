import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PostForm } from "@/components/PostForm";
import { updatePost } from "@/lib/posts/actions";
import { getActiveCategories } from "@/lib/categories";
import { getPostById } from "@/lib/posts/queries";
import { getAuthUser } from "@/lib/auth";
import { idFromHandle, postHandle } from "@/lib/format";

export const metadata: Metadata = { title: "投稿を編集" };

export default async function EditPostPage({
  params,
}: {
  params: { handle: string };
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const id = idFromHandle(params.handle);
  if (!id) notFound();

  const post = await getPostById(id);
  if (!post || post.status === "deleted") notFound();
  if (post.user_id !== user.id) notFound(); // only the author may edit
  // 「わかる」が一つでも付いたら編集不可(URL直打ちでの回避も防ぐ)。
  if (post.empathy_count > 0) redirect(`/posts/${postHandle(post.id, post.title)}`);

  const categories = await getActiveCategories();
  const action = updatePost.bind(null, post.id);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">投稿を編集</h1>
      <PostForm
        action={action}
        categories={categories}
        submitLabel="更新する"
        defaults={{
          title: post.title,
          body: post.body,
          category_id: post.category_id,
          severity: post.severity,
          frequency: post.frequency,
        }}
      />
    </div>
  );
}
