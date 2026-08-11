import type { Slot } from "./types";

/**
 * Ligin tüm ayarlanabilir sayıları tek yerde.
 * Admin paneli bu nesnenin bir kopyasını veritabanında tutar ve düzenler;
 * buradaki değerler yalnızca varsayılan (sezon 1) ayarlardır.
 */
export interface LeagueConfig {
  budget: number;
  scoring: ScoringConfig;
  pricing: PricingConfig;
}

export interface ScoringConfig {
  /** Ankete yetişip maça çıkma puanı. */
  played: number;
  /** Ankete yetişemeyen / maça gelmeyen oyuncunun cezası. */
  noShow: number;
  /** Mevkiye göre gol puanı. Kaleci golü nadir olduğu için en yüksek. */
  goal: Record<Slot, number>;
  win: number;
  draw: number;
  loss: number;
  mvp: number;
  /** Saha oyuncuları için reyting basamakları — yüksekten alçağa taranır. */
  outfieldRatingBands: RatingBand[];
  /** Kaleciler için ayrı ve daha bağışlayıcı tablo (bol gollü maçlar). */
  keeperRatingBands: RatingBand[];
  /** Kaptanın çarpanı. Artı da eksi de bu katsayıyla çarpılır. */
  captainMultiplier: number;
  /** Kampanyalı oyuncunun puan çarpanı. */
  promoMultiplier: number;
  /** Kampanyalı oyuncunun fiyat indirimi (0.4 = %40). */
  promoDiscount: number;
  /** Her hafta kaç oyuncu kampanyaya girer. */
  promoCount: number;
  /** Anket sonrası ilan edilen kaptan sayısı (her takımdan 1). */
  captainCount: number;
}

export interface RatingBand {
  /** Bu puanın geçerli olduğu en düşük reyting (dahil). */
  min: number;
  points: number;
}

export interface PricingConfig {
  minPrice: number;
  maxPrice: number;
  /** Sönümleme uygulanmadan önceki ham adım. */
  step: number;
  /** Bu reyting ve üstü "iyi hafta" sayılır. */
  goodRating: number;
  /** Bu reytingin altı "kötü hafta" sayılır. */
  badRating: number;
  /** Fiyatın artması için kaç hafta üst üste iyi oynaması gerekir. */
  goodWeeksForRaise: number;
  /** Bu kadar hafta üst üste oynamayan oyuncunun fiyatı düşer. */
  absentWeeksForDrop: number;
  absentDrop: number;
  /** Tek haftada fiyatın değişebileceği en büyük miktar. */
  weeklyCap: number;
}

export const DEFAULT_CONFIG: LeagueConfig = {
  /**
   * 85 birim. Kalibrasyon notu:
   *  - Sıfır yıldızlı, her mevkide orta seviye bir 2-2-2 tam olarak 85 eder
   *    (Yusuf 13 + Mali 13 + Uğur 11 + Mamadou 12 + Baran 12 + Onur 12 + Kamil 12).
   *  - 3 pahalı oyuncu (Servan 18 + Alper 16 + Taha 16 = 50) alınabilir ama
   *    geriye kalan 35 birimle kadronun dördü dip fiyattan doldurulmak zorundadır.
   *  - 4. pahalı oyuncu çoğu dizilişte matematiksel olarak sığmaz.
   */
  budget: 85,

  scoring: {
    played: 2,
    noShow: -5,
    goal: { GK: 8, DEF: 5, MID: 4, FWD: 3 },
    win: 3,
    draw: 1,
    loss: -2,
    mvp: 5,
    outfieldRatingBands: [
      { min: 9.0, points: 5 },
      { min: 8.0, points: 3 },
      { min: 7.0, points: 1 },
      { min: 6.0, points: 0 },
      { min: 5.0, points: -2 },
      { min: 0.0, points: -4 },
    ],
    keeperRatingBands: [
      { min: 8.0, points: 6 },
      { min: 7.0, points: 4 },
      { min: 6.0, points: 2 },
      { min: 5.0, points: 0 },
      { min: 4.0, points: -1 },
      { min: 0.0, points: -2 },
    ],
    captainMultiplier: 2,
    promoMultiplier: 1.5,
    promoDiscount: 0.4,
    promoCount: 3,
    captainCount: 2,
  },

  pricing: {
    minPrice: 4,
    maxPrice: 20,
    step: 0.5,
    goodRating: 7.5,
    badRating: 6.0,
    goodWeeksForRaise: 2,
    absentWeeksForDrop: 3,
    absentDrop: 0.5,
    weeklyCap: 1.0,
  },
};

export interface Formation {
  id: string;
  name: string;
  tagline: string;
  /** GK her zaman 1; toplam 7 olmak zorunda. */
  counts: Record<Slot, number>;
}

export const FORMATIONS: Formation[] = [
  {
    id: "denge",
    name: "2-2-2 Denge",
    tagline: "Standart kurulum. Her hafta işini görür, hiçbir hafta uçurmaz.",
    counts: { GK: 1, DEF: 2, MID: 2, FWD: 2 },
  },
  {
    id: "beton",
    name: "3-2-1 Beton",
    tagline: "Defans golü +5. Ucuz defanslarla bütçe artırıp öne yıldız koyarsın.",
    counts: { GK: 1, DEF: 3, MID: 2, FWD: 1 },
  },
  {
    id: "kontrol",
    name: "2-3-1 Kontrol",
    tagline: "Orta saha golü +4. En dengeli puan dağılımı, en az sürpriz.",
    counts: { GK: 1, DEF: 2, MID: 3, FWD: 1 },
  },
  {
    id: "baski",
    name: "1-3-2 Baskı",
    tagline: "Tek defansla oynarsın. Gol yağmuru haftalarında tabloyu parçalar.",
    counts: { GK: 1, DEF: 1, MID: 3, FWD: 2 },
  },
  {
    id: "kamikaze",
    name: "1-2-3 Kamikaze",
    tagline: "Forvet golü sadece +3 ama üç ihtimalin var. Tam kumar.",
    counts: { GK: 1, DEF: 1, MID: 2, FWD: 3 },
  },
];

export const SQUAD_SIZE = 7;

/** Slotların sahada yukarıdan aşağıya sıralanışı — kadro ekranı bu sırayı kullanır. */
export const SLOT_ORDER: readonly Slot[] = ["GK", "DEF", "MID", "FWD"] as const;

export function getFormation(id: string): Formation {
  const found = FORMATIONS.find((f) => f.id === id);
  if (!found) throw new Error(`Bilinmeyen diziliş: ${id}`);
  return found;
}
