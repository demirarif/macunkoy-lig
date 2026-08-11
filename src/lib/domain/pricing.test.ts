import { describe, expect, it } from "vitest";
import { nextPrice, type PlayerHistory } from "./pricing";
import { DEFAULT_CONFIG } from "./rules";
import type { PlayerMatchStat } from "./types";

const P = DEFAULT_CONFIG.pricing;

function week(rating: number, played = true): PlayerMatchStat {
  return { playerId: "x", played, keptGoal: false, team: "A", goals: 0, rating };
}

const ABSENT = week(0, false);

describe("fiyat algoritması", () => {
  it("tek iyi hafta fiyatı değiştirmez, iki hafta üst üste iyi yükseltir", () => {
    const one: PlayerHistory = [week(8.0)];
    expect(nextPrice("x", 12, one, P).delta).toBe(0);

    const two: PlayerHistory = [week(8.0), week(7.6)];
    const raise = nextPrice("x", 12, two, P);
    expect(raise.reason).toBe("iki-hafta-iyi");
    expect(raise.to).toBeGreaterThan(12);
  });

  it("tek kötü hafta anında düşürür", () => {
    const h: PlayerHistory = [week(8.5), week(8.5), week(5.4)];
    const drop = nextPrice("x", 12, h, P);
    expect(drop.reason).toBe("kotu-hafta");
    expect(drop.to).toBeLessThan(12);
  });

  it("pahalı oyuncu neredeyse hiç yükselmez, ucuz oyuncu neredeyse hiç düşmez", () => {
    const good: PlayerHistory = [week(9), week(9)];
    const bad: PlayerHistory = [week(4)];

    const star = nextPrice("servan", 18, good, P);
    const mid = nextPrice("mamadou", 12, good, P);
    expect(star.delta).toBeLessThan(mid.delta);

    const cheapDrop = nextPrice("omer", 5, bad, P);
    const midDrop = nextPrice("mamadou", 12, bad, P);
    expect(Math.abs(cheapDrop.delta)).toBeLessThan(Math.abs(midDrop.delta));
  });

  it("fiyat taban ve tavanı asla aşmaz", () => {
    const good: PlayerHistory = [week(10), week(10)];
    const bad: PlayerHistory = [week(1)];
    expect(nextPrice("x", P.maxPrice, good, P).to).toBeLessThanOrEqual(P.maxPrice);
    expect(nextPrice("x", P.minPrice, bad, P).to).toBeGreaterThanOrEqual(P.minPrice);
  });

  it("üç hafta üst üste görünmeyen oyuncu ucuzlar", () => {
    expect(nextPrice("x", 14, [ABSENT, ABSENT], P).delta).toBe(0);
    const drop = nextPrice("x", 14, [ABSENT, ABSENT, ABSENT], P);
    expect(drop.reason).toBe("uzun-sure-yok");
    expect(drop.to).toBe(13.5);
  });

  it("oynamadığı haftalar iyi hafta serisini bozmaz", () => {
    const h: PlayerHistory = [week(8.2), ABSENT, week(8.4)];
    expect(nextPrice("x", 12, h, P).reason).toBe("iki-hafta-iyi");
  });

  it("orta seviye oyuncular birkaç sezonda dahi makul aralıkta kalır", () => {
    // 30 hafta boyunca hep iyi oynayan bir oyuncu tavana yapışır ama patlamaz.
    let price = 12;
    const history: PlayerHistory = [];
    for (let i = 0; i < 30; i++) {
      history.push(week(8.5));
      price = nextPrice("x", price, history, P).to;
    }
    expect(price).toBeGreaterThan(12);
    expect(price).toBeLessThanOrEqual(P.maxPrice);
  });
});
