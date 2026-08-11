import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current";
import { formatDateTimeTR } from "@/lib/time";
import { WeekEditor } from "./WeekEditor";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  return { title: `${number}. Hafta · Admin` };
}

export default async function AdminHaftaPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const state = await requireAdmin();
  const { number } = await params;
  const gw = state.gameweeks.find((g) => g.number === Number(number));
  if (!gw) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <Link
          href="/admin"
          className="text-[11px] font-bold uppercase tracking-widest text-chalk-faint hover:text-chalk-dim"
        >
          ← Akış
        </Link>
        <h1 className="mt-1 text-3xl font-black uppercase leading-none tracking-tight text-chalk">
          {gw.number}. Hafta
        </h1>
        <p className="mt-1 text-xs text-chalk-faint">
          Maç {formatDateTimeTR(gw.matchAt)} · kadrolar {formatDateTimeTR(gw.lockAt)}
          &apos;te kilitlendi
        </p>
      </header>

      <WeekEditor
        gameweekId={gw.id}
        gameweekNumber={gw.number}
        status={gw.status}
        players={state.players.filter((p) => p.active)}
        captainCount={state.config.scoring.captainCount}
        promoCount={state.config.scoring.promoCount}
        initial={{
          teamAIds: gw.teamAIds,
          teamBIds: gw.teamBIds,
          captainIds: gw.captainIds,
          promoPlayerIds: gw.promoPlayerIds,
          scoreA: gw.scoreA,
          scoreB: gw.scoreB,
          mvpPlayerId: gw.mvpPlayerId,
          stats: gw.stats,
        }}
      />
    </div>
  );
}
