"use server";

import { revalidatePath } from "next/cache";
import { requireManager } from "@/lib/auth/current";
import { openGameweek, playerMap } from "@/lib/db/state";
import { mutate } from "@/lib/db/store";
import { autoPickSquad, validateSquad } from "@/lib/domain/squad";
import type { SquadPick } from "@/lib/domain/types";
import { ensureTimeline } from "@/lib/services/gameweek";

export interface SaveSquadState {
  error: string | null;
  savedAt: number | null;
}

export async function saveSquadAction(
  _prev: SaveSquadState,
  formData: FormData,
): Promise<SaveSquadState> {
  await ensureTimeline();
  const { state, manager } = await requireManager();

  const gw = openGameweek(state);
  if (!gw) {
    return { error: "Şu anda seçim penceresi kapalı.", savedAt: null };
  }
  if (new Date(gw.lockAt).getTime() <= Date.now()) {
    return { error: "Kilit saati geçti. Kadro değiştirilemez.", savedAt: null };
  }

  const formationId = String(formData.get("formationId") ?? "");
  let picks: SquadPick[];
  try {
    picks = JSON.parse(String(formData.get("picks") ?? "[]")) as SquadPick[];
  } catch {
    return { error: "Kadro okunamadı, sayfayı yenileyip tekrar dene.", savedAt: null };
  }

  const validation = validateSquad(
    formationId,
    picks,
    playerMap(state),
    gw,
    state.config,
  );
  if (!validation.ok) {
    return { error: validation.errors[0], savedAt: null };
  }

  await mutate((draft) => {
    const existing = draft.squads.find(
      (s) => s.gameweekId === gw.id && s.managerId === manager.id,
    );
    const now = new Date().toISOString();
    if (existing) {
      existing.formationId = formationId;
      existing.picks = picks;
      existing.source = "manual";
      existing.updatedAt = now;
      return;
    }
    draft.squads.push({
      id: `sq-${gw.id}-${manager.id}`,
      gameweekId: gw.id,
      managerId: manager.id,
      formationId,
      picks,
      source: "manual",
      updatedAt: now,
    });
  });

  revalidatePath("/kadro");
  revalidatePath("/");
  return { error: null, savedAt: Date.now() };
}

/** "Bana bir kadro kur" — bütçeyi sonuna kadar kullanan geçerli bir takım üretir. */
export async function autoPickAction(formationId: string): Promise<SquadPick[]> {
  const { state } = await requireManager();
  const gw = openGameweek(state);
  if (!gw) return [];
  return autoPickSquad(formationId, state.players, gw, state.config);
}
