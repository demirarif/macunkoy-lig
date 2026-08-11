"use server";

import { redirect } from "next/navigation";
import { AuthError, verifyAdmin } from "@/lib/auth/accounts";
import { startAdminSession } from "@/lib/auth/session";

export interface AdminLoginState {
  error: string | null;
}

export async function adminLoginAction(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    if (!(await verifyAdmin(username, password))) {
      return { error: "Kullanıcı adı veya şifre yanlış." };
    }
    await startAdminSession(username);
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }
  redirect("/admin");
}
