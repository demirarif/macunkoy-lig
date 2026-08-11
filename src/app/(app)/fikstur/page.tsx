import type { Metadata } from "next";
import Link from "next/link";
import { requireManager } from "@/lib/auth/current";
import { playerMap } from "@/lib/db/state";
import { gameweekResults } from "@/lib/services/standings";
import { formatDateTimeTR, formatShortTR } from "@/lib/time";
import { Badge, EmptyState, Panel, SectionTitle, Stat } from "@/components/Ui";
import type { Gameweek, GameweekStatus } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Fikstür" };

const STATUS: Record<
  GameweekStatus,
  { tone: "good" | "warn" | "cool" | "neutral" | "bad"; label: string }
> = {
  open: { tone: "good", label: "Kadro açık" },
  locked: { tone: "warn", label: "Kilitli" },
  teams: { tone: "cool", label: "Takımlar belli" },
  completed: { tone: "neutral", label: "Oynandı" },
  holiday: { tone: "bad", label: "Maç yok" },
};

export default async function FiksturPage() {
  const { state, manager } = await requireManager();
  const players = playerMap(state);
  const weeks = [...state.gameweeks].sort((a, b) => b.number - a.number);

  /** Bir haftada benim aldığım puan ve haftadaki sıram. */
  function myWeek(gw: Gameweek) {
    if (gw.status !== "completed") return null;
    const results = gameweekResults(state, gw);
    const index = results.findIndex((r) => r.managerId === manager.id);
    if (index < 0) return null;
    return {
      points: results[index].score.total,
      rank: index + 1,
      of: results.length,
      best: results[0],
    };
  }

  const played = weeks.filter((g) => g.status === "completed");
  const myPoints = played
    .map((gw) => myWeek(gw)?.points ?? 0)
    .reduce((a, b) => Math.round((a + b) * 10) / 10, 0);
  const myBest = played.reduce(
    (best, gw) => Math.max(best, myWeek(gw)?.points ?? -Infinity),
    -Infinity,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-chalk">
          Fikstür
        </h1>
        <p className="mt-1 text-xs text-chalk-faint">
          {state.seasonName} · {played.length} hafta oynandı
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Toplam puanım"
          value={myPoints}
          tone={myPoints >= 0 ? "good" : "bad"}
        />
        <Stat label="En iyi haftam" value={myBest > -Infinity ? myBest : "—"} />
        <Stat label="Oynanan" value={played.length} sub="hafta" />
      </div>

      {weeks.length === 0 ? (
        <EmptyState title="Henüz hafta yok" />
      ) : (
        <ul className="space-y-2.5">
          {weeks.map((gw) => {
            const mine = myWeek(gw);
            const squad = state.squads.find(
              (s) => s.gameweekId === gw.id && s.managerId === manager.id,
            );
            const onPitch = new Set(gw.calledUpIds);
            const hits = squad
              ? squad.picks.filter((p) => onPitch.has(p.playerId)).length
              : null;

            return (
              <li key={gw.id}>
                <Link
                  href={`/hafta/${gw.number}`}
                  className="block rounded-2xl bg-ink-900/70 p-3.5 transition hover:bg-ink-850 edge-light"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-800 text-lg font-black tabular text-chalk-dim">
                      {gw.number}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={STATUS[gw.status].tone}>{STATUS[gw.status].label}</Badge>
                        <span className="text-[11px] text-chalk-faint">
                          {formatShortTR(gw.matchAt)}
                        </span>
                      </div>

                      {gw.status === "completed" && gw.scoreA !== null ? (
                        <p className="mt-1 text-lg font-black leading-tight text-chalk">
                          A <span className="text-neon">{gw.scoreA}</span>
                          <span className="mx-1 text-chalk-faint">-</span>
                          <span className="text-sky-cool">{gw.scoreB}</span> B
                          {gw.mvpPlayerId && (
                            <span className="ml-2 align-middle text-[11px] font-bold text-flare">
                              MVP {players.get(gw.mvpPlayerId)?.name}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-chalk-dim">
                          {gw.status === "open"
                            ? `Kadro son ${formatDateTimeTR(gw.lockAt)}`
                            : gw.status === "holiday"
                              ? "Bu hafta maç oynanmadı"
                              : `${gw.calledUpIds.length} kişi sahada`}
                        </p>
                      )}

                      {hits !== null && gw.status !== "completed" && gw.status !== "holiday" && (
                        <p className="mt-0.5 text-[11px] text-chalk-faint">
                          Kadromdan {hits}/{squad!.picks.length} kişi sahada
                        </p>
                      )}

                      {mine && (
                        <p className="mt-0.5 text-[11px] text-chalk-faint">
                          Haftada {mine.rank}. sıra ({mine.of} menajer) · en iyisi{" "}
                          {mine.best.teamName ?? mine.best.playerName} ile{" "}
                          {mine.best.score.total}
                        </p>
                      )}
                    </div>

                    {mine && (
                      <span className="shrink-0 text-right">
                        <span
                          className={`block text-2xl font-black leading-none tabular ${
                            mine.points >= 0 ? "text-neon" : "text-danger"
                          }`}
                        >
                          {mine.points > 0 ? "+" : ""}
                          {mine.points}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-chalk-faint">
                          puanım
                        </span>
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {played.length > 0 && (
        <Panel>
          <SectionTitle hint="Her haftanın en yüksek puanı">Haftanın menajerleri</SectionTitle>
          <ul className="space-y-1">
            {played
              .slice()
              .reverse()
              .map((gw) => {
                const top = gameweekResults(state, gw)[0];
                if (!top) return null;
                return (
                  <li
                    key={gw.id}
                    className="flex items-center gap-3 rounded-lg bg-ink-850/60 px-3 py-2"
                  >
                    <span className="w-8 shrink-0 text-xs font-black tabular text-chalk-faint">
                      {gw.number}. hf
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-chalk">
                      {top.teamName ?? top.playerName}
                    </span>
                    <span className="shrink-0 text-base font-black tabular text-flare">
                      {top.score.total}
                    </span>
                  </li>
                );
              })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
