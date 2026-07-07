import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PostForm } from "@/components/PostForm";
import { createPost } from "@/lib/posts/actions";
import { getActiveCategories } from "@/lib/categories";
import { getAuthUser } from "@/lib/auth";

export const metadata: Metadata = { title: "困りごとを投稿" };

export default async function NewPostPage() {
  if (!(await getAuthUser())) redirect("/login?next=/posts/new");
  const categories = await getActiveCategories();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">困りごとを投稿</h1>
      <p className="mb-6 text-sm text-neutral-500">
        投稿すると、AIが解決のヒントを探します。
      </p>
      <PostForm
        action={createPost}
        categories={categories}
        submitLabel="投稿する"
        withPrecheck
      />
    </div>
  );
}
