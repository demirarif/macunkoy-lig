"use client";

import { useActionState } from "react";
import { adminLoginAction, type AdminLoginState } from "./actions";
import { ErrorNote } from "@/components/Ui";

const EMPTY: AdminLoginState = { error: null };

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLoginAction, EMPTY);

  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-chalk-faint">
          Kullanıcı adı
        </span>
        <input
          name="username"
          required
          autoComplete="username"
          className="w-full rounded-xl bg-ink-850 px-4 py-3 text-base text-chalk edge-light"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-chalk-faint">
          Şifre
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-xl bg-ink-850 px-4 py-3 text-base text-chalk edge-light"
        />
      </label>
      {state.error && <ErrorNote>{state.error}</ErrorNote>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-flare py-3.5 text-base font-black uppercase tracking-widest text-ink-950 disabled:opacity-50"
      >
        {pending ? "…" : "Giriş yap"}
      </button>
    </form>
  );
}
