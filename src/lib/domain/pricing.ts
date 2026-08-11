import type { PricingConfig } from "./rules";
import { round1 } from "./scoring";
import type { PlayerMatchStat } from "./types";

/**
 * Fiyat algoritması.
 *
 * İstenen davranış: iki hafta üst üste iyi oynayan pahalanır, tek kötü hafta
 * anında düşürür, ama pahalı oyuncu neredeyse hiç yükselemez ve ucuz oyuncu
 * neredeyse hiç düşemez. Bunu iki sönümleme katsayısıyla yapıyoruz:
 *
 *   yükselmeSönümü = (maxPrice − fiyat) / (maxPrice − minPrice)
 *   düşmeSönümü    = (fiyat − minPrice) / (maxPrice − minPrice)
 *
 * Örnek (min 4, max 20, step 0.5):
 *   18.0'lık Servan iyi oynarsa  →  +0.5 × (2/16)  = +0.06
 *   12.0'lık Mamadou iyi oynarsa →  +0.5 × (8/16)  = +0.25
 *    5.0'lık Ömer kötü oynarsa   →  −0.5 × (1/16)  = −0.03
 *
 * Yani hareket hep ortada olur; ne yıldız uçar ne de dip oyuncu yok olur.
 */

/** Bir oyuncunun geçmiş haftalardaki verisi — en yeni hafta en sonda. */
export type PlayerHistory = Array<PlayerMatchStat | null>;

export interface PriceChange {
  playerId: string;
  from: number;
  to: number;
  delta: number;
  reason: PriceReason;
}

export type PriceReason =
  | "iki-hafta-iyi"
  | "kotu-hafta"
  | "uzun-sure-yok"
  | "degisiklik-yok";

/** Geçmişin sonundan geriye doğru üst üste kaç "iyi hafta" var. */
function trailingGoodWeeks(history: PlayerHistory, config: PricingConfig): number {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const stat = history[i];
    // Oynamadığı haftalar seriyi ne bozar ne de ilerletir; atlanır.
    if (!stat || !stat.played) continue;
    if (stat.rating >= config.goodRating) count++;
    else break;
  }
  return count;
}

/** Geçmişin sonundan geriye doğru üst üste kaç hafta oynamadı. */
function trailingAbsences(history: PlayerHistory): number {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const stat = history[i];
    if (!stat || !stat.played) count++;
    else break;
  }
  return count;
}

export function nextPrice(
  playerId: string,
  currentPrice: number,
  history: PlayerHistory,
  config: PricingConfig,
): PriceChange {
  const latest = history[history.length - 1];
  const range = config.maxPrice - config.minPrice;
  const unchanged: PriceChange = {
    playerId,
    from: currentPrice,
    to: currentPrice,
    delta: 0,
    reason: "degisiklik-yok",
  };
  if (range <= 0) return unchanged;

  let delta = 0;
  let reason: PriceReason = "degisiklik-yok";

  if (latest && latest.played) {
    if (latest.rating < config.badRating) {
      // Tek kötü hafta yeter — düşüş anında gelir.
      const damping = (currentPrice - config.minPrice) / range;
      delta = -config.step * damping;
      reason = "kotu-hafta";
    } else if (trailingGoodWeeks(history, config) >= config.goodWeeksForRaise) {
      const damping = (config.maxPrice - currentPrice) / range;
      delta = config.step * damping;
      reason = "iki-hafta-iyi";
    }
  } else if (trailingAbsences(history) >= config.absentWeeksForDrop) {
    // Uzun süre görünmeyen oyuncu ucuzlar; kadro kuranlar için cazip hâle gelir.
    delta = -config.absentDrop;
    reason = "uzun-sure-yok";
  }

  if (delta === 0) return unchanged;

  const capped = Math.max(-config.weeklyCap, Math.min(config.weeklyCap, delta));
  const to = round1(
    Math.max(config.minPrice, Math.min(config.maxPrice, currentPrice + capped)),
  );
  if (to === currentPrice) return unchanged;

  return { playerId, from: currentPrice, to, delta: round1(to - currentPrice), reason };
}

export const PRICE_REASON_LABEL: Record<PriceReason, string> = {
  "iki-hafta-iyi": "2 hafta üst üste iyi",
  "kotu-hafta": "Kötü hafta",
  "uzun-sure-yok": "Uzun süredir yok",
  "degisiklik-yok": "Değişiklik yok",
};
