import Link from "next/link";
import { requireManager } from "@/lib/auth/current";
import { currentGameweek, lastCompletedGameweek, playerMap, squadFor } from "@/lib/db/state";
import { effectivePrice } from "@/lib/domain/scoring";
import type { Gameweek } from "@/lib/domain/types";
import { computeStandings, gameweekResults } from "@/lib/services/standings";
import { formatDateTimeTR, serverNow } from "@/lib/time";
import { Countdown } from "@/components/Countdown";
import { PlayerCard } from "@/components/PlayerCard";
import { Badge, EmptyState, Panel, SectionTitle, Stat } from "@/components/Ui";

export default async function DashboardPage() {
  const { state, manager, player } = await requireManager();
  const gw = currentGameweek(state);
  const players = playerMap(state);
  const squad = squadFor(state, gw.id, manager.id);
  const settled = lastCompletedGameweek(state);
  const standings = computeStandings(state);
  const myRow = standings.find((r) => r.managerId === manager.id);
  const now = await serverNow();

  const myLastResult = settled
    ? gameweekResults(state, settled).find((r) => r.managerId === manager.id)
    : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Hero
        gw={gw}
        now={now}
        hasSquad={Boolean(squad && squad.source === "manual")}
        teamName={manager.teamName ?? player.name}
        playerName={player.name}
      />

      {gw.status === "open" && gw.promoPlayerIds.length > 0 && (
        <Panel>
          <SectionTitle hint="%40 indirimli ve puanı 1.5 katı. Sadece bu hafta.">
            Bu haftanın kampanyası
          </SectionTitle>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {gw.promoPlayerIds.map((id) => {
              const p = players.get(id);
              if (!p) return null;
              return (
                <PlayerCard
                  key={id}
                  player={p}
                  size="md"
                  isPromo
                  displayPrice={effectivePrice(p, gw, state.config.scoring)}
                />
              );
            })}
          </div>
        </Panel>
      )}

      {gw.status === "teams" && (
        <Panel className="border border-neon/30">
          <SectionTitle hint={`${gw.calledUpIds.length} kişi sahaya çıkıyor`}>
            Takımlar belli
          </SectionTitle>
          <p className="mb-3 text-sm text-chalk-dim">
            {gw.number}. haftanın kadroları girildi. Senin kadrondan kaç kişi sahada, gör.
          </p>
          <Link
            href={`/hafta/${gw.number}`}
            className="block rounded-xl bg-neon py-3 text-center text-sm font-black uppercase tracking-widest text-ink-950"
          >
            Kadroma bak
          </Link>
        </Panel>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Toplam"
          value={myRow?.totalPoints ?? 0}
          sub={`${myRow?.weeksPlayed ?? 0} hafta`}
          tone={(myRow?.totalPoints ?? 0) >= 0 ? "neutral" : "bad"}
        />
        <Stat
          label="Sıra"
          value={myRow ? `${myRow.rank}.` : "—"}
          sub={`${standings.length} menajer`}
        />
        <Stat
          label="Geçen hafta"
          value={myLastResult ? myLastResult.score.total : "—"}
          sub={settled ? `${settled.number}. hafta` : "henüz yok"}
          tone={
            myLastResult ? (myLastResult.score.total >= 0 ? "good" : "bad") : "neutral"
          }
        />
        <Stat label="En iyi hafta" value={myRow?.bestWeek ?? 0} />
      </div>

      {squad ? (
        <Panel>
          <SectionTitle
            hint={
              squad.source === "rollover"
                ? "Kadro kurmadın, geçen haftaki takımın devretti."
                : `${gw.number}. hafta için kurduğun kadro`
            }
            action={
              gw.status === "open" && (
                <Link
                  href="/kadro"
                  className="rounded-lg bg-ink-800 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-chalk-dim ring-1 ring-ink-700"
                >
                  Düzenle
                </Link>
              )
            }
          >
            Kadron
          </SectionTitle>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {squad.picks.map((pick) => {
              const p = players.get(pick.playerId);
              if (!p) return null;
              return (
                <PlayerCard
                  key={pick.playerId}
                  player={p}
                  slot={pick.slot}
                  size="sm"
                  isPromo={gw.promoPlayerIds.includes(pick.playerId)}
                  isCaptain={gw.captainIds.includes(pick.playerId)}
                  displayPrice={effectivePrice(p, gw, state.config.scoring)}
                />
              );
            })}
          </div>
        </Panel>
      ) : gw.status === "open" ? (
        <Link href="/kadro" className="block">
          <EmptyState title="Henüz kadro kurmadın">
            Son saate kadar 7 kişini seç; kurmazsan geçen haftaki takımın otomatik devreder.
          </EmptyState>
        </Link>
      ) : null}

      <Panel>
        <SectionTitle
          action={
            <Link
              href="/lig"
              className="text-xs font-bold uppercase tracking-wide text-neon"
            >
              Tümü
            </Link>
          }
        >
          Lig tablosu
        </SectionTitle>
        {standings.length === 0 ? (
          <EmptyState title="Henüz kimse katılmadı" />
        ) : (
          <ol className="space-y-1">
            {standings.slice(0, 5).map((row) => (
              <li
                key={row.managerId}
                className={`flex items-center gap-3 rounded-lg px-2.5 py-2 ${
                  row.managerId === manager.id ? "bg-neon/10 ring-1 ring-neon/30" : ""
                }`}
              >
                <span className="w-5 text-sm font-black tabular text-chalk-faint">
                  {row.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-chalk">
                    {row.teamName ?? row.playerName}
                  </span>
                  <span className="block truncate text-[11px] text-chalk-faint">
                    {row.playerName}
                  </span>
                </span>
                <span className="text-base font-black tabular text-chalk">
                  {row.totalPoints}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}

function Hero({
  gw,
  now,
  hasSquad,
  teamName,
  playerName,
}: {
  gw: Gameweek;
  now: number;
  hasSquad: boolean;
  teamName: string;
  playerName: string;
}) {
  const statusBadge = {
    open: <Badge tone="good">Kadro kurulabilir</Badge>,
    locked: <Badge tone="warn">Kadrolar kilitli</Badge>,
    teams: <Badge tone="cool">Takımlar belli</Badge>,
    completed: <Badge>Hafta tamamlandı</Badge>,
    holiday: <Badge tone="bad">Bu hafta maç yok</Badge>,
  }[gw.status];

  return (
    <Panel className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-neon/10 blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-chalk-faint">
              {gw.number}. Hafta
            </p>
            <h1 className="text-2xl font-black uppercase leading-tight tracking-tight text-chalk">
              {teamName}
            </h1>
            <p className="text-xs text-chalk-faint">{playerName}</p>
          </div>
          {statusBadge}
        </div>

        {gw.status === "open" && (
          <div className="mt-4 rounded-xl bg-ink-950/60 p-3.5">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-chalk-faint">
              Kilide kalan
            </p>
            <Countdown targetIso={gw.lockAt} serverNow={now} />
            <p className="mt-2 text-[11px] text-chalk-faint">
              Son değişiklik {formatDateTimeTR(gw.lockAt)}
            </p>
            {!hasSquad && (
              <Link
                href="/kadro"
                className="mt-3 block rounded-lg bg-neon py-2.5 text-center text-sm font-black uppercase tracking-widest text-ink-950"
              >
                Kadronu kur
              </Link>
            )}
          </div>
        )}

        {gw.status === "holiday" && (
          <p className="mt-4 rounded-xl bg-ink-950/60 p-3.5 text-sm text-chalk-dim">
            Bu hafta maç yok. Tablo dondu, kimse puan almıyor. Sonraki hafta kaldığı
            yerden devam edecek.
          </p>
        )}

        {gw.status === "locked" && (
          <p className="mt-4 rounded-xl bg-ink-950/60 p-3.5 text-sm text-chalk-dim">
            Kadrolar kilitlendi. Bu haftanın takımları girilince kadrondan kaç kişinin
            sahaya çıktığını göreceksin.
          </p>
        )}
      </div>
    </Panel>
  );
}
