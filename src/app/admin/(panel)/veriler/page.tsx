import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/current";
import { playerMap } from "@/lib/db/state";
import { seasonMatrix, weekReport } from "@/lib/services/reports";
import { formatShortTR } from "@/lib/time";
import { EmptyState } from "@/components/Ui";
import { ReportViews, type SerializedReport } from "./ReportViews";

export const metadata: Metadata = { title: "Veriler · Admin" };

export default async function AdminVerilerPage() {
  const state = await requireAdmin();
  const players = playerMap(state);

  // Verisi olan haftalar: takımları girilmiş ya da tamamlanmış olanlar.
  const weeks = state.gameweeks
    .filter((g) => g.status === "teams" || g.status === "completed")
    .sort((a, b) => b.number - a.number);

  if (weeks.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-chalk">
          Veriler
        </h1>
        <EmptyState title="Henüz veri yok">
          Bir haftanın takımlarını girdiğinde maç raporu burada oluşacak.
        </EmptyState>
      </div>
    );
  }

  const reports: Record<number, SerializedReport> = {};
  for (const gw of weeks) {
    const report = weekReport(state, gw);
    reports[gw.number] = {
      teamA: report.teamA,
      teamB: report.teamB,
      outside: report.outside,
      squadCount: report.squadCount,
      totalGoals: report.totalGoals,
      scoreA: gw.scoreA,
      scoreB: gw.scoreB,
      mvpName: gw.mvpPlayerId ? (players.get(gw.mvpPlayerId)?.name ?? null) : null,
      dateLabel: formatShortTR(gw.matchAt),
      status: gw.status,
    };
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-chalk">
          Veriler
        </h1>
        <p className="mt-1 text-xs text-chalk-faint">
          Herkesin her haftaki verisi — maç raporu ve sezonun tamamı tek tabloda
        </p>
      </header>

      <ReportViews
        weeks={weeks.map((g) => ({
          number: g.number,
          status: g.status,
          scoreA: g.scoreA,
          scoreB: g.scoreB,
          dateLabel: formatShortTR(g.matchAt),
        }))}
        reports={reports}
        matrix={seasonMatrix(state)}
      />
    </div>
  );
}
