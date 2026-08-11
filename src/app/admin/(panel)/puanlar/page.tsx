import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/current";
import { completedGameweeks, computeStandings, playerYields } from "@/lib/services/standings";
import { EmptyState, Panel, SectionTitle, Stat } from "@/components/Ui";
import { YieldTable } from "@/components/YieldTable";

export const metadata: Metadata = { title: "Puanlar · Admin" };

export default async function AdminPuanlarPage() {
  const state = await requireAdmin();
  const rows = playerYields(state);
  const weeks = completedGameweeks(state);
  const standings = computeStandings(state);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-chalk">
          Puanlar
        </h1>
        <p className="mt-1 text-xs text-chalk-faint">
          Oyuncu bazlı getiri ve menajer sıralaması
        </p>
      </header>

      {weeks.length === 0 ? (
        <EmptyState title="Henüz tamamlanmış hafta yok">
          Bir haftayı tamamladığında tablolar dolmaya başlayacak.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Hafta" value={weeks.length} sub="tamamlandı" />
            <Stat label="Menajer" value={standings.length} />
            <Stat
              label="En iyi getiri"
              value={rows[0]?.perWeek ?? "—"}
              sub={rows[0]?.name}
              tone="good"
            />
          </div>

          <Panel>
            <SectionTitle hint="Menajerlerin kümülatif puanları">Lig tablosu</SectionTitle>
            <ol className="space-y-1">
              {standings.map((row) => (
                <li
                  key={row.managerId}
                  className="flex items-center gap-3 rounded-lg bg-ink-850/60 px-3 py-2"
                >
                  <span className="w-5 text-sm font-black tabular text-chalk-faint">
                    {row.rank}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-chalk">
                      {row.teamName ?? row.playerName}
                    </span>
                    <span className="block text-[10px] text-chalk-faint">
                      {row.weeksPlayed} hafta · en iyi {row.bestWeek}
                    </span>
                  </span>
                  <span className="text-base font-black tabular text-chalk">
                    {row.totalPoints}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel>
            <SectionTitle hint="Kaptan ve kampanya çarpanları hariç ham getiri">
              Oyuncu bazlı puanlama
            </SectionTitle>
            <YieldTable rows={rows} linkPlayers={false} />
          </Panel>
        </>
      )}
    </div>
  );
}
