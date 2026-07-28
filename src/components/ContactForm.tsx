"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { submitContact, type ContactState } from "@/lib/contact/actions";
import { CONTACT_CATEGORIES } from "@/lib/contact/schema";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-500 px-6 py-2.5 font-medium text-white hover:bg-brand-600 disabled:opacity-50"
    >
      {pending ? "送信中…" : "送信する"}
    </button>
  );
}

export function ContactForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction] = useFormState<ContactState, FormData>(
    submitContact,
    null
  );

  if (state?.ok) {
    return (
      <div className="rounded-xl bg-emerald-50 px-4 py-5 text-sm text-emerald-800">
        <p className="font-medium">お問い合わせを受け付けました。</p>
        <p className="mt-1">
          ご記入のメールアドレス宛に、運営者から改めてご連絡します。
        </p>
        <Link href="/" className="mt-3 inline-block text-brand-700 hover:underline">
          トップへ戻る
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="category">
          お問い合わせの種類 <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue="general"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        >
          {CONTACT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="email">
          返信先メールアドレス <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={200}
          defaultValue={defaultEmail ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="name">
          お名前(任意)
        </label>
        <input
          id="name"
          name="name"
          type="text"
          maxLength={60}
          placeholder="ニックネームでも構いません"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="message">
          お問い合わせ内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={2000}
          rows={8}
          placeholder="対象の投稿がある場合は、そのURLもご記入ください。"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
      </div>

      {/* ボット除け。人には見せず、埋まっていたら送信を無視する。 */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <p className="text-xs text-neutral-500">
        送信いただいた内容とメールアドレスは、お問い合わせへの回答のためにのみ利用します
        (
        <Link href="/privacy" className="text-brand-600 hover:underline">
          プライバシーポリシー
        </Link>
        )。
      </p>

      <SubmitButton />
    </form>
  );
}
