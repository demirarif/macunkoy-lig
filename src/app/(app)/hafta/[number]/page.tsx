import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireManager } from "@/lib/auth/current";
import { playerMap, squadFor } from "@/lib/db/state";
import { gameweekResults } from "@/lib/services/standings";
import { formatDateTimeTR } from "@/lib/time";
import { Badge, EmptyState, Panel, SectionTitle } from "@/components/Ui";
import { PlayerCard } from "@/components/PlayerCard";
import { ScoreBreakdown, type BreakdownRow } from "./ScoreBreakdown";
import type { Gameweek, GameweekStatus, Player } from "@/lib/domain/types";
import type { LeagueState } from "@/lib/db/state";
import type { ScoringConfig } from "@/lib/domain/rules";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  return { title: `${number}. Hafta` };
}

export default async function HaftaPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { state, manager } = await requireManager();
  const { number } = await params;
  const gw = state.gameweeks.find((g) => g.number === Number(number));
  if (!gw) notFound();

  const players = playerMap(state);
  const squad = squadFor(state, gw.id, manager.id);
  const onPitch = new Set(gw.calledUpIds);

  const header = (
    <header>
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-chalk">
          {gw.number}. Hafta
        </h1>
        <StatusBadge status={gw.status} />
      </div>
      <p className="mt-1 text-xs text-chalk-faint">
        Maç {formatDateTimeTR(gw.matchAt)}
        {gw.scoreA !== null && ` · A ${gw.scoreA} - ${gw.scoreB} B`}
      </p>
    </header>
  );

  if (gw.status === "holiday") {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {header}
        <EmptyState title="Bu hafta maç yoktu">
          Kimse puan almadı, tablo olduğu gibi kaldı.
        </EmptyState>
      </div>
    );
  }

  if (gw.status === "open" || gw.status === "locked") {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {header}
        <EmptyState title="Takımlar henüz girilmedi">
          {gw.status === "open"
            ? "Kadrolar hâlâ açık. Takımlar girilince burası dolacak."
            : "Kadrolar kilitlendi. Admin takımları girince kimlerin sahaya çıktığını göreceksin."}
        </EmptyState>
        <Link
          href="/kadro"
          className="block rounded-xl bg-ink-800 py-3 text-center text-sm font-bold uppercase tracking-wide text-chalk-dim"
        >
          Kadroma dön
        </Link>
      </div>
    );
  }

  // --- Takımlar girildi, maç henüz puanlanmadı ---
  if (gw.status === "teams") {
    const picks = squad?.picks ?? [];
    const hits = picks.filter((p) => onPitch.has(p.playerId)).length;

    return (
      <div className="mx-auto max-w-3xl space-y-5">
        {header}
        {picks.length > 0 ? (
          <Panel>
            <SectionTitle hint="Kadron kilitlendikten sonra takımlar girildi">
              Kadrondan {hits} / {picks.length} kişi sahada
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              {picks.map((pick) => {
                const p = players.get(pick.playerId);
                if (!p) return null;
                const inGame = onPitch.has(pick.playerId);
                return (
                  <PlayerCard
                    key={pick.playerId}
                    player={p}
                    slot={pick.slot}
                    size="sm"
                    pollStatus={inGame ? "in" : "out"}
                    dimmed={!inGame}
                    isCaptain={gw.captainIds.includes(pick.playerId)}
                    isPromo={gw.promoPlayerIds.includes(pick.playerId)}
                  />
                );
              })}
            </div>
            {hits < picks.length && (
              <p className="mt-4 text-sm text-danger">
                Sahaya çıkmayan {picks.length - hits} oyuncu sana{" "}
                {(picks.length - hits) * state.config.scoring.noShow} puan yazacak.
              </p>
            )}
          </Panel>
        ) : (
          <EmptyState title="Bu hafta kadron yok" />
        )}
        <TeamsPanel gw={gw} players={players} state={state} config={state.config.scoring} />
      </div>
    );
  }

  // --- Hafta tamamlandı: puan dökümü ---
  const results = gameweekResults(state, gw);
  const mine = results.find((r) => r.managerId === manager.id);
  const rows: BreakdownRow[] =
    mine?.score.players.map((breakdown) => {
      const player = players.get(breakdown.playerId);
      return {
        breakdown,
        playerName: player?.name ?? breakdown.playerId,
        playerPrice: player?.price ?? 0,
      };
    }) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {header}

      {gw.mvpPlayerId && players.get(gw.mvpPlayerId) && (
        <Panel className="flex items-center gap-4 border border-flare/25">
          <PlayerCard player={players.get(gw.mvpPlayerId)!} size="sm" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-flare">
              Maçın adamı
            </p>
            <p className="text-2xl font-black uppercase leading-tight text-chalk">
              {players.get(gw.mvpPlayerId)?.name}
            </p>
            <p className="text-xs text-chalk-faint">
              +{state.config.scoring.mvp} puan · onu seçen herkese
            </p>
          </div>
        </Panel>
      )}

      {mine ? (
        <Panel>
          <SectionTitle hint="Satıra dokunarak puanın nereden geldiğini gör">
            Kadronun puanı
          </SectionTitle>
          <ScoreBreakdown rows={rows} total={mine.score.total} />
        </Panel>
      ) : (
        <EmptyState title="Bu hafta kadron yoktu" />
      )}

      <Panel>
        <SectionTitle hint={`${results.length} menajer`}>Haftanın sıralaması</SectionTitle>
        <ol className="space-y-1">
          {results.map((result, i) => (
            <li
              key={result.managerId}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2 ${
                result.managerId === manager.id ? "bg-neon/10 ring-1 ring-neon/30" : ""
              }`}
            >
              <span className="w-5 text-sm font-black tabular text-chalk-faint">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-chalk">
                  {result.teamName ?? result.playerName}
                  {i === 0 && (
                    <span className="ml-1.5 text-[10px] text-flare">HAFTANIN MENAJERİ</span>
                  )}
                </span>
                {result.teamName && (
                  <span className="block truncate text-[11px] text-chalk-faint">
                    {result.playerName}
                  </span>
                )}
              </span>
              <span
                className={`text-base font-black tabular ${
                  result.score.total >= 0 ? "text-chalk" : "text-danger"
                }`}
              >
                {result.score.total}
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <TeamsPanel gw={gw} players={players} state={state} config={state.config.scoring} />
    </div>
  );
}

function StatusBadge({ status }: { status: GameweekStatus }) {
  const map = {
    open: { tone: "good" as const, label: "Kadro açık" },
    locked: { tone: "warn" as const, label: "Kilitli" },
    teams: { tone: "cool" as const, label: "Takımlar belli" },
    completed: { tone: "neutral" as const, label: "Tamamlandı" },
    holiday: { tone: "bad" as const, label: "Maç yok" },
  };
  const entry = map[status];
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

function TeamsPanel({
  gw,
  players,
  state,
  config,
}: {
  gw: Gameweek;
  players: Map<string, Player>;
  state: LeagueState;
  config: ScoringConfig;
}) {
  if (gw.calledUpIds.length === 0) return null;
  const keepers = new Set(gw.stats.filter((s) => s.keptGoal).map((s) => s.playerId));

  const team = (ids: string[], label: string, score: number | null, color: string) => (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className={`text-sm font-black uppercase tracking-widest ${color}`}>{label}</h3>
        {score !== null && (
          <span className="text-2xl font-black tabular text-chalk">{score}</span>
        )}
      </div>
      <ul className="space-y-0.5">
        {ids.map((id) => {
          const stat = gw.stats.find((s) => s.playerId === id);
          return (
            <li key={id} className="flex items-center gap-2 text-sm">
              <Link
                href={`/oyuncu/${id}`}
                className="min-w-0 flex-1 truncate text-chalk-dim hover:text-chalk"
              >
                {players.get(id)?.name ?? id}
              </Link>
              {gw.captainIds.includes(id) && (
                <span className="shrink-0 text-[10px] font-black text-flare">K</span>
              )}
              {keepers.has(id) && (
                <span className="shrink-0 text-[10px] font-black text-sky-cool">KALE</span>
              )}
              {stat && stat.goals > 0 && (
                <span className="shrink-0 text-xs text-chalk-dim">⚽{stat.goals}</span>
              )}
              {stat?.played && (
                <span className="shrink-0 text-xs font-bold tabular text-chalk">
                  {stat.rating.toFixed(1)}
                </span>
              )}
              {stat && !stat.played && (
                <span className="shrink-0 text-[10px] font-black text-danger">GELMEDİ</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  const notPlaying = state.players.filter(
    (p) => p.active && !gw.calledUpIds.includes(p.id),
  ).length;

  return (
    <Panel>
      <SectionTitle
        hint={`${gw.calledUpIds.length} kişi sahada · ${notPlaying} kişi dışarıda (${config.noShow} puan)`}
      >
        Sahadaki kadrolar
      </SectionTitle>
      <div className="grid gap-5 sm:grid-cols-2">
        {team(gw.teamAIds, "A Takımı", gw.scoreA, "text-neon")}
        {team(gw.teamBIds, "B Takımı", gw.scoreB, "text-sky-cool")}
      </div>
    </Panel>
  );
}
