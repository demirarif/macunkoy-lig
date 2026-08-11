"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminResetAccount } from "@/lib/auth/accounts";
import { endAdminSession, isAdmin } from "@/lib/auth/session";
import { mutate } from "@/lib/db/store";
import {
  GameweekError,
  completeGameweek,
  markHoliday,
  saveStats,
  saveTeams,
  setPromos,
  unmarkHoliday,
  type StatsInput,
  type TeamsInput,
} from "@/lib/services/gameweek";
import type { Slot } from "@/lib/domain/types";

export interface ActionResult {
  error: string | null;
  ok: string | null;
}

/** Her admin aksiyonu oturumu tekrar doğrular — layout kontrolüne güvenmez. */
async function guard(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Yetkisiz.");
}

async function run(fn: () => Promise<unknown>, message: string): Promise<ActionResult> {
  await guard();
  try {
    await fn();
  } catch (error) {
    if (error instanceof GameweekError) return { error: error.message, ok: null };
    return { error: (error as Error).message, ok: null };
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  return { error: null, ok: message };
}

export async function adminLogoutAction(): Promise<void> {
  await endAdminSession();
  redirect("/admin/giris");
}

export async function saveTeamsAction(
  gameweekId: string,
  input: TeamsInput,
): Promise<ActionResult> {
  return run(() => saveTeams(gameweekId, input), "Takımlar kaydedildi.");
}

export async function saveStatsAction(
  gameweekId: string,
  input: StatsInput,
): Promise<ActionResult> {
  return run(() => saveStats(gameweekId, input), "Maç verisi kaydedildi.");
}

export async function completeAction(gameweekId: string): Promise<ActionResult> {
  return run(
    () => completeGameweek(gameweekId),
    "Hafta tamamlandı. Puanlar ve fiyatlar kesinleşti.",
  );
}

export async function holidayAction(gameweekId: string): Promise<ActionResult> {
  return run(() => markHoliday(gameweekId), "Bu hafta maç yok olarak işaretlendi.");
}

export async function unholidayAction(gameweekId: string): Promise<ActionResult> {
  return run(() => unmarkHoliday(gameweekId), "Geri alındı.");
}

export async function setPromosAction(
  gameweekId: string,
  playerIds: string[],
): Promise<ActionResult> {
  return run(() => setPromos(gameweekId, playerIds), "Kampanyalı oyuncular güncellendi.");
}

export async function resetAccountAction(playerId: string): Promise<ActionResult> {
  return run(
    () => adminResetAccount(playerId),
    "Hesap sıfırlandı. Kişi yeniden kendi ismiyle girip şifre belirleyecek.",
  );
}

export interface PlayerPatch {
  name?: string;
  slots?: Slot[];
  price?: number;
  active?: boolean;
  dualKeeper?: boolean;
}

export async function updatePlayerAction(
  playerId: string,
  patch: PlayerPatch,
): Promise<ActionResult> {
  return run(
    () =>
      mutate((draft) => {
        const player = draft.players.find((p) => p.id === playerId);
        if (!player) throw new Error("Oyuncu bulunamadı.");
        if (patch.name !== undefined) player.name = patch.name.trim();
        if (patch.slots !== undefined && patch.slots.length > 0) player.slots = patch.slots;
        if (patch.price !== undefined) {
          player.price = Math.max(
            draft.config.pricing.minPrice,
            Math.min(draft.config.pricing.maxPrice, patch.price),
          );
        }
        if (patch.active !== undefined) player.active = patch.active;
        if (patch.dualKeeper !== undefined) player.dualKeeper = patch.dualKeeper;
      }),
    "Oyuncu güncellendi.",
  );
}

export async function addPlayerAction(
  name: string,
  slots: Slot[],
  price: number,
): Promise<ActionResult> {
  return run(
    () =>
      mutate((draft) => {
        const clean = name.trim();
        if (clean.length < 2) throw new Error("İsim çok kısa.");
        if (slots.length === 0) throw new Error("En az bir mevki seç.");
        const id = slugify(clean);
        if (draft.players.some((p) => p.id === id)) {
          throw new Error("Bu isimde bir oyuncu zaten var.");
        }
        draft.players.push({
          id,
          name: clean,
          slots,
          basePrice: price,
          price,
          dualKeeper: slots.includes("GK") && slots.length > 1,
          active: true,
        });
        draft.priceHistory.push({ gameweekNumber: 0, playerId: id, price });
      }),
    "Oyuncu havuza eklendi.",
  );
}

export async function updateBudgetAction(budget: number): Promise<ActionResult> {
  return run(
    () =>
      mutate((draft) => {
        if (budget < 10 || budget > 500) throw new Error("Bütçe 10 ile 500 arasında olmalı.");
        draft.config.budget = budget;
      }),
    "Bütçe güncellendi.",
  );
}

export interface ScoringPatch {
  played?: number;
  noShow?: number;
  win?: number;
  draw?: number;
  loss?: number;
  mvp?: number;
  captainMultiplier?: number;
  promoMultiplier?: number;
  promoDiscount?: number;
  promoCount?: number;
  goalGK?: number;
  goalDEF?: number;
  goalMID?: number;
  goalFWD?: number;
}

export async function updateScoringAction(patch: ScoringPatch): Promise<ActionResult> {
  return run(
    () =>
      mutate((draft) => {
        const s = draft.config.scoring;
        if (patch.played !== undefined) s.played = patch.played;
        if (patch.noShow !== undefined) s.noShow = patch.noShow;
        if (patch.win !== undefined) s.win = patch.win;
        if (patch.draw !== undefined) s.draw = patch.draw;
        if (patch.loss !== undefined) s.loss = patch.loss;
        if (patch.mvp !== undefined) s.mvp = patch.mvp;
        if (patch.captainMultiplier !== undefined) s.captainMultiplier = patch.captainMultiplier;
        if (patch.promoMultiplier !== undefined) s.promoMultiplier = patch.promoMultiplier;
        if (patch.promoDiscount !== undefined) {
          s.promoDiscount = Math.max(0, Math.min(0.9, patch.promoDiscount));
        }
        if (patch.promoCount !== undefined) s.promoCount = Math.max(0, patch.promoCount);
        if (patch.goalGK !== undefined) s.goal.GK = patch.goalGK;
        if (patch.goalDEF !== undefined) s.goal.DEF = patch.goalDEF;
        if (patch.goalMID !== undefined) s.goal.MID = patch.goalMID;
        if (patch.goalFWD !== undefined) s.goal.FWD = patch.goalFWD;
      }),
    "Puanlama ayarları güncellendi.",
  );
}

export async function renameSeasonAction(name: string): Promise<ActionResult> {
  return run(
    () =>
      mutate((draft) => {
        draft.seasonName = name.trim() || draft.seasonName;
      }),
    "Sezon adı güncellendi.",
  );
}

function slugify(value: string): string {
  const map: Record<string, string> = {
    ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i",
    ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
  };
  return value
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
