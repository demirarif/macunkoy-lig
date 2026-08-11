import type { Metadata } from "next";
import Link from "next/link";
import { requireManager } from "@/lib/auth/current";
import { computeStandings, completedGameweeks } from "@/lib/services/standings";
import { Badge, EmptyState, Panel, SectionTitle } from "@/components/Ui";
import { formatShortTR } from "@/lib/time";

export const metadata: Metadata = { title: "Lig" };

export default async function LigPage() {
  const { state, manager } = await requireManager();
  const standings = computeStandings(state);
  const weeks = completedGameweeks(state).reverse();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-chalk">
          Lig Tablosu
        </h1>
        <p className="mt-1 text-xs text-chalk-faint">
          {state.seasonName} · {weeks.length} hafta oynandı · {standings.length} menajer
        </p>
      </header>

      {standings.length === 0 ? (
        <EmptyState title="Henüz kimse katılmadı">
          Arkadaşların giriş yapıp kadro kurunca tablo dolmaya başlayacak.
        </EmptyState>
      ) : (
        <Panel className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-800 text-[10px] uppercase tracking-widest text-chalk-faint">
                <th className="py-2.5 pl-3 text-left font-bold">#</th>
                <th className="py-2.5 text-left font-bold">Menajer</th>
                <th className="py-2.5 text-right font-bold">Son</th>
                <th className="py-2.5 pr-3 text-right font-bold">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => {
                const isMe = row.managerId === manager.id;
                const move =
                  row.previousRank === null ? 0 : row.previousRank - row.rank;
                return (
                  <tr
                    key={row.managerId}
                    className={`border-b border-ink-850/60 last:border-0 ${
                      isMe ? "bg-neon/[0.07]" : ""
                    }`}
                  >
                    <td className="py-2.5 pl-3">
                      <span className="flex items-center gap-1">
                        <span className="text-sm font-black tabular text-chalk-dim">
                          {row.rank}
                        </span>
                        {move !== 0 && (
                          <span
                            className={`text-[9px] font-black ${
                              move > 0 ? "text-neon" : "text-danger"
                            }`}
                            title={`${Math.abs(move)} sıra ${move > 0 ? "yükseldi" : "düştü"}`}
                          >
                            {move > 0 ? "▲" : "▼"}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2">
                      <span className="block truncate text-sm font-bold text-chalk">
                        {row.teamName ?? row.playerName}
                        {isMe && <span className="ml-1.5 text-[10px] text-neon">SEN</span>}
                      </span>
                      <span className="block truncate text-[11px] text-chalk-faint">
                        {row.teamName ? row.playerName + " · " : ""}en iyi {row.bestWeek}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`text-sm font-bold tabular ${
                          (row.lastWeekPoints ?? 0) > 0
                            ? "text-neon"
                            : (row.lastWeekPoints ?? 0) < 0
                              ? "text-danger"
                              : "text-chalk-faint"
                        }`}
                      >
                        {row.lastWeekPoints ?? "—"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <span className="text-base font-black tabular text-chalk">
                        {row.totalPoints}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      <Panel>
        <SectionTitle hint="Her haftanın sonuçları, kadrolar ve puan dökümleri">
          Haftalar
        </SectionTitle>
        {weeks.length === 0 ? (
          <EmptyState title="Henüz kapanmış hafta yok" />
        ) : (
          <ul className="space-y-1.5">
            {weeks.map((gw) => (
              <li key={gw.id}>
                <Link
                  href={`/hafta/${gw.number}`}
                  className="flex items-center gap-3 rounded-xl bg-ink-850/70 px-3 py-2.5 transition hover:bg-ink-800 edge-light"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-800 text-sm font-black tabular text-chalk-dim">
                    {gw.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-chalk">
                      {gw.scoreA} - {gw.scoreB}
                    </span>
                    <span className="block text-[11px] text-chalk-faint">
                      {formatShortTR(gw.matchAt)} · {gw.calledUpIds.length} kişi
                    </span>
                  </span>
                  <Badge>Detay</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
