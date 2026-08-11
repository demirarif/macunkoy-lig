import { playerMap, squadsForGameweek, type LeagueState } from "@/lib/db/state";
import { round1, scoreSquad } from "@/lib/domain/scoring";
import type { Gameweek, SquadScore, StandingsRow } from "@/lib/domain/types";

/** Puanı kesinleşmiş haftalar, eskiden yeniye. */
export function completedGameweeks(state: LeagueState): Gameweek[] {
  return state.gameweeks
    .filter((gw) => gw.status === "completed")
    .sort((a, b) => a.number - b.number);
}

export interface GameweekResult {
  managerId: string;
  teamName: string | null;
  playerName: string;
  score: SquadScore;
}

/** Bir haftanın tüm menajer sonuçları, yüksekten alçağa. */
export function gameweekResults(state: LeagueState, gw: Gameweek): GameweekResult[] {
  const players = playerMap(state);
  return squadsForGameweek(state, gw.id)
    .map((squad) => {
      const manager = state.managers.find((m) => m.id === squad.managerId);
      return {
        managerId: squad.managerId,
        teamName: manager?.teamName ?? null,
        playerName: players.get(manager?.playerId ?? "")?.name ?? "—",
        score: scoreSquad(squad, gw, state.config.scoring),
      };
    })
    .sort((a, b) => b.score.total - a.score.total);
}

interface Accumulator {
  total: number;
  weeks: number;
  best: number;
  last: number | null;
}

function accumulate(state: LeagueState, upto: number): Map<string, Accumulator> {
  const acc = new Map<string, Accumulator>();
  for (const gw of completedGameweeks(state)) {
    if (gw.number > upto) continue;
    for (const result of gameweekResults(state, gw)) {
      const entry = acc.get(result.managerId) ?? {
        total: 0,
        weeks: 0,
        best: -Infinity,
        last: null,
      };
      entry.total = round1(entry.total + result.score.total);
      entry.weeks += 1;
      entry.best = Math.max(entry.best, result.score.total);
      entry.last = result.score.total;
      acc.set(result.managerId, entry);
    }
  }
  return acc;
}

function rankRows(
  state: LeagueState,
  acc: Map<string, Accumulator>,
): Omit<StandingsRow, "previousRank">[] {
  const players = playerMap(state);
  return state.managers
    .map((manager) => {
      const entry = acc.get(manager.id);
      const playerName = players.get(manager.playerId)?.name ?? manager.playerId;
      return {
        managerId: manager.id,
        teamName: manager.teamName,
        playerName,
        totalPoints: entry?.total ?? 0,
        weeksPlayed: entry?.weeks ?? 0,
        bestWeek: entry && entry.best > -Infinity ? entry.best : 0,
        lastWeekPoints: entry?.last ?? null,
        rank: 0,
      };
    })
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints || a.playerName.localeCompare(b.playerName, "tr"),
    )
    .map((row, index, all) => {
      // Eşit puanlılar aynı sırayı paylaşır.
      const tiedWithPrevious = index > 0 && all[index - 1].totalPoints === row.totalPoints;
      row.rank = tiedWithPrevious ? all[index - 1].rank : index + 1;
      return row;
    });
}

export function computeStandings(state: LeagueState): StandingsRow[] {
  const weeks = completedGameweeks(state);
  const latest = weeks[weeks.length - 1]?.number ?? 0;
  const current = rankRows(state, accumulate(state, latest));
  const previous = new Map(
    rankRows(state, accumulate(state, Math.max(0, latest - 1))).map((r) => [
      r.managerId,
      r.rank,
    ]),
  );
  return current.map((row) => ({
    ...row,
    previousRank: weeks.length > 1 ? (previous.get(row.managerId) ?? null) : null,
  }));
}

export interface PlayerSeasonStats {
  playerId: string;
  /** Kaç maçta sahaya çıktı. */
  appearances: number;
  /** Kaç hafta kadroya alınmadı ya da gelmedi (tatil haftaları sayılmaz). */
  missed: number;
  goals: number;
  averageRating: number | null;
  mvpCount: number;
  captainCount: number;
  keeperWeeks: number;
  /** Bu oyuncunun menajerlere kazandırdığı toplam ham puan (çarpansız). */
  fantasyPoints: number;
  /** Haftalık ortalama getiri — "kim kaç puan getiriyor" tablosunun sıralama ölçütü. */
  pointsPerWeek: number;
  /** Kaç kez bir menajerin kadrosunda yer aldı. */
  timesSelected: number;
  priceHistory: Array<{ gameweek: number; price: number }>;
  ratingHistory: Array<{ gameweek: number; rating: number | null }>;
}

export function playerSeasonStats(state: LeagueState, playerId: string): PlayerSeasonStats {
  const weeks = completedGameweeks(state);
  let appearances = 0;
  let missed = 0;
  let goals = 0;
  let ratingSum = 0;
  let mvpCount = 0;
  let captainCount = 0;
  let keeperWeeks = 0;
  let fantasyPoints = 0;
  let timesSelected = 0;
  const ratingHistory: PlayerSeasonStats["ratingHistory"] = [];

  for (const gw of weeks) {
    const stat = gw.stats.find((s) => s.playerId === playerId);
    if (stat?.played) {
      appearances++;
      goals += stat.goals;
      ratingSum += stat.rating;
      if (stat.keptGoal) keeperWeeks++;
    } else {
      missed++;
    }
    if (gw.mvpPlayerId === playerId) mvpCount++;
    if (gw.captainIds.includes(playerId)) captainCount++;
    ratingHistory.push({ gameweek: gw.number, rating: stat?.played ? stat.rating : null });

    for (const result of gameweekResults(state, gw)) {
      const line = result.score.players.find((p) => p.playerId === playerId);
      if (!line) continue;
      timesSelected++;
      fantasyPoints = round1(fantasyPoints + line.subtotal);
    }
  }

  const priceHistory = state.priceHistory
    .filter((e) => e.playerId === playerId)
    .sort((a, b) => a.gameweekNumber - b.gameweekNumber)
    .map((e) => ({ gameweek: e.gameweekNumber, price: e.price }));

  return {
    playerId,
    appearances,
    missed,
    goals,
    averageRating: appearances > 0 ? round1(ratingSum / appearances) : null,
    mvpCount,
    captainCount,
    keeperWeeks,
    fantasyPoints,
    pointsPerWeek: timesSelected > 0 ? round1(fantasyPoints / timesSelected) : 0,
    timesSelected,
    priceHistory,
    ratingHistory,
  };
}

/**
 * "Kim kaç puan getiriyor" tablosu.
 *
 * Bir oyuncunun her hafta ürettiği ham puan (kaptan/kampanya çarpanları hariç)
 * — yani onu kadrosuna koyan bir menajerin ondan aldığı puan.
 */
export interface PlayerYield {
  playerId: string;
  name: string;
  price: number;
  slots: string[];
  /** Bu oyuncuyu kadroya koyan bir menajerin haftalık aldığı ortalama puan. */
  perWeek: number;
  /** Sezon boyu toplam üretim. */
  total: number;
  appearances: number;
  missed: number;
  goals: number;
  averageRating: number | null;
  /** Fiyat başına getiri — ucuz ve verimli oyuncuları bulmak için. */
  valueIndex: number;
  ownership: number;
}

export function playerYields(state: LeagueState): PlayerYield[] {
  const weeks = completedGameweeks(state);
  const latest = weeks[weeks.length - 1];
  const ownership = latest ? ownershipFor(state, latest.id) : new Map<string, number>();

  // Bir oyuncunun haftalık ham puanı, kimin kadrosunda olduğundan bağımsızdır.
  // O yüzden her hafta için bir kez hesaplayıp kadro sayısına bölmüyoruz;
  // doğrudan "o hafta bu oyuncu kaç puan üretti" değerini topluyoruz.
  return state.players
    .filter((p) => p.active)
    .map((player) => {
      let total = 0;
      let counted = 0;
      let appearances = 0;
      let missed = 0;
      let goals = 0;
      let ratingSum = 0;

      for (const gw of weeks) {
        const stat = gw.stats.find((s) => s.playerId === player.id);
        // Sahaya çıkmadığı haftalar da sayılır: o hafta onu seçen −5 yiyor.
        const inSquadPool = gw.calledUpIds.includes(player.id);
        if (!inSquadPool && !stat) {
          total += state.config.scoring.noShow;
          missed++;
          counted++;
          continue;
        }
        if (stat?.played) {
          appearances++;
          goals += stat.goals;
          ratingSum += stat.rating;
        } else {
          missed++;
        }
        total += rawWeekPoints(state, gw, player.id);
        counted++;
      }

      const perWeek = counted > 0 ? round1(total / counted) : 0;
      return {
        playerId: player.id,
        name: player.name,
        price: player.price,
        slots: player.slots,
        perWeek,
        total: round1(total),
        appearances,
        missed,
        goals,
        averageRating: appearances > 0 ? round1(ratingSum / appearances) : null,
        valueIndex: player.price > 0 ? round1((perWeek / player.price) * 10) : 0,
        ownership: ownership.get(player.id) ?? 0,
      };
    })
    .sort((a, b) => b.perWeek - a.perWeek);
}

/**
 * Bir oyuncunun bir haftada ürettiği ham puan.
 * Kadrolardan bağımsız: oyuncunun kendi mevkisinde puanlandığı varsayılır.
 */
export function rawWeekPoints(state: LeagueState, gw: Gameweek, playerId: string): number {
  const squad = {
    id: "x",
    gameweekId: gw.id,
    managerId: "x",
    formationId: "denge",
    source: "manual" as const,
    updatedAt: "",
    picks: [
      {
        playerId,
        slot: naturalSlot(state, gw, playerId),
      },
    ],
  };
  const scored = scoreSquad(squad, gw, state.config.scoring);
  return scored.players[0]?.subtotal ?? 0;
}

/** Oyuncunun o haftaki gerçek rolüne uyan slot — böylece slot uyuşmazlığı cezası girmez. */
function naturalSlot(state: LeagueState, gw: Gameweek, playerId: string) {
  const stat = gw.stats.find((s) => s.playerId === playerId);
  if (stat?.keptGoal) return "GK" as const;
  const player = state.players.find((p) => p.id === playerId);
  const outfield = player?.slots.filter((s) => s !== "GK") ?? [];
  return (outfield[0] ?? "DEF") as "DEF" | "MID" | "FWD";
}

/** Bir haftada oyuncuların kaç menajer tarafından seçildiği (yüzde). */
export function ownershipFor(state: LeagueState, gameweekId: string): Map<string, number> {
  const squads = squadsForGameweek(state, gameweekId);
  const counts = new Map<string, number>();
  for (const squad of squads) {
    for (const pick of squad.picks) {
      counts.set(pick.playerId, (counts.get(pick.playerId) ?? 0) + 1);
    }
  }
  const total = squads.length || 1;
  return new Map([...counts].map(([id, n]) => [id, Math.round((n / total) * 100)]));
}
