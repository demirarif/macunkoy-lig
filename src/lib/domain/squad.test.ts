import { describe, expect, it } from "vitest";
import { SEED_PLAYERS } from "./players.seed";
import { DEFAULT_CONFIG, FORMATIONS } from "./rules";
import { autoPickSquad, squadCost, validateSquad } from "./squad";
import type { Player, SquadPick } from "./types";

const PLAYERS = new Map<string, Player>(SEED_PLAYERS.map((p) => [p.id, p]));
const NO_PROMO = { promoPlayerIds: [] as string[] };

function picks(entries: Array<[string, SquadPick["slot"]]>): SquadPick[] {
  return entries.map(([playerId, slot]) => ({ playerId, slot }));
}

describe("bütçe kalibrasyonu (85 birim)", () => {
  it("her mevkide orta seviye, yıldızsız bir 2-2-2 tam olarak bütçeyi doldurur", () => {
    const squad = picks([
      ["yusuf", "GK"],
      ["mali", "DEF"],
      ["ugur", "DEF"],
      ["mamadou", "MID"],
      ["baran", "MID"],
      ["onur", "FWD"],
      ["kamil-reis", "FWD"],
    ]);
    const v = validateSquad("denge", squad, PLAYERS, NO_PROMO, DEFAULT_CONFIG);
    expect(v.cost).toBe(85);
    expect(v.remaining).toBe(0);
    expect(v.ok).toBe(true);
  });

  it("3 pahalı oyuncu sığar ama kadronun geri kalanı dipten dolar", () => {
    const squad = picks([
      ["talha", "GK"],
      ["servan", "DEF"], // 18
      ["akin", "DEF"], // 4
      ["omer", "MID"], // 5
      ["arda-barin", "MID"], // 8
      ["alper", "FWD"], // 16
      ["taha", "FWD"], // 16
    ]);
    const v = validateSquad("denge", squad, PLAYERS, NO_PROMO, DEFAULT_CONFIG);
    expect(v.cost).toBe(80);
    expect(v.ok).toBe(true);
  });

  it("4. pahalı oyuncu bütçeye sığmaz", () => {
    const squad = picks([
      ["talha", "GK"],
      ["servan", "DEF"], // 18
      ["akin", "DEF"], // 4
      ["omer", "MID"], // 5
      ["goktug", "MID"], // 15  ← dördüncü yıldız
      ["alper", "FWD"], // 16
      ["taha", "FWD"], // 16
    ]);
    const v = validateSquad("denge", squad, PLAYERS, NO_PROMO, DEFAULT_CONFIG);
    expect(v.cost).toBe(87);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("Bütçe aşıldı"))).toBe(true);
  });

  it("kampanya indirimi o oyuncuyu bütçeye sokabilir", () => {
    const squad = picks([
      ["talha", "GK"],
      ["servan", "DEF"],
      ["akin", "DEF"],
      ["omer", "MID"],
      ["goktug", "MID"],
      ["alper", "FWD"],
      ["taha", "FWD"],
    ]);
    // Göktuğ kampanyada: 15 → 9
    const promo = { promoPlayerIds: ["goktug"] };
    const v = validateSquad("denge", squad, PLAYERS, promo, DEFAULT_CONFIG);
    expect(v.cost).toBe(81);
    expect(v.ok).toBe(true);
  });
});

describe("kadro doğrulama", () => {
  it("oynayamayacağı mevkiye konan oyuncuyu reddeder", () => {
    const squad = picks([
      ["talha", "GK"],
      ["servan", "DEF"],
      ["akin", "DEF"],
      ["mali", "MID"], // Mali sadece defans
      ["omer", "MID"],
      ["alper", "FWD"],
      ["onur", "FWD"],
    ]);
    const v = validateSquad("denge", squad, PLAYERS, NO_PROMO, DEFAULT_CONFIG);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("Mali") && e.includes("orta saha"))).toBe(true);
  });

  it("Barkuz hem kaleci hem forvet slotuna konabilir", () => {
    for (const slot of ["GK", "FWD"] as const) {
      const player = PLAYERS.get("barkuz")!;
      expect(player.slots).toContain(slot);
    }
  });

  it("aynı oyuncuyu iki kez alamazsın", () => {
    const squad = picks([
      ["talha", "GK"],
      ["servan", "DEF"],
      ["servan", "DEF"],
      ["omer", "MID"],
      ["arda-barin", "MID"],
      ["alper", "FWD"],
      ["onur", "FWD"],
    ]);
    const v = validateSquad("denge", squad, PLAYERS, NO_PROMO, DEFAULT_CONFIG);
    expect(v.errors.some((e) => e.includes("iki kez"))).toBe(true);
  });

  it("diziliş mevki sayısına uymayan kadroyu reddeder", () => {
    const squad = picks([
      ["talha", "GK"],
      ["servan", "DEF"],
      ["mali", "DEF"],
      ["akin", "DEF"], // beton değil denge seçili — 3 defans fazla
      ["omer", "MID"],
      ["alper", "FWD"],
      ["onur", "FWD"],
    ]);
    const v = validateSquad("denge", squad, PLAYERS, NO_PROMO, DEFAULT_CONFIG);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("Defans"))).toBe(true);
  });
});

describe("otomatik kadro", () => {
  it("her diziliş için bütçeye sığan, geçerli bir kadro üretir", () => {
    for (const formation of FORMATIONS) {
      const squad = autoPickSquad(formation.id, SEED_PLAYERS, NO_PROMO, DEFAULT_CONFIG);
      const v = validateSquad(formation.id, squad, PLAYERS, NO_PROMO, DEFAULT_CONFIG);
      expect(v.errors, `${formation.name}: ${v.errors.join(" | ")}`).toEqual([]);
      expect(v.cost).toBeLessThanOrEqual(DEFAULT_CONFIG.budget);
      // Bütçenin çoğunu kullanmalı, yoksa "otomatik kadro" cezalandırıcı olur.
      expect(v.cost).toBeGreaterThan(DEFAULT_CONFIG.budget * 0.9);
    }
  });

  it("devreden kadroda korunabilecek seçimleri korur", () => {
    const previous = picks([
      ["servan", "DEF"],
      ["alper", "FWD"],
    ]);
    const squad = autoPickSquad("denge", SEED_PLAYERS, NO_PROMO, DEFAULT_CONFIG, previous);
    expect(squad).toContainEqual({ playerId: "servan", slot: "DEF" });
    expect(squad).toContainEqual({ playerId: "alper", slot: "FWD" });
    const v = validateSquad("denge", squad, PLAYERS, NO_PROMO, DEFAULT_CONFIG);
    expect(v.errors).toEqual([]);
  });

  it("bütçeye sığmayan devreden kadroyu onarır", () => {
    // Bilerek imkânsız bir kadro: 4 yıldız + pahalı kaleci
    const impossible = picks([
      ["barkuz", "GK"], // 14
      ["servan", "DEF"], // 18
      ["m-emre", "DEF"], // 14
      ["goktug", "MID"], // 15
      ["mustafa", "MID"], // 13
      ["alper", "FWD"], // 16
      ["taha", "FWD"], // 16
    ]);
    expect(squadCost(impossible, PLAYERS, NO_PROMO, DEFAULT_CONFIG)).toBeGreaterThan(
      DEFAULT_CONFIG.budget,
    );
    const repaired = autoPickSquad("denge", SEED_PLAYERS, NO_PROMO, DEFAULT_CONFIG, impossible);
    const v = validateSquad("denge", repaired, PLAYERS, NO_PROMO, DEFAULT_CONFIG);
    expect(v.errors).toEqual([]);
    expect(v.cost).toBeLessThanOrEqual(DEFAULT_CONFIG.budget);
  });
});

describe("havuz sağlığı", () => {
  it("37 oyuncu var", () => {
    expect(SEED_PLAYERS).toHaveLength(37);
  });

  it("kaleci slotuna sadece Talha, Yusuf ve Barkuz konabilir", () => {
    const keepers = SEED_PLAYERS.filter((p) => p.slots.includes("GK")).map((p) => p.id);
    expect(keepers.sort()).toEqual(["barkuz", "talha", "yusuf"]);
  });

  it("her diziliş her mevki için yeterli oyuncuya sahip", () => {
    for (const formation of FORMATIONS) {
      for (const [slot, need] of Object.entries(formation.counts)) {
        const available = SEED_PLAYERS.filter((p) =>
          p.slots.includes(slot as SquadPick["slot"]),
        ).length;
        expect(available, `${formation.name} / ${slot}`).toBeGreaterThanOrEqual(need);
      }
    }
  });
});
