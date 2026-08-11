import { SEED_PLAYERS } from "@/lib/domain/players.seed";
import { DEFAULT_CONFIG, type LeagueConfig } from "@/lib/domain/rules";
import type { Gameweek, Manager, Player, Squad } from "@/lib/domain/types";
import { nextTuesdayAt, LOCK_HOUR_TR, scheduleFor } from "@/lib/time";

/** Bir oyuncunun bir haftadaki fiyatı — grafik ve "fiyat değişti" rozetleri için. */
export interface PriceHistoryEntry {
  gameweekNumber: number;
  playerId: string;
  price: number;
}

export interface AdminAccount {
  username: string;
  passwordHash: string;
}

/**
 * Ligin tüm durumu tek bir belgede.
 *
 * 40 kişilik bir grup için bu fazlasıyla yeterli ve okuması çok basit.
 * Supabase'e geçince aynı alanlar ayrı tablolara açılacak (bkz. supabase/schema.sql).
 */
export interface LeagueState {
  version: 1;
  seasonName: string;
  config: LeagueConfig;
  players: Player[];
  managers: Manager[];
  gameweeks: Gameweek[];
  squads: Squad[];
  priceHistory: PriceHistoryEntry[];
  admin: AdminAccount | null;
}

export function createGameweek(number: number, lockAt: Date): Gameweek {
  const { lockAt: lock, matchAt } = scheduleFor(lockAt);
  return {
    id: `gw-${number}`,
    number,
    status: "open",
    lockAt: lock,
    matchAt,
    promoPlayerIds: [],
    calledUpIds: [],
    teamAIds: [],
    teamBIds: [],
    captainIds: [],
    scoreA: null,
    scoreB: null,
    mvpPlayerId: null,
    stats: [],
    completedAt: null,
  };
}

export function initialState(now = new Date()): LeagueState {
  const firstLock = nextTuesdayAt(now, LOCK_HOUR_TR);
  return {
    version: 1,
    seasonName: "Sezon 1",
    config: structuredClone(DEFAULT_CONFIG),
    players: structuredClone(SEED_PLAYERS),
    managers: [],
    gameweeks: [createGameweek(1, firstLock)],
    squads: [],
    priceHistory: SEED_PLAYERS.map((p) => ({
      gameweekNumber: 0,
      playerId: p.id,
      price: p.price,
    })),
    admin: null,
  };
}

/* ------------------------------------------------------------------ */
/* Okuma yardımcıları — her yerde tekrar yazmamak için                  */
/* ------------------------------------------------------------------ */

export function playerMap(state: LeagueState): Map<string, Player> {
  return new Map(state.players.map((p) => [p.id, p]));
}

export function managerByPlayerId(state: LeagueState, playerId: string): Manager | undefined {
  return state.managers.find((m) => m.playerId === playerId);
}

/** Menajerlerin kadro kurabildiği hafta. Yoksa (hepsi kapandıysa) undefined. */
export function openGameweek(state: LeagueState): Gameweek | undefined {
  return state.gameweeks.find((gw) => gw.status === "open");
}

/** Sezonun en yüksek numaralı haftası — ana ekran bunu merkez alır. */
export function currentGameweek(state: LeagueState): Gameweek {
  return state.gameweeks.reduce((a, b) => (b.number > a.number ? b : a));
}

/** Puanları kesinleşmiş en son hafta. */
export function lastCompletedGameweek(state: LeagueState): Gameweek | undefined {
  return state.gameweeks
    .filter((gw) => gw.status === "completed")
    .sort((a, b) => b.number - a.number)[0];
}

/** Admin'in üzerinde çalıştığı hafta: takımları/skoru bekleyen ilk hafta. */
export function activeAdminGameweek(state: LeagueState): Gameweek | undefined {
  const byNumber = [...state.gameweeks].sort((a, b) => a.number - b.number);
  return (
    byNumber.find((g) => g.status === "teams") ??
    byNumber.find((g) => g.status === "locked") ??
    byNumber.find((g) => g.status === "open")
  );
}

export function squadFor(
  state: LeagueState,
  gameweekId: string,
  managerId: string,
): Squad | undefined {
  return state.squads.find((s) => s.gameweekId === gameweekId && s.managerId === managerId);
}

export function squadsForGameweek(state: LeagueState, gameweekId: string): Squad[] {
  return state.squads.filter((s) => s.gameweekId === gameweekId);
}
