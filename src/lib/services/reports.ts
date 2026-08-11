import { playerMap, squadsForGameweek, type LeagueState } from "@/lib/db/state";
import { round1 } from "@/lib/domain/scoring";
import type { Gameweek, Slot } from "@/lib/domain/types";
import { rawWeekPoints } from "./standings";

/**
 * Maç raporları.
 *
 * İki görünüm üretir:
 *  - haftalık rapor: o hafta sahaya çıkan herkesin tek tek verisi
 *  - sezon tablosu: oyuncu × hafta matrisi, her hücrede o haftanın reytingi
 *
 * İkisi de admin panelinde ligin tamamını tek bakışta görmek için.
 */

export type MatchResult = "W" | "D" | "L";

export interface WeekPlayerRow {
  playerId: string;
  name: string;
  slots: Slot[];
  team: "A" | "B" | null;
  played: boolean;
  keptGoal: boolean;
  goals: number;
  rating: number | null;
  isMvp: boolean;
  isCaptain: boolean;
  isPromo: boolean;
  result: MatchResult | null;
  /** Bu oyuncunun o hafta ürettiği ham fantazi puanı. */
  points: number;
  /** Kaç menajerin kadrosundaydı. */
  pickedBy: number;
  pickedPercent: number;
}

export interface WeekReport {
  gameweek: Gameweek;
  teamA: WeekPlayerRow[];
  teamB: WeekPlayerRow[];
  /** Havuzda olup o hafta sahaya çıkmayanlar — onları seçenler ceza yedi. */
  outside: WeekPlayerRow[];
  squadCount: number;
  totalGoals: number;
}

function resultFor(gw: Gameweek, team: "A" | "B"): MatchResult | null {
  if (gw.scoreA === null || gw.scoreB === null) return null;
  const own = team === "A" ? gw.scoreA : gw.scoreB;
  const other = team === "A" ? gw.scoreB : gw.scoreA;
  if (own > other) return "W";
  if (own < other) return "L";
  return "D";
}

export function weekReport(state: LeagueState, gw: Gameweek): WeekReport {
  const players = playerMap(state);
  const squads = squadsForGameweek(state, gw.id);
  const pickCounts = new Map<string, number>();
  for (const squad of squads) {
    for (const pick of squad.picks) {
      pickCounts.set(pick.playerId, (pickCounts.get(pick.playerId) ?? 0) + 1);
    }
  }
  const squadCount = squads.length || 1;

  const build = (playerId: string, team: "A" | "B" | null): WeekPlayerRow | null => {
    const player = players.get(playerId);
    if (!player) return null;
    const stat = gw.stats.find((s) => s.playerId === playerId);
    const picked = pickCounts.get(playerId) ?? 0;
    return {
      playerId,
      name: player.name,
      slots: player.slots,
      team,
      played: stat?.played ?? false,
      keptGoal: stat?.keptGoal ?? false,
      goals: stat?.goals ?? 0,
      rating: stat?.played ? stat.rating : null,
      isMvp: gw.mvpPlayerId === playerId,
      isCaptain: gw.captainIds.includes(playerId),
      isPromo: gw.promoPlayerIds.includes(playerId),
      result: team ? resultFor(gw, team) : null,
      points: team
        ? round1(rawWeekPoints(state, gw, playerId))
        : state.config.scoring.noShow,
      pickedBy: picked,
      pickedPercent: Math.round((picked / squadCount) * 100),
    };
  };

  const byRating = (a: WeekPlayerRow, b: WeekPlayerRow) =>
    (b.rating ?? -1) - (a.rating ?? -1);

  const onPitch = new Set(gw.calledUpIds);
  const teamA = gw.teamAIds.map((id) => build(id, "A")).filter(Boolean) as WeekPlayerRow[];
  const teamB = gw.teamBIds.map((id) => build(id, "B")).filter(Boolean) as WeekPlayerRow[];
  const outside = state.players
    .filter((p) => p.active && !onPitch.has(p.id))
    .map((p) => build(p.id, null))
    .filter(Boolean) as WeekPlayerRow[];

  return {
    gameweek: gw,
    teamA: teamA.sort(byRating),
    teamB: teamB.sort(byRating),
    outside: outside.sort((a, b) => b.pickedBy - a.pickedBy),
    squadCount: squads.length,
    totalGoals: gw.stats.reduce((sum, s) => sum + s.goals, 0),
  };
}

export interface MatrixCell {
  gameweek: number;
  /** Sahaya çıktıysa reytingi, çıkmadıysa null. */
  rating: number | null;
  goals: number;
  /** O hafta sahaya çıkanlar arasında mıydı. */
  onPitch: boolean;
  keptGoal: boolean;
  isMvp: boolean;
  points: number;
}

export interface MatrixRow {
  playerId: string;
  name: string;
  slots: Slot[];
  price: number;
  cells: MatrixCell[];
  appearances: number;
  goals: number;
  averageRating: number | null;
  totalPoints: number;
  mvpCount: number;
}

export interface SeasonMatrix {
  weeks: number[];
  rows: MatrixRow[];
}

/** Oyuncu × hafta tablosu — sezonun tamamı tek ekranda. */
export function seasonMatrix(state: LeagueState): SeasonMatrix {
  const weeks = state.gameweeks
    .filter((g) => g.status === "completed" || g.status === "teams")
    .sort((a, b) => a.number - b.number);

  const rows: MatrixRow[] = state.players
    .filter((p) => p.active)
    .map((player) => {
      let appearances = 0;
      let goals = 0;
      let ratingSum = 0;
      let totalPoints = 0;
      let mvpCount = 0;

      const cells = weeks.map((gw) => {
        const stat = gw.stats.find((s) => s.playerId === player.id);
        const onPitch = gw.calledUpIds.includes(player.id);
        const scored = gw.status === "completed";
        const points = scored
          ? onPitch
            ? round1(rawWeekPoints(state, gw, player.id))
            : state.config.scoring.noShow
          : 0;

        if (stat?.played) {
          appearances++;
          goals += stat.goals;
          ratingSum += stat.rating;
        }
        if (gw.mvpPlayerId === player.id) mvpCount++;
        if (scored) totalPoints = round1(totalPoints + points);

        return {
          gameweek: gw.number,
          rating: stat?.played ? stat.rating : null,
          goals: stat?.goals ?? 0,
          onPitch,
          keptGoal: stat?.keptGoal ?? false,
          isMvp: gw.mvpPlayerId === player.id,
          points,
        };
      });

      return {
        playerId: player.id,
        name: player.name,
        slots: player.slots,
        price: player.price,
        cells,
        appearances,
        goals,
        averageRating: appearances > 0 ? round1(ratingSum / appearances) : null,
        totalPoints,
        mvpCount,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return { weeks: weeks.map((g) => g.number), rows };
}
