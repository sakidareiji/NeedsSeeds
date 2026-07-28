"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateProfile, type ActionState } from "@/lib/profile/actions";
import { GENDERS } from "@/lib/profile/schema";
import type { Gender } from "@/lib/database.types";

const GENDER_LABELS: Record<Gender, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
  unspecified: "回答しない",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-500 px-6 py-2.5 font-medium text-white hover:bg-brand-600 disabled:opacity-50"
    >
      {pending ? "保存中…" : "保存する"}
    </button>
  );
}

export function ProfileForm({
  defaults,
}: {
  defaults: {
    display_name: string;
    bio: string | null;
    gender: Gender | null;
    age: number | null;
  };
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    updateProfile,
    null
  );

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="display_name">
          表示名(ニックネーム) <span className="text-red-500">*</span>
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          maxLength={40}
          defaultValue={defaults.display_name}
          placeholder="実名は不要です"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="bio">
          自己紹介(任意)
        </label>
        <textarea
          id="bio"
          name="bio"
          maxLength={500}
          rows={4}
          defaultValue={defaults.bio ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="gender">
          性別(任意)
        </label>
        <select
          id="gender"
          name="gender"
          defaultValue={defaults.gender ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        >
          <option value="">選択しない</option>
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {GENDER_LABELS[g]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="age">
          年齢(任意)
        </label>
        <input
          id="age"
          name="age"
          type="number"
          min={0}
          max={150}
          defaultValue={defaults.age ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
