/**
 * Macunköy Fantazi Ligi — alan modeli.
 *
 * Kodun her yerinde mevkiler İngilizce kısaltmayla tutulur (GK/DEF/MID/FWD),
 * ekranda Türkçe gösterilir (K/D/OS/FW). Çeviri tablosu: SLOT_LABEL.
 */

export type Slot = "GK" | "DEF" | "MID" | "FWD";

export const SLOT_LABEL: Record<Slot, string> = {
  GK: "K",
  DEF: "D",
  MID: "OS",
  FWD: "FW",
};

export const SLOT_LABEL_LONG: Record<Slot, string> = {
  GK: "Kaleci",
  DEF: "Defans",
  MID: "Orta Saha",
  FWD: "Forvet",
};

/** Havuzdaki bir oyuncu. Fiyat ayrı tutulur çünkü her hafta değişir. */
export interface Player {
  id: string;
  name: string;
  /** Bu oyuncunun konabileceği slotlar. Çok mevkili oyuncular birden fazla içerir. */
  slots: Slot[];
  /** Sezon başı fiyatı — admin belirler, sonrası algoritmaya kalır. */
  basePrice: number;
  /** Güncel fiyat. Her hafta settle sonrası güncellenir. */
  price: number;
  /**
   * Hem kaleci hem oyuncu olabilen arkadaş (Barkuz).
   * Kadroda hangi slota konduğu bir bahis hâline gelir.
   */
  dualKeeper: boolean;
  /** Havuzdan çıkarılan oyuncular (askerlik, sakatlık, gruptan ayrılma) */
  active: boolean;
}

/**
 * Bir menajer hesabı. Her hesap havuzdaki bir oyuncuya bire bir bağlıdır —
 * ligde oynayan herkes aynı zamanda bir futbolcu.
 *
 * Hesap ilk girişte kendiliğinden oluşur: ismini ve varsayılan şifreni
 * (yine kendi ismin) girersin, sonra kendi şifreni belirlersin.
 */
export interface Manager {
  id: string;
  /** Hangi oyuncu olduğu. Benzersiz — bir isimle iki hesap açılamaz. */
  playerId: string;
  /** İsteğe bağlı fantazi takım adı. Boşsa her yerde oyuncunun adı görünür. */
  teamName: string | null;
  passwordHash: string;
  /** Hâlâ varsayılan şifre kullanılıyorsa true; kullanıcıdan değiştirmesi istenir. */
  mustChangePassword: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  /** Arka arkaya yanlış şifre sayısı. Doğru girişte sıfırlanır. */
  failedAttempts: number;
  /** Çok fazla yanlış denemeden sonra girişin açılacağı an (ISO). */
  lockedUntil: string | null;
}

export type GameweekStatus =
  /** Kadro kurulabilir. Salı 23:00'te kendiliğinden kapanır. */
  | "open"
  /** Kadrolar kilitli. Admin henüz o haftanın takımlarını girmedi. */
  | "locked"
  /** Admin sahaya çıkacak 22 kişiyi iki takıma bölüp kaptanları belirledi. */
  | "teams"
  /** Skor ve reytingler girildi, admin "Tamamla" dedi. Artık değişmez. */
  | "completed"
  /** Bu hafta maç yok. Kimse kadro kurmaz, kimse puan almaz. */
  | "holiday";

/** Bir oyuncunun o haftaki maç verisi. Admin girer. */
export interface PlayerMatchStat {
  playerId: string;
  /** Sahaya çıktı mı. Kadroya alınıp çıkmayan oyuncu menajerine −5 yazar. */
  played: boolean;
  /** O hafta kalede mi oynadı. Slot uyuşmazlığı bu alandan hesaplanır. */
  keptGoal: boolean;
  team: "A" | "B";
  goals: number;
  /** 1.0 – 10.0 arası, 0.5 adımlarla. */
  rating: number;
}

export interface Gameweek {
  id: string;
  /** Sezon içindeki hafta numarası, 1'den başlar. */
  number: number;
  status: GameweekStatus;
  /** Kadroların kilitlendiği an — Salı 23:00. */
  lockAt: string;
  /** Maçın oynanacağı an — bir sonraki Salı 21:00. */
  matchAt: string;

  /** Pencere açılırken admin'in ilan ettiği kampanyalı oyuncular. */
  promoPlayerIds: string[];

  /** --- Takımlar girildikten sonra (status >= "teams") --- */
  /** O hafta sahaya çıkan 22 kişi. */
  calledUpIds: string[];
  teamAIds: string[];
  teamBIds: string[];
  /** Her takımdan 1 kaptan. Kadrosunda bulunduran menajer 2x alır. */
  captainIds: string[];

  /** --- Maç sonrası --- */
  scoreA: number | null;
  scoreB: number | null;
  mvpPlayerId: string | null;
  stats: PlayerMatchStat[];

  /** --- Tamamlandı (status = "completed"). Bu tarih doluysa hafta kilitli. --- */
  completedAt: string | null;
}

/** Bir menajerin bir haftaki kadrosu. */
export interface Squad {
  id: string;
  gameweekId: string;
  managerId: string;
  formationId: string;
  picks: SquadPick[];
  /** Menajerin kendi kurduğu mu, yoksa otomatik devreden mi. */
  source: "manual" | "rollover";
  updatedAt: string;
}

export interface SquadPick {
  playerId: string;
  /** Menajerin oyuncuyu koyduğu slot. Gerçek rolle uyuşmazsa gol puanı yanar. */
  slot: Slot;
}

/** Bir oyuncunun bir haftadaki puan dökümü — ekranda satır satır gösterilir. */
export interface PlayerScoreBreakdown {
  playerId: string;
  slot: Slot;
  lines: ScoreLine[];
  /** Çarpanlar uygulanmadan önceki toplam. */
  subtotal: number;
  captainMultiplier: number;
  promoMultiplier: number;
  total: number;
  /** Slot ile gerçek rol uyuşmadı mı (gol puanı yandı). */
  slotMismatch: boolean;
  didNotPlay: boolean;
}

export interface ScoreLine {
  label: string;
  points: number;
}

export interface SquadScore {
  squadId: string;
  managerId: string;
  gameweekId: string;
  players: PlayerScoreBreakdown[];
  total: number;
}

/** Lig tablosu satırı. */
export interface StandingsRow {
  managerId: string;
  teamName: string | null;
  playerName: string;
  totalPoints: number;
  weeksPlayed: number;
  bestWeek: number;
  lastWeekPoints: number | null;
  rank: number;
  previousRank: number | null;
}
