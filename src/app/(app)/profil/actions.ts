"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuthError, changePassword, setTeamName } from "@/lib/auth/accounts";
import { requireManager } from "@/lib/auth/current";
import { endManagerSession } from "@/lib/auth/session";

export interface ProfileState {
  error: string | null;
  ok: string | null;
}

export async function renameTeamAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { manager } = await requireManager();
  try {
    await setTeamName(manager.id, String(formData.get("teamName") ?? ""));
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message, ok: null };
    throw error;
  }
  revalidatePath("/", "layout");
  return { error: null, ok: "Takım adın güncellendi." };
}

export async function changePasswordAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { manager } = await requireManager();
  const next = String(formData.get("newPassword") ?? "");
  if (next !== String(formData.get("newPasswordAgain") ?? "")) {
    return { error: "İki yeni şifre aynı değil.", ok: null };
  }
  try {
    await changePassword(manager.id, String(formData.get("currentPassword") ?? ""), next);
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message, ok: null };
    throw error;
  }
  return { error: null, ok: "Şifren değişti." };
}

export async function logoutAction(): Promise<void> {
  await endManagerSession();
  redirect("/giris");
}
