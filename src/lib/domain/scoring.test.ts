import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "./rules";
import { scorePick, scoreSquad } from "./scoring";
import type { Gameweek, PlayerMatchStat, Squad, SquadPick } from "./types";

const CFG = DEFAULT_CONFIG.scoring;

function stat(over: Partial<PlayerMatchStat> & { playerId: string }): PlayerMatchStat {
  return {
    played: true,
    keptGoal: false,
    team: "A",
    goals: 0,
    rating: 6.5,
    ...over,
  };
}

function gameweek(over: Partial<Gameweek> = {}): Gameweek {
  return {
    id: "gw1",
    number: 1,
    status: "completed",
    lockAt: "2026-08-11T20:00:00.000Z",
    matchAt: "2026-08-18T18:00:00.000Z",
    promoPlayerIds: [],
    calledUpIds: [],
    teamAIds: [],
    teamBIds: [],
    captainIds: [],
    scoreA: 7,
    scoreB: 5,
    mvpPlayerId: null,
    stats: [],
    completedAt: null,
    ...over,
  };
}

describe("puanlama — temel kurallar", () => {
  it("ankete yetişemeyen oyuncu sabit ceza yer", () => {
    const gw = gameweek({ stats: [] });
    const r = scorePick({ playerId: "alper", slot: "FWD" }, gw, CFG);
    expect(r.didNotPlay).toBe(true);
    expect(r.total).toBe(-5);
  });

  it("kampanyalı oyuncu ankete yetişemezse cezası da 1.5 katına çıkar", () => {
    const gw = gameweek({ promoPlayerIds: ["alper"], stats: [] });
    expect(scorePick({ playerId: "alper", slot: "FWD" }, gw, CFG).total).toBe(-7.5);
  });

  it("mağlubiyet eksi puan getirir", () => {
    const gw = gameweek({
      scoreA: 3,
      scoreB: 8,
      stats: [stat({ playerId: "mali", rating: 6.5, team: "A" })],
    });
    // oynadı +2, reyting 6.5 → 0, mağlubiyet −2
    expect(scorePick({ playerId: "mali", slot: "DEF" }, gw, CFG).total).toBe(0);
  });

  it("gol puanı mevkiye göre değişir", () => {
    const base = (slot: "DEF" | "MID" | "FWD", playerId: string) => {
      const gw = gameweek({ stats: [stat({ playerId, goals: 1, rating: 6.5 })] });
      return scorePick({ playerId, slot }, gw, CFG).total;
    };
    // her birinde oynadı +2 ve galibiyet +3 sabit → fark yalnızca gol puanı
    expect(base("DEF", "mali")).toBe(10); // 2 + 5 + 3
    expect(base("MID", "baran")).toBe(9); // 2 + 4 + 3
    expect(base("FWD", "alper")).toBe(8); // 2 + 3 + 3
  });

  it("kaptanın artısı da eksisi de iki katına çıkar", () => {
    const good = gameweek({
      captainIds: ["alper"],
      stats: [stat({ playerId: "alper", rating: 9.2, goals: 1 })],
    });
    // 2 + 5 + 3 + 3 = 13 → ×2
    expect(scorePick({ playerId: "alper", slot: "FWD" }, good, CFG).total).toBe(26);

    const bad = gameweek({
      captainIds: ["alper"],
      scoreA: 2,
      scoreB: 9,
      stats: [stat({ playerId: "alper", rating: 4.2 })],
    });
    // 2 − 4 − 2 = −4 → ×2
    expect(scorePick({ playerId: "alper", slot: "FWD" }, bad, CFG).total).toBe(-8);
  });

  it("iki kaptan da kadrodaysa ikisi de 2x alır", () => {
    const gw = gameweek({
      captainIds: ["alper", "servan"],
      stats: [
        stat({ playerId: "alper", rating: 8.0, team: "A" }),
        stat({ playerId: "servan", rating: 8.0, team: "B" }),
      ],
    });
    const squad: Squad = {
      id: "s1",
      gameweekId: "gw1",
      managerId: "m1",
      formationId: "denge",
      source: "manual",
      updatedAt: "",
      picks: [
        { playerId: "alper", slot: "FWD" },
        { playerId: "servan", slot: "DEF" },
      ],
    };
    const result = scoreSquad(squad, gw, CFG);
    expect(result.players.every((p) => p.captainMultiplier === 2)).toBe(true);
    // alper: 2 + 3 + 3(galibiyet) = 8 → 16 | servan: 2 + 3 − 2(mağlubiyet) = 3 → 6
    expect(result.total).toBe(22);
  });
});

describe("puanlama — kaleci ve Barkuz kuralı", () => {
  const barkuz = "barkuz";

  it("kaleci, saha oyuncusundan daha bağışlayıcı bir tablodan puanlanır", () => {
    const gw = gameweek({ stats: [stat({ playerId: "talha", keptGoal: true, rating: 6.2 })] });
    // kaleci 6.0–6.9 → +2 (saha oyuncusu olsaydı 0 alacaktı)
    expect(scorePick({ playerId: "talha", slot: "GK" }, gw, CFG).total).toBe(7);
  });

  it("en kötü kaleci haftası bile ankete basmayan bir oyuncudan iyidir", () => {
    const gw = gameweek({
      scoreA: 1,
      scoreB: 12,
      stats: [stat({ playerId: "talha", keptGoal: true, rating: 2.0 })],
    });
    const keeper = scorePick({ playerId: "talha", slot: "GK" }, gw, CFG).total;
    // oynadı +2, reyting −2, mağlubiyet −2 = −2
    expect(keeper).toBe(-2);
    expect(keeper).toBeGreaterThan(CFG.noShow);
  });

  it("Barkuz'u kaleci slotuna koydun ve kalede oynadı → tam puan", () => {
    const gw = gameweek({ stats: [stat({ playerId: barkuz, keptGoal: true, rating: 7.5 })] });
    const r = scorePick({ playerId: barkuz, slot: "GK" }, gw, CFG);
    expect(r.slotMismatch).toBe(false);
    expect(r.total).toBe(9); // 2 + 4 + 3
  });

  it("Barkuz'u forvete koydun ve forvette oynadı → gol puanı sayılır", () => {
    const gw = gameweek({
      stats: [stat({ playerId: barkuz, keptGoal: false, rating: 7.5, goals: 2 })],
    });
    const r = scorePick({ playerId: barkuz, slot: "FWD" }, gw, CFG);
    expect(r.slotMismatch).toBe(false);
    expect(r.total).toBe(12); // 2 + 1 + (2×3) + 3
  });

  it("Barkuz'u forvete koydun ama kaleye geçti → gol yok, kaleci reytingi var", () => {
    const gw = gameweek({
      stats: [stat({ playerId: barkuz, keptGoal: true, rating: 7.5, goals: 1 })],
    });
    const r = scorePick({ playerId: barkuz, slot: "FWD" }, gw, CFG);
    expect(r.slotMismatch).toBe(true);
    expect(r.lines.some((l) => l.label.includes("sayılmadı"))).toBe(true);
    expect(r.total).toBe(9); // 2 + 4(kaleci tablosu) + 3 — gol yandı
  });

  it("kaleci slotuna koydun ama sahada oynadı → gol yok, saha reytingi var", () => {
    const gw = gameweek({
      stats: [stat({ playerId: barkuz, keptGoal: false, rating: 7.5, goals: 1 })],
    });
    const r = scorePick({ playerId: barkuz, slot: "GK" }, gw, CFG);
    expect(r.slotMismatch).toBe(true);
    expect(r.total).toBe(6); // 2 + 1(saha tablosu) + 3 — gol yandı
  });
});

describe("puanlama — örnek hafta", () => {
  it("tasarım dokümanındaki örnek hafta 66.5 puan verir", () => {
    const picks: SquadPick[] = [
      { playerId: "emre", slot: "GK" },
      { playerId: "kaan", slot: "DEF" },
      { playerId: "serkan", slot: "DEF" },
      { playerId: "murat", slot: "MID" },
      { playerId: "burak", slot: "MID" },
      { playerId: "onur", slot: "FWD" },
      { playerId: "cem", slot: "FWD" },
    ];
    const gw = gameweek({
      scoreA: 6,
      scoreB: 4,
      captainIds: ["murat"],
      promoPlayerIds: ["onur"],
      mvpPlayerId: "onur",
      stats: [
        stat({ playerId: "emre", keptGoal: true, rating: 6.5, team: "A" }),
        stat({ playerId: "kaan", rating: 7.8, goals: 1, team: "A" }),
        // serkan ankete yetişemedi → istatistiği yok
        stat({ playerId: "murat", rating: 8.4, goals: 1, team: "A" }),
        stat({ playerId: "burak", rating: 5.2, team: "B" }),
        stat({ playerId: "onur", rating: 9.1, goals: 2, team: "A" }),
        stat({ playerId: "cem", rating: 6.8, team: "B" }),
      ],
    });
    const squad: Squad = {
      id: "s1",
      gameweekId: "gw1",
      managerId: "m1",
      formationId: "denge",
      source: "manual",
      updatedAt: "",
      picks,
    };
    const result = scoreSquad(squad, gw, CFG);
    expect(result.players.map((p) => p.total)).toEqual([7, 11, -5, 24, -2, 31.5, 0]);
    expect(result.total).toBe(66.5);
  });
});
