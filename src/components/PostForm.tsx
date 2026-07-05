"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/posts/actions";
import { FREQUENCY_LABELS, SEVERITY_LABELS } from "@/lib/format";
import { FREQUENCIES } from "@/lib/posts/schema";

type Category = { id: number; name: string };

type Defaults = {
  title?: string;
  body?: string;
  category_id?: number;
  severity?: number;
  frequency?: string | null;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-500 px-6 py-2.5 font-medium text-white hover:bg-brand-600 disabled:opacity-50"
    >
      {pending ? "送信中…" : label}
    </button>
  );
}

export function PostForm({
  action,
  categories,
  defaults,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Category[];
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, null);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="title">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={60}
          defaultValue={defaults?.title}
          placeholder="何に困っていますか?(60字以内)"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="body">
          本文 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="body"
          name="body"
          required
          maxLength={2000}
          rows={8}
          defaultValue={defaults?.body}
          placeholder="いつ・どんな状況で・何に困るかを書いてみてください。具体的なほど、AIが役立つヒントを見つけやすくなります。"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="category_id">
          カテゴリ <span className="text-red-500">*</span>
        </label>
        <select
          id="category_id"
          name="category_id"
          required
          defaultValue={defaults?.category_id ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        >
          <option value="" disabled>
            選択してください
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-1 block text-sm font-medium">
          困る度合い <span className="text-red-500">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
            >
              <input
                type="radio"
                name="severity"
                value={n}
                required
                defaultChecked={defaults?.severity === n}
                className="accent-brand-500"
              />
              {n}・{SEVERITY_LABELS[n]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="frequency">
          頻度(任意)
        </label>
        <select
          id="frequency"
          name="frequency"
          defaultValue={defaults?.frequency ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        >
          <option value="">選択しない</option>
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {FREQUENCY_LABELS[f]}
            </option>
          ))}
        </select>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
