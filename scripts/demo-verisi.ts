/**
 * Demo verisi üretir — ligi baştan sona dolu görmek için.
 *
 *   npm run demo      12 menajer, tamamlanmış 1 hafta, açık 2. hafta
 *   npm run sifirla   her şeyi siler, tertemiz bir lig bırakır
 *
 * DİKKAT: demo mevcut veriyi siler. Gerçek sezon başlayınca çalıştırma.
 *
 * Bu betik aynı zamanda haftalık akışın uçtan uca testidir:
 * kilit → takımlar → maç verisi → tamamla zincirinin tamamını gerçek
 * servislerden geçirir.
 */

import { login } from "@/lib/auth/accounts";
import { initialState, openGameweek, type LeagueState } from "@/lib/db/state";
import { mutate, readState, resetState } from "@/lib/db/store";
import { FORMATIONS } from "@/lib/domain/rules";
import { autoPickSquad } from "@/lib/domain/squad";
import type { PlayerMatchStat } from "@/lib/domain/types";
import { completeGameweek, saveStats, saveTeams, setPromos } from "@/lib/services/gameweek";

/** Tekrarlanabilir sonuç için basit doğrusal eşlenik üreteç. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Demo hesapları: varsayılan şifreyle (kendi isimleri) açılır. */
const DEMO_PLAYERS = [
  "Alper", "Taha", "Servan", "Göktuğ", "Barkuz", "Mali",
  "Arif", "Eren", "Mustafa", "Kamil Reis", "Utku", "Mensur",
];

async function seedDemo() {
  console.log("Lig sıfırlanıyor…");
  await resetState(initialState());

  console.log(`${DEMO_PLAYERS.length} hesap açılıyor (şifre = kendi ismi)…`);
  for (const name of DEMO_PLAYERS) {
    await login(name, name);
  }

  const random = rng(20260811);
  let state = await readState();
  const gw1 = openGameweek(state);
  if (!gw1) throw new Error("Açık hafta yok.");

  console.log("1. hafta kampanyası belirleniyor…");
  await setPromos(gw1.id, ["onur", "mamadou", "yusuf"]);

  console.log("Menajerler kadrolarını kuruyor…");
  await buildSquads(gw1.id, random);

  console.log("Kadrolar kilitleniyor…");
  await mutate((draft) => {
    const gw = draft.gameweeks.find((g) => g.id === gw1.id)!;
    gw.status = "locked";
  });

  console.log("Takımlar giriliyor (22 kişi, iki takım, kaptanlar)…");
  state = await readState();
  const pool = state.players.filter((p) => p.active).map((p) => p.id);
  // Kaleciler önce: her takıma bir kaleci düşsün.
  const keepers = ["talha", "yusuf"];
  const others = shuffle(
    pool.filter((id) => !keepers.includes(id)),
    random,
  ).slice(0, 20);
  const teamA = [keepers[0], ...others.slice(0, 10)];
  const teamB = [keepers[1], ...others.slice(10)];

  await saveTeams(gw1.id, {
    teamAIds: teamA,
    teamBIds: teamB,
    captainIds: [teamA[3], teamB[5]],
  });

  console.log("2. hafta kampanyası belirleniyor…");
  state = await readState();
  const gw2 = openGameweek(state);
  if (gw2) await setPromos(gw2.id, ["alper", "arda-barin", "direnc"]);

  console.log("Maç oynanıyor, reytingler giriliyor…");
  const calledUp = [...teamA, ...teamB];
  const stats: PlayerMatchStat[] = calledUp.map((playerId) => {
    const team: "A" | "B" = teamA.includes(playerId) ? "A" : "B";
    const keptGoal = keepers.includes(playerId);
    // Kadroya girip maça gelmeyenler: nadir ama var.
    const played = random() > 0.06;
    return {
      playerId,
      played,
      keptGoal: played && keptGoal,
      team,
      goals: played && !keptGoal && random() > 0.72 ? 1 + Math.floor(random() * 2) : 0,
      rating: played ? Math.round((4.5 + random() * 5) * 2) / 2 : 0,
    };
  });
  const goals = stats.reduce((sum, s) => sum + s.goals, 0);
  const scoreA = Math.max(1, Math.round(goals * 0.55));
  const scoreB = Math.max(1, goals - scoreA);
  const best = stats
    .filter((s) => s.played)
    .sort((a, b) => b.rating - a.rating)[0];

  await saveStats(gw1.id, {
    scoreA,
    scoreB,
    mvpPlayerId: best?.playerId ?? null,
    stats,
  });

  console.log("1. hafta tamamlanıyor, fiyatlar güncelleniyor…");
  await completeGameweek(gw1.id);

  console.log("2. hafta için kadrolar kuruluyor…");
  state = await readState();
  const openNow = openGameweek(state);
  if (openNow) await buildSquads(openNow.id, random);

  report(await readState());
}

async function buildSquads(gameweekId: string, random: () => number) {
  const state = await readState();
  const gw = state.gameweeks.find((g) => g.id === gameweekId)!;

  for (const manager of state.managers) {
    const formation = FORMATIONS[Math.floor(random() * FORMATIONS.length)];
    const picks = autoPickSquad(formation.id, state.players, gw, state.config);
    await mutate((draft) => {
      const existing = draft.squads.find(
        (s) => s.gameweekId === gameweekId && s.managerId === manager.id,
      );
      const squad = {
        id: `sq-${gameweekId}-${manager.id}`,
        gameweekId,
        managerId: manager.id,
        formationId: formation.id,
        picks,
        source: "manual" as const,
        updatedAt: new Date().toISOString(),
      };
      if (existing) Object.assign(existing, squad);
      else draft.squads.push(squad);
    });
  }
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function report(state: LeagueState) {
  const done = state.gameweeks.filter((g) => g.status === "completed");
  console.log("\n─────────────────────────────────────────");
  console.log(`Menajer          : ${state.managers.length}`);
  console.log(`Oyuncu           : ${state.players.length}`);
  console.log(`Tamamlanan hafta : ${done.length}`);
  console.log(`Kadro            : ${state.squads.length}`);
  const open = openGameweek(state);
  if (open) {
    console.log(`Açık hafta       : ${open.number}. hafta`);
    console.log(`Kampanya         : ${open.promoPlayerIds.join(", ")}`);
  }
  console.log("─────────────────────────────────────────");
  console.log("GİRİŞ:  /giris");
  console.log("  İsim: Göktuğ    Şifre: Göktuğ");
  console.log("  (demo hesaplarının hepsinde şifre = kendi ismi)");
  console.log("ADMİN:  /admin/giris  → .env.local içindeki bilgiler");
}

async function reset() {
  await resetState(initialState());
  console.log("Lig sıfırlandı. Hesap yok, 1. hafta açık.");
}

const mode = process.argv[2];
const run = mode === "reset" ? reset : seedDemo;
run().catch((error) => {
  console.error(error);
  process.exit(1);
});
