import { getFormation, SLOT_ORDER, SQUAD_SIZE, type LeagueConfig } from "./rules";
import { effectivePrice, round1 } from "./scoring";
import { SLOT_LABEL_LONG, type Gameweek, type Player, type Slot, type SquadPick } from "./types";

export interface SquadValidation {
  ok: boolean;
  cost: number;
  remaining: number;
  errors: string[];
}

type PromoContext = Pick<Gameweek, "promoPlayerIds">;

export function squadCost(
  picks: SquadPick[],
  players: Map<string, Player>,
  gw: PromoContext,
  config: LeagueConfig,
): number {
  return round1(
    picks.reduce((sum, pick) => {
      const player = players.get(pick.playerId);
      if (!player) return sum;
      return sum + effectivePrice(player, gw, config.scoring);
    }, 0),
  );
}

export function validateSquad(
  formationId: string,
  picks: SquadPick[],
  players: Map<string, Player>,
  gw: PromoContext,
  config: LeagueConfig,
): SquadValidation {
  const errors: string[] = [];
  const cost = squadCost(picks, players, gw, config);

  let formationCounts: Record<Slot, number> | null = null;
  try {
    formationCounts = getFormation(formationId).counts;
  } catch {
    errors.push("Geçersiz diziliş seçildi.");
  }

  if (picks.length !== SQUAD_SIZE) {
    errors.push(`Kadroda ${SQUAD_SIZE} oyuncu olmalı, ${picks.length} tane var.`);
  }

  const seen = new Set<string>();
  for (const pick of picks) {
    if (seen.has(pick.playerId)) {
      const name = players.get(pick.playerId)?.name ?? pick.playerId;
      errors.push(`${name} kadroda iki kez var.`);
    }
    seen.add(pick.playerId);

    const player = players.get(pick.playerId);
    if (!player) {
      errors.push(`Havuzda olmayan bir oyuncu seçildi: ${pick.playerId}`);
      continue;
    }
    if (!player.active) {
      errors.push(`${player.name} bu sezon havuzda değil.`);
    }
    if (!player.slots.includes(pick.slot)) {
      errors.push(`${player.name} ${SLOT_LABEL_LONG[pick.slot].toLowerCase()} oynayamaz.`);
    }
  }

  if (formationCounts) {
    for (const slot of SLOT_ORDER) {
      const need = formationCounts[slot];
      const have = picks.filter((p) => p.slot === slot).length;
      if (have !== need) {
        errors.push(`${SLOT_LABEL_LONG[slot]}: ${need} olmalı, ${have} var.`);
      }
    }
  }

  if (cost > config.budget) {
    errors.push(`Bütçe aşıldı: ${cost.toFixed(1)} / ${config.budget} birim.`);
  }

  return {
    ok: errors.length === 0,
    cost,
    remaining: round1(config.budget - cost),
    errors,
  };
}

/**
 * Kadro kurmayan menajerler ve bütçeye sığmaz hâle gelen devreden kadrolar için
 * geçerli bir kadro üretir.
 *
 * `keep` verilirse önce o seçimler korunmaya çalışılır (devreden kadro onarımı),
 * kalan slotlar doldurulur. Sonuç her zaman bütçeye sığar; sığdıramazsa
 * korunacak seçimleri en pahalıdan başlayarak feda eder.
 */
export function autoPickSquad(
  formationId: string,
  allPlayers: Player[],
  gw: PromoContext,
  config: LeagueConfig,
  keep: SquadPick[] = [],
): SquadPick[] {
  const counts = getFormation(formationId).counts;
  const priceOf = (p: Player) => effectivePrice(p, gw, config.scoring);
  const pool = allPlayers.filter((p) => p.active);
  const byId = new Map(pool.map((p) => [p.id, p]));

  // 1) Korunacak seçimlerden geçerli olanları al, pahalıdan ucuza feda etmeye hazır tut.
  const kept: SquadPick[] = [];
  const slotFilled: Record<Slot, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const used = new Set<string>();
  const sortedKeep = [...keep].sort(
    (a, b) => (byId.get(a.playerId)?.price ?? 0) - (byId.get(b.playerId)?.price ?? 0),
  );
  for (const pick of sortedKeep) {
    const player = byId.get(pick.playerId);
    if (!player) continue;
    if (used.has(pick.playerId)) continue;
    if (!player.slots.includes(pick.slot)) continue;
    if (slotFilled[pick.slot] >= counts[pick.slot]) continue;
    kept.push(pick);
    slotFilled[pick.slot]++;
    used.add(pick.playerId);
  }

  // 2) Boş slotları en ucuz uygun oyuncuyla doldur — önce fizibilite.
  const picks = [...kept];
  for (const slot of SLOT_ORDER) {
    while (slotFilled[slot] < counts[slot]) {
      const candidate = pool
        .filter((p) => !used.has(p.id) && p.slots.includes(slot))
        .sort((a, b) => priceOf(a) - priceOf(b))[0];
      if (!candidate) break; // Havuz yetmiyor; doğrulama zaten hata verecek.
      picks.push({ playerId: candidate.id, slot });
      used.add(candidate.id);
      slotFilled[slot]++;
    }
  }

  // 3) Bütçeyi aşıyorsak en pahalıyı en ucuz uygun alternatifle değiştir.
  const cost = () => picks.reduce((s, p) => s + priceOf(byId.get(p.playerId)!), 0);
  let guard = 0;
  while (cost() > config.budget && guard++ < SQUAD_SIZE * 4) {
    const idx = picks
      .map((p, i) => ({ i, price: priceOf(byId.get(p.playerId)!) }))
      .sort((a, b) => b.price - a.price)[0]?.i;
    if (idx === undefined) break;
    const slot = picks[idx].slot;
    const cheapest = pool
      .filter((p) => !used.has(p.id) && p.slots.includes(slot))
      .sort((a, b) => priceOf(a) - priceOf(b))[0];
    if (!cheapest || priceOf(cheapest) >= priceOf(byId.get(picks[idx].playerId)!)) break;
    used.delete(picks[idx].playerId);
    used.add(cheapest.id);
    picks[idx] = { playerId: cheapest.id, slot };
  }

  // 4) Kalan bütçeyi en büyük tek yükseltmeyle harca, doyana kadar tekrarla.
  guard = 0;
  for (;;) {
    if (guard++ > SQUAD_SIZE * 6) break;
    const budgetLeft = config.budget - cost();
    let best: { idx: number; player: Player; gain: number } | null = null;
    picks.forEach((pick, idx) => {
      const current = byId.get(pick.playerId)!;
      for (const candidate of pool) {
        if (used.has(candidate.id)) continue;
        if (!candidate.slots.includes(pick.slot)) continue;
        const gain = priceOf(candidate) - priceOf(current);
        if (gain <= 0 || gain > budgetLeft) continue;
        if (!best || gain > best.gain) best = { idx, player: candidate, gain };
      }
    });
    if (!best) break;
    const chosen: { idx: number; player: Player; gain: number } = best;
    used.delete(picks[chosen.idx].playerId);
    used.add(chosen.player.id);
    picks[chosen.idx] = { playerId: chosen.player.id, slot: picks[chosen.idx].slot };
  }

  return SLOT_ORDER.flatMap((slot) => picks.filter((p) => p.slot === slot));
}
