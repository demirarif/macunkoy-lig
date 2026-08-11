import type { Player, Slot } from "./types";

/**
 * Macunköy havuzu — 37 oyuncu.
 *
 * `basePrice` değerleri grubun kendi verdiği reytinglerdir (4–18 aralığı) ve
 * doğrudan sezon başı fiyatı olarak kullanılır. 2. haftadan itibaren fiyatları
 * sahadaki performans belirler (bkz. pricing.ts).
 *
 * Görsel dosyası beklenen yol: /public/players/<id>.png (şeffaf arka plan, 3:4).
 * Dosya yoksa arayüz otomatik olarak baş harf rozetine düşer.
 */

type Seed = [name: string, slots: Slot[], price: number, dualKeeper?: true];

const SEED: Record<string, Seed> = {
  // --- Kaleciler ---
  talha: ["Talha", ["GK"], 13],
  yusuf: ["Yusuf", ["GK"], 13],
  // Hem kaleci hem forvet. Hangi rolde oynayacağı haftadan haftaya değişir;
  // kadroda hangi slota konduğu menajerin bahsidir.
  barkuz: ["Barkuz", ["GK", "FWD"], 14, true],

  // --- Forvetler ---
  alper: ["Alper", ["FWD"], 16],
  taha: ["Taha", ["FWD"], 16],
  eren: ["Eren", ["FWD"], 13],
  mensur: ["Mensur", ["FWD"], 13],
  "kamil-reis": ["Kamil Reis", ["FWD"], 12],
  onur: ["Onur", ["FWD"], 12],

  // --- Forvet / Orta saha ---
  goktug: ["Göktuğ", ["FWD", "MID"], 15],
  mustafa: ["Mustafa", ["MID", "FWD"], 13],
  emir: ["Emir", ["MID", "FWD"], 13],
  "mert-efe": ["Mert Efe", ["MID", "FWD"], 13],
  erhan: ["Erhan", ["MID", "FWD"], 12],
  "ali-efe": ["Ali Efe", ["MID", "FWD"], 12],

  // --- Defans / Orta saha ---
  baran: ["Baran", ["DEF", "MID"], 12],
  mamadou: ["Mamadou", ["DEF", "MID"], 12],
  utku: ["Utku", ["DEF", "MID"], 10],
  altug: ["Altuğ", ["DEF", "MID"], 10],
  yanki: ["Yankı", ["DEF", "MID"], 9],
  batu: ["Batu", ["DEF", "MID"], 8],
  "yigit-cetinkaya": ["Yiğit Çetinkaya", ["DEF", "MID"], 8],

  // --- Her yerde oynayanlar ---
  arif: ["Arif", ["DEF", "MID", "FWD"], 12],
  "arda-barin": ["Arda Barin", ["DEF", "MID", "FWD"], 8],
  omer: ["Ömer", ["DEF", "MID", "FWD"], 5],

  // --- Defanslar ---
  servan: ["Servan", ["DEF"], 18],
  "m-emre": ["M. Emre", ["DEF"], 14],
  mali: ["Mali", ["DEF"], 13],
  ugur: ["Uğur", ["DEF"], 11],
  eto: ["Eto", ["DEF"], 9],
  direnc: ["Direnç", ["DEF"], 9],
  halit: ["Halit", ["DEF"], 8],
  tevfik: ["Tevfik", ["DEF"], 7],
  fuat: ["Fuat", ["DEF"], 6],
  seker: ["Şeker", ["DEF"], 5],
  berkin: ["Berkin", ["DEF"], 5],
  akin: ["Akın", ["DEF"], 4],
};

export const SEED_PLAYERS: Player[] = Object.entries(SEED).map(
  ([id, [name, slots, price, dualKeeper]]) => ({
    id,
    name,
    slots,
    basePrice: price,
    price,
    dualKeeper: dualKeeper === true,
    active: true,
  }),
);
