"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { ErrorNote } from "@/components/Ui";

const EMPTY: LoginState = { error: null };

export function LoginForm({ sampleName }: { sampleName: string }) {
  const [state, action, pending] = useActionState(loginAction, EMPTY);

  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-chalk-faint">
          İsmin
        </span>
        <input
          name="name"
          required
          autoFocus
          autoComplete="username"
          autoCapitalize="words"
          placeholder={`Ör: ${sampleName}`}
          className="w-full rounded-xl bg-ink-850 px-4 py-3.5 text-lg font-semibold text-chalk placeholder:font-normal placeholder:text-chalk-faint edge-light"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-chalk-faint">
          Şifren
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-xl bg-ink-850 px-4 py-3.5 text-lg text-chalk edge-light"
        />
      </label>

      {state.error && <ErrorNote>{state.error}</ErrorNote>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-neon py-4 text-base font-black uppercase tracking-widest text-ink-950 transition active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "…" : "Giriş yap"}
      </button>

      <p className="pt-1 text-center text-xs leading-relaxed text-chalk-faint">
        İlk kez giriyorsan şifren <strong className="text-chalk-dim">kendi ismin</strong>.
        <br />
        İçeri girince hemen kendi şifreni belirleyeceksin.
      </p>
    </form>
  );
}
