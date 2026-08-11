import type { RatingBand, ScoringConfig } from "./rules";
import type {
  Gameweek,
  Player,
  PlayerMatchStat,
  PlayerScoreBreakdown,
  ScoreLine,
  Slot,
  Squad,
  SquadPick,
  SquadScore,
} from "./types";

/**
 * Puanlama motoru.
 *
 * Tek kural cümlesi olarak özeti:
 *   Bir oyuncu ankete yetişemediyse sabit ceza yer. Yetiştiyse oynama puanı,
 *   gerçekte oynadığı role ait reyting puanı ve maç sonucu puanını alır.
 *   Gol puanını ise YALNIZCA menajerin koyduğu slot gerçek rolüyle uyuşuyorsa alır.
 *   En sonda kaptan ve kampanya çarpanları uygulanır.
 */

function ratingPoints(rating: number, bands: RatingBand[]): number {
  for (const band of bands) {
    if (rating >= band.min) return band.points;
  }
  return bands[bands.length - 1]?.points ?? 0;
}

/** Bir slot ile oyuncunun o haftaki gerçek rolü uyuşuyor mu. */
export function isSlotMismatch(slot: Slot, keptGoal: boolean): boolean {
  return (slot === "GK") !== keptGoal;
}

function resultLine(
  stat: PlayerMatchStat,
  gw: Gameweek,
  config: ScoringConfig,
): ScoreLine | null {
  if (gw.scoreA === null || gw.scoreB === null) return null;
  const own = stat.team === "A" ? gw.scoreA : gw.scoreB;
  const other = stat.team === "A" ? gw.scoreB : gw.scoreA;
  if (own > other) return { label: "Galibiyet", points: config.win };
  if (own < other) return { label: "Mağlubiyet", points: config.loss };
  return { label: "Beraberlik", points: config.draw };
}

export function scorePick(
  pick: SquadPick,
  gw: Gameweek,
  config: ScoringConfig,
): PlayerScoreBreakdown {
  const stat = gw.stats.find((s) => s.playerId === pick.playerId);
  const isCaptain = gw.captainIds.includes(pick.playerId);
  const isPromo = gw.promoPlayerIds.includes(pick.playerId);
  const captainMultiplier = isCaptain ? config.captainMultiplier : 1;
  const promoMultiplier = isPromo ? config.promoMultiplier : 1;

  // Ankete yetişemedi ya da gelmedi. Kampanyalı bir oyuncuyu kaçırmak,
  // çarpan negatife de uygulandığı için daha pahalıya patlar.
  if (!stat || !stat.played) {
    const lines: ScoreLine[] = [
      { label: "Ankete yetişemedi", points: config.noShow },
    ];
    const subtotal = config.noShow;
    return {
      playerId: pick.playerId,
      slot: pick.slot,
      lines,
      subtotal,
      captainMultiplier,
      promoMultiplier,
      total: round1(subtotal * captainMultiplier * promoMultiplier),
      slotMismatch: false,
      didNotPlay: true,
    };
  }

  const mismatch = isSlotMismatch(pick.slot, stat.keptGoal);
  const lines: ScoreLine[] = [{ label: "Oynadı", points: config.played }];

  // Reyting her zaman oyuncunun GERÇEK rolünün tablosundan okunur.
  // Kaleci tablosu daha bağışlayıcıdır çünkü halısahada maçlar bol gollü geçer.
  const bands = stat.keptGoal
    ? config.keeperRatingBands
    : config.outfieldRatingBands;
  const rp = ratingPoints(stat.rating, bands);
  if (rp !== 0) {
    lines.push({ label: `Reyting ${stat.rating.toFixed(1)}`, points: rp });
  }

  // Gol puanı slota bağlıdır ve slot yanlışsa tamamen yanar.
  // Barkuz'u forvete koyup o hafta kaleye geçmesi tam olarak bu durumdur.
  if (stat.goals > 0) {
    if (mismatch) {
      lines.push({
        label: `${stat.goals} gol — slot uyuşmadı, sayılmadı`,
        points: 0,
      });
    } else {
      const per = config.goal[stat.keptGoal ? "GK" : pick.slot];
      lines.push({ label: `${stat.goals} gol`, points: per * stat.goals });
    }
  }

  const result = resultLine(stat, gw, config);
  if (result) lines.push(result);

  if (gw.mvpPlayerId === pick.playerId) {
    lines.push({ label: "Maçın adamı", points: config.mvp });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.points, 0);
  return {
    playerId: pick.playerId,
    slot: pick.slot,
    lines,
    subtotal,
    captainMultiplier,
    promoMultiplier,
    total: round1(subtotal * captainMultiplier * promoMultiplier),
    slotMismatch: mismatch,
    didNotPlay: false,
  };
}

export function scoreSquad(
  squad: Squad,
  gw: Gameweek,
  config: ScoringConfig,
): SquadScore {
  const players = squad.picks.map((pick) => scorePick(pick, gw, config));
  return {
    squadId: squad.id,
    managerId: squad.managerId,
    gameweekId: gw.id,
    players,
    total: round1(players.reduce((sum, p) => sum + p.total, 0)),
  };
}

/**
 * Bir oyuncunun o haftaki geçerli fiyatı.
 * Kampanyalı oyuncular indirimli görünür — kadro maliyeti bu fiyat üzerinden hesaplanır.
 */
export function effectivePrice(
  player: Player,
  gw: Pick<Gameweek, "promoPlayerIds">,
  config: ScoringConfig,
): number {
  if (!gw.promoPlayerIds.includes(player.id)) return player.price;
  return round1(player.price * (1 - config.promoDiscount));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
