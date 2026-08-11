import type { Metadata } from "next";
import { requireManager } from "@/lib/auth/current";
import { completedGameweeks, playerYields } from "@/lib/services/standings";
import { EmptyState, Stat } from "@/components/Ui";
import { YieldTable } from "@/components/YieldTable";

export const metadata: Metadata = { title: "Oyuncu Puanları" };

export default async function PuanlarPage() {
  const { state, player } = await requireManager();
  const rows = playerYields(state);
  const weeks = completedGameweeks(state);
  const me = rows.find((r) => r.playerId === player.id);
  const myRank = rows.findIndex((r) => r.playerId === player.id) + 1;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-chalk">
          Kim Kaç Puan Getiriyor
        </h1>
        <p className="mt-1 text-xs text-chalk-faint">
          Bir oyuncuyu kadrona koysaydın o hafta kaç puan alırdın. Kaptan ve kampanya
          çarpanları hariç, ham getiri.
        </p>
      </header>

      {weeks.length === 0 ? (
        <EmptyState title="Henüz tamamlanmış hafta yok">
          İlk hafta tamamlandığında bu tablo dolmaya başlayacak.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat
              label="Senin getirin"
              value={me ? `${me.perWeek > 0 ? "+" : ""}${me.perWeek}` : "—"}
              sub="haftalık"
              tone={me && me.perWeek >= 0 ? "good" : "bad"}
            />
            <Stat
              label="Sıran"
              value={myRank > 0 ? `${myRank}.` : "—"}
              sub={`${rows.length} oyuncu`}
            />
            <Stat label="Hafta" value={weeks.length} sub="hesaba katıldı" />
          </div>

          <YieldTable rows={rows} />
        </>
      )}
    </div>
  );
}
