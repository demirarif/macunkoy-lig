import "server-only";
import {
  createGameweek,
  openGameweek,
  squadFor,
  type LeagueState,
} from "@/lib/db/state";
import { mutate, readState } from "@/lib/db/store";
import { nextPrice, type PlayerHistory } from "@/lib/domain/pricing";
import { autoPickSquad } from "@/lib/domain/squad";
import type { Gameweek, PlayerMatchStat } from "@/lib/domain/types";

/**
 * Haftalık akış:
 *
 *   open       Kadro kurulabilir. Salı 23:00'te kendiliğinden kapanır.
 *     ↓
 *   locked     Kadrolar kilitli. Kadro kurmayana geçen haftaki takımı yazıldı.
 *     ↓ admin o haftanın 22 kişisini iki takıma böler, kaptanları seçer
 *   teams      Kimin oynayacağı belli. Herkes kadrosunun kaçını tutturduğunu görür.
 *     ↓ maç oynanır, admin skoru ve reytingleri girer, "Tamamla" der
 *   completed  Puanlar kesinleşti, fiyatlar güncellendi. BİR DAHA DEĞİŞMEZ.
 *
 * "completed" bilerek tek yönlü: hafta kapandıktan sonra kimse puanları
 * değiştiremesin diye geri açma yolu yok.
 */

export class GameweekError extends Error {}

function requireGameweek(state: LeagueState, gameweekId: string): Gameweek {
  const gw = state.gameweeks.find((g) => g.id === gameweekId);
  if (!gw) throw new GameweekError("Hafta bulunamadı.");
  return gw;
}

function assertEditable(gw: Gameweek): void {
  if (gw.status === "completed") {
    throw new GameweekError(
      `${gw.number}. hafta tamamlandı olarak işaretlendi; artık değiştirilemez.`,
    );
  }
  if (gw.status === "holiday") {
    throw new GameweekError("Tatil haftasında veri girilemez.");
  }
}

/**
 * Kadro kurmayan menajerlere kadro yazar.
 *
 * Geçen haftaki kadroyu devretmeye çalışır; fiyatlar değiştiği veya kampanya
 * bittiği için bütçeye sığmıyorsa en pahalıdan başlayarak onarır. Hiç kadro
 * kurmamış menajere sıfırdan otomatik kadro kurar — böylece kimse unuttu diye
 * ligden kopmaz.
 */
function fillMissingSquads(state: LeagueState, gw: Gameweek): number {
  let filled = 0;
  for (const manager of state.managers) {
    if (squadFor(state, gw.id, manager.id)) continue;

    const previous = state.squads
      .filter((s) => s.managerId === manager.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

    const formationId = previous?.formationId ?? "denge";
    const picks = autoPickSquad(
      formationId,
      state.players,
      gw,
      state.config,
      previous?.picks ?? [],
    );

    state.squads.push({
      id: `sq-${gw.id}-${manager.id}`,
      gameweekId: gw.id,
      managerId: manager.id,
      formationId,
      picks,
      source: "rollover",
      updatedAt: new Date().toISOString(),
    });
    filled++;
  }
  return filled;
}

/**
 * Zamanı gelmiş haftayı kilitler.
 *
 * Cron'a bağımlı olmamak için her istekte tembel şekilde çağrılır: kilit
 * saatinden sonra siteye ilk giren kişi kilidi tetikler, kimse son dakika
 * kadro değiştiremez.
 */
export async function ensureTimeline(now = new Date()): Promise<void> {
  const state = await readState();
  const open = openGameweek(state);
  if (!open) return;
  if (new Date(open.lockAt).getTime() > now.getTime()) return;

  await mutate((draft) => {
    const gw = draft.gameweeks.find((g) => g.id === open.id);
    if (!gw || gw.status !== "open") return;
    if (new Date(gw.lockAt).getTime() > now.getTime()) return;
    gw.status = "locked";
    fillMissingSquads(draft, gw);
  });
}

/** Bir sonraki haftayı açar: kilit bir hafta sonraki Salı 23:00. */
function openNextGameweek(state: LeagueState, after: Gameweek): Gameweek {
  const existing = state.gameweeks.find((g) => g.number === after.number + 1);
  if (existing) return existing;

  const nextLock = new Date(new Date(after.lockAt).getTime() + 7 * 86_400_000);
  const next = createGameweek(after.number + 1, nextLock);
  state.gameweeks.push(next);
  return next;
}

export interface TeamsInput {
  teamAIds: string[];
  teamBIds: string[];
  /** Her takımdan en fazla bir kaptan. */
  captainIds: string[];
}

/**
 * O haftanın takımlarını kaydeder ve bir sonraki haftanın penceresini açar.
 *
 * İki iş bilerek tek adımda: gerçek hayatta kadrolar belli olduğu anda bir
 * sonraki hafta için seçim de başlıyor.
 */
export async function saveTeams(gameweekId: string, input: TeamsInput): Promise<Gameweek> {
  return mutate((draft) => {
    const gw = requireGameweek(draft, gameweekId);
    assertEditable(gw);

    const known = new Set(draft.players.map((p) => p.id));
    const calledUp = [...input.teamAIds, ...input.teamBIds];
    for (const id of calledUp) {
      if (!known.has(id)) throw new GameweekError(`Havuzda olmayan oyuncu: ${id}`);
    }
    if (new Set(calledUp).size !== calledUp.length) {
      throw new GameweekError("Bir oyuncu iki takımda birden olamaz.");
    }
    const inSquad = new Set(calledUp);
    for (const id of input.captainIds) {
      if (!inSquad.has(id)) {
        throw new GameweekError("Kaptanlar yalnızca sahaya çıkanlardan seçilebilir.");
      }
    }
    if (input.captainIds.length > draft.config.scoring.captainCount) {
      throw new GameweekError(
        `En fazla ${draft.config.scoring.captainCount} kaptan seçilebilir.`,
      );
    }

    gw.teamAIds = [...input.teamAIds];
    gw.teamBIds = [...input.teamBIds];
    gw.calledUpIds = calledUp;
    gw.captainIds = [...input.captainIds];
    if (gw.status === "open" || gw.status === "locked") gw.status = "teams";

    // Sahaya çıkmayanların istatistik satırlarını temizle; takım değiştiyse
    // eski satırlar ortada kalmasın.
    gw.stats = gw.stats.filter((s) => inSquad.has(s.playerId));

    openNextGameweek(draft, gw);
    return gw;
  });
}

export interface StatsInput {
  scoreA: number;
  scoreB: number;
  mvpPlayerId: string | null;
  stats: PlayerMatchStat[];
}

/** Skor, goller ve reytingler. Hafta tamamlanana kadar istediğin kadar düzeltebilirsin. */
export async function saveStats(gameweekId: string, input: StatsInput): Promise<Gameweek> {
  return mutate((draft) => {
    const gw = requireGameweek(draft, gameweekId);
    assertEditable(gw);
    if (gw.status !== "teams") {
      throw new GameweekError("Önce o haftanın takımlarını gir.");
    }

    gw.scoreA = Math.max(0, Math.round(input.scoreA));
    gw.scoreB = Math.max(0, Math.round(input.scoreB));
    gw.mvpPlayerId = input.mvpPlayerId;
    gw.stats = input.stats.map((s) => ({
      ...s,
      rating: Math.min(10, Math.max(0, s.rating)),
      goals: Math.max(0, Math.round(s.goals)),
    }));
    return gw;
  });
}

/** Bir oyuncunun tamamlanmış haftalardaki istatistik geçmişi, eskiden yeniye. */
function historyFor(state: LeagueState, playerId: string, uptoNumber: number): PlayerHistory {
  return state.gameweeks
    .filter((g) => g.number <= uptoNumber && g.status === "completed")
    .sort((a, b) => a.number - b.number)
    .map((g) => g.stats.find((s) => s.playerId === playerId) ?? null);
}

function applyPricing(state: LeagueState, gw: Gameweek): void {
  state.priceHistory = state.priceHistory.filter((e) => e.gameweekNumber !== gw.number);

  for (const player of state.players) {
    const history = historyFor(state, player.id, gw.number);
    const change = nextPrice(player.id, player.price, history, state.config.pricing);
    player.price = change.to;
    state.priceHistory.push({
      gameweekNumber: gw.number,
      playerId: player.id,
      price: change.to,
    });
  }
}

/**
 * Haftayı tamamlar: puanlar açıklanır, fiyatlar güncellenir ve hafta kilitlenir.
 * Bu işlem geri alınamaz.
 */
export async function completeGameweek(gameweekId: string): Promise<Gameweek> {
  return mutate((draft) => {
    const gw = requireGameweek(draft, gameweekId);
    assertEditable(gw);
    if (gw.status !== "teams") {
      throw new GameweekError("Önce takımları ve maç verisini gir.");
    }
    if (gw.scoreA === null || gw.scoreB === null) {
      throw new GameweekError("Maç skorunu girmeden haftayı tamamlayamazsın.");
    }
    if (gw.stats.length === 0) {
      throw new GameweekError("Reytingler girilmeden hafta tamamlanamaz.");
    }

    gw.status = "completed";
    gw.completedAt = new Date().toISOString();
    // Fiyat güncellemesi statü değiştikten sonra: historyFor artık bu haftayı da sayar.
    applyPricing(draft, gw);
    return gw;
  });
}

/** Bu hafta maç yok. Kimse puan almaz, sonraki hafta açılır. */
export async function markHoliday(gameweekId: string): Promise<Gameweek> {
  return mutate((draft) => {
    const gw = requireGameweek(draft, gameweekId);
    assertEditable(gw);
    gw.status = "holiday";
    gw.calledUpIds = [];
    gw.teamAIds = [];
    gw.teamBIds = [];
    gw.captainIds = [];
    gw.stats = [];
    gw.scoreA = null;
    gw.scoreB = null;
    gw.mvpPlayerId = null;
    // Tatil haftası için kurulmuş kadrolar geçersiz — silinsin ki puan yazılmasın.
    draft.squads = draft.squads.filter((s) => s.gameweekId !== gw.id);
    openNextGameweek(draft, gw);
    return gw;
  });
}

/** Yanlışlıkla tatil işaretlendiyse geri alır. */
export async function unmarkHoliday(gameweekId: string): Promise<Gameweek> {
  return mutate((draft) => {
    const gw = requireGameweek(draft, gameweekId);
    if (gw.status !== "holiday") throw new GameweekError("Bu hafta tatil değil.");
    const laterStarted = draft.gameweeks.some(
      (g) => g.number > gw.number && g.status !== "open",
    );
    if (laterStarted) {
      throw new GameweekError("Sonraki hafta başladığı için bu tatil geri alınamaz.");
    }
    draft.gameweeks = draft.gameweeks.filter((g) => g.number <= gw.number);
    gw.status = new Date(gw.lockAt).getTime() > Date.now() ? "open" : "locked";
    return gw;
  });
}

export async function setPromos(gameweekId: string, playerIds: string[]): Promise<Gameweek> {
  return mutate((draft) => {
    const gw = requireGameweek(draft, gameweekId);
    assertEditable(gw);
    const limit = draft.config.scoring.promoCount;
    if (playerIds.length > limit) {
      throw new GameweekError(`En fazla ${limit} kampanyalı oyuncu seçilebilir.`);
    }
    const known = new Set(draft.players.map((p) => p.id));
    gw.promoPlayerIds = playerIds.filter((id) => known.has(id));
    return gw;
  });
}
