"use server";

import { redirect } from "next/navigation";
import { AuthError, login } from "@/lib/auth/accounts";
import { startManagerSession } from "@/lib/auth/session";

export interface LoginState {
  error: string | null;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "İsmini yaz." };
  if (!password) return { error: "Şifreni yaz." };

  try {
    const result = await login(name, password);
    await startManagerSession(result.manager.id);
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }
  // Şifre değiştirme akışı en sona bırakıldı; şimdilik doğrudan içeri.
  redirect("/");
}
