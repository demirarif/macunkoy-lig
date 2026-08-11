import type { Metadata } from "next";
import Link from "next/link";
import { requireManager } from "@/lib/auth/current";
import { currentGameweek, lastCompletedGameweek, openGameweek, squadFor } from "@/lib/db/state";
import { EmptyState, Panel, SectionTitle } from "@/components/Ui";
import {
  computeStandings,
  ownershipFor,
  playerSeasonStats,
  playerYields,
} from "@/lib/services/standings";
import { formatDateTimeTR, serverNow } from "@/lib/time";
import { SquadBuilder } from "./SquadBuilder";
import type { MeStats } from "./MePanel";

export const metadata: Metadata = { title: "Kadrom" };

export default async function KadroPage() {
  const { state, manager, player } = await requireManager();
  const gw = openGameweek(state);

  if (!gw) {
    const latest = currentGameweek(state);
    return (
      <Panel>
        <SectionTitle hint={`${latest.number}. hafta`}>Kadro kurma kapalı</SectionTitle>
        <EmptyState title="Şu anda kadro kurulamaz">
          {latest.status === "holiday"
            ? "Bu hafta maç yok. Sonraki hafta açılınca burası dolacak."
            : "Kadrolar kilitlendi. Maç oynanıp sonuçlar girilince yeni hafta açılacak."}
        </EmptyState>
        <Link
          href="/fikstur"
          className="mt-3 block rounded-xl bg-ink-800 py-3 text-center text-sm font-bold uppercase tracking-wide text-chalk-dim"
        >
          Fikstüre bak
        </Link>
      </Panel>
    );
  }

  const squad = squadFor(state, gw.id, manager.id);
  const now = await serverNow();

  const standings = computeStandings(state);
  const myRow = standings.find((r) => r.managerId === manager.id);
  const myYield = playerYields(state).find((y) => y.playerId === player.id);
  const mySeason = playerSeasonStats(state, player.id);
  const lastCompleted = lastCompletedGameweek(state);
  const ownership = lastCompleted
    ? (ownershipFor(state, lastCompleted.id).get(player.id) ?? 0)
    : 0;

  const meStats: MeStats = {
    rank: myRow?.rank ?? null,
    totalPoints: myRow?.totalPoints ?? 0,
    lastWeekPoints: myRow?.lastWeekPoints ?? null,
    bestWeek: myRow?.bestWeek ?? 0,
    managerCount: standings.length,
    yieldPerWeek: myYield?.perWeek ?? 0,
    ownership,
    averageRating: mySeason.averageRating,
    goals: mySeason.goals,
    appearances: mySeason.appearances,
  };

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-chalk">
            {gw.number}. Hafta Kadrosu
          </h1>
          <p className="mt-1 text-xs text-chalk-faint">
            Maç {formatDateTimeTR(gw.matchAt)} · son kadro değişikliği{" "}
            {formatDateTimeTR(gw.lockAt)}
          </p>
        </div>
      </header>

      <SquadBuilder
        players={state.players.filter((p) => p.active)}
        me={player}
        meStats={meStats}
        displayName={manager.teamName ?? player.name}
        budget={state.config.budget}
        promoIds={gw.promoPlayerIds}
        promoDiscount={state.config.scoring.promoDiscount}
        initialFormationId={squad?.formationId ?? "denge"}
        initialPicks={squad?.picks ?? []}
        lockAt={gw.lockAt}
        serverNow={now}
        gameweekNumber={gw.number}
        wasRollover={squad?.source === "rollover"}
      />
    </div>
  );
}
