import type { Slot } from "@/lib/domain/types";

/**
 * Kart seviyeleri fiyata göre belirlenir. Fiyat her hafta oynadığı için
 * bir oyuncunun kartı sezon içinde seviye atlayabilir ya da düşebilir —
 * grubun en çok konuşacağı şeylerden biri bu olacak.
 */
export type Tier = "bronze" | "silver" | "gold" | "legend";

export function tierFor(price: number): Tier {
  if (price >= 16) return "legend";
  if (price >= 12) return "gold";
  if (price >= 8) return "silver";
  return "bronze";
}

export interface TierStyle {
  label: string;
  /** Kart gövdesinin arka planı. */
  surface: string;
  /** Çerçeve rengi. */
  border: string;
  /** İsim şeridi. */
  band: string;
  /** Fiyat ve mevki rozetlerinin metin rengi. */
  accent: string;
  /** Kartın arkasındaki hâle. */
  glow: string;
}

export const TIER_STYLES: Record<Tier, TierStyle> = {
  bronze: {
    label: "Bronz",
    surface: "linear-gradient(160deg, #3a2415 0%, #241509 55%, #16100a 100%)",
    border: "#b07a4a",
    band: "linear-gradient(90deg, rgba(176,122,74,.55), rgba(176,122,74,.12))",
    accent: "#e0a877",
    glow: "0 0 0 1px rgba(176,122,74,.35), 0 12px 30px -12px rgba(176,122,74,.45)",
  },
  silver: {
    label: "Gümüş",
    surface: "linear-gradient(160deg, #2b343b 0%, #1a2127 55%, #10161b 100%)",
    border: "#b9c4cc",
    band: "linear-gradient(90deg, rgba(185,196,204,.5), rgba(185,196,204,.1))",
    accent: "#dbe4ea",
    glow: "0 0 0 1px rgba(185,196,204,.3), 0 12px 30px -12px rgba(185,196,204,.4)",
  },
  gold: {
    label: "Altın",
    surface: "linear-gradient(160deg, #4a3a11 0%, #2c2209 55%, #191305 100%)",
    border: "#e5b53d",
    band: "linear-gradient(90deg, rgba(229,181,61,.55), rgba(229,181,61,.12))",
    accent: "#f7d97a",
    glow: "0 0 0 1px rgba(229,181,61,.4), 0 14px 34px -12px rgba(229,181,61,.5)",
  },
  legend: {
    label: "Macunköy Efsanesi",
    surface: "linear-gradient(160deg, #1c1c22 0%, #0c0c10 50%, #000 100%)",
    border: "#f0f0f0",
    band: "linear-gradient(90deg, rgba(240,240,240,.45), rgba(240,240,240,.08))",
    accent: "#ffffff",
    glow: "0 0 0 1px rgba(255,255,255,.35), 0 16px 40px -12px rgba(255,255,255,.35)",
  },
};

export const SLOT_COLORS: Record<Slot, { bg: string; text: string; ring: string }> = {
  GK: { bg: "bg-flare/15", text: "text-flare", ring: "ring-flare/40" },
  DEF: { bg: "bg-sky-cool/15", text: "text-sky-cool", ring: "ring-sky-cool/40" },
  MID: { bg: "bg-neon/15", text: "text-neon", ring: "ring-neon/40" },
  FWD: { bg: "bg-danger/15", text: "text-danger", ring: "ring-danger/40" },
};

/** Görsel yoksa gösterilecek baş harfler. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("tr");
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase("tr");
}

/** Ada göre sabit bir renk — görseli olmayan oyuncular birbirine karışmasın. */
export function hueFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 360;
  return hash;
}
