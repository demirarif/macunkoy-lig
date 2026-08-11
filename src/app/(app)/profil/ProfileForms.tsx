"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  renameTeamAction,
  type ProfileState,
} from "./actions";
import { ErrorNote } from "@/components/Ui";

const EMPTY: ProfileState = { error: null, ok: null };

const inputClass =
  "w-full rounded-xl bg-ink-850 px-4 py-3 text-base text-chalk placeholder:text-chalk-faint edge-light";
const labelClass =
  "mb-1 block text-xs font-bold uppercase tracking-wider text-chalk-faint";
const buttonClass =
  "w-full rounded-xl bg-ink-800 py-3 text-sm font-black uppercase tracking-widest text-chalk ring-1 ring-ink-700 transition active:scale-[0.98] disabled:opacity-50";

function Feedback({ state }: { state: ProfileState }) {
  if (state.error) return <ErrorNote>{state.error}</ErrorNote>;
  if (state.ok)
    return (
      <p className="rounded-lg bg-neon/10 px-3 py-2 text-sm font-semibold text-neon ring-1 ring-neon/30">
        {state.ok}
      </p>
    );
  return null;
}

export function RenameTeamForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(renameTeamAction, EMPTY);
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className={labelClass}>Takım adın</span>
        <input
          name="teamName"
          defaultValue={current}
          maxLength={24}
          required
          className={inputClass}
        />
      </label>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "…" : "Kaydet"}
      </button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, EMPTY);
  return (
    <form action={action} className="space-y-3">
      {(
        [
          ["currentPassword", "Mevcut şifre", "current-password"],
          ["newPassword", "Yeni şifre", "new-password"],
          ["newPasswordAgain", "Yeni şifre tekrar", "new-password"],
        ] as const
      ).map(([name, label, autoComplete]) => (
        <label key={name} className="block">
          <span className={labelClass}>{label}</span>
          <input
            name={name}
            type="password"
            required
            autoComplete={autoComplete}
            className={inputClass}
          />
        </label>
      ))}
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "…" : "Şifreyi değiştir"}
      </button>
    </form>
  );
}
