import "server-only";
import { redirect } from "next/navigation";
import { readState } from "@/lib/db/store";
import type { LeagueState } from "@/lib/db/state";
import type { Manager, Player } from "@/lib/domain/types";
import { getManagerId, isAdmin } from "./session";

export interface ManagerContext {
  state: LeagueState;
  manager: Manager;
  player: Player;
}

export async function currentManager(): Promise<ManagerContext | null> {
  const id = await getManagerId();
  if (!id) return null;
  const state = await readState();
  const manager = state.managers.find((m) => m.id === id);
  if (!manager) return null;
  const player = state.players.find((p) => p.id === manager.playerId);
  if (!player) return null;
  return { state, manager, player };
}

/** Menajer oturumu şart olan sayfalar için. */
export async function requireManager(): Promise<ManagerContext> {
  const context = await currentManager();
  if (!context) redirect("/giris");
  return context;
}

/** Admin oturumu şart olan sayfalar için. Menajer oturumu buraya yetmez. */
export async function requireAdmin(): Promise<LeagueState> {
  if (!(await isAdmin())) redirect("/admin/giris");
  return readState();
}
