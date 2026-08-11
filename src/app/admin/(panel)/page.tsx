import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current";
import { openGameweek } from "@/lib/db/state";
import type { Gameweek, GameweekStatus } from "@/lib/domain/types";
import { formatDateTimeTR } from "@/lib/time";
import { Badge, Panel, SectionTitle, Stat } from "@/components/Ui";
import { GameweekActions } from "./GameweekActions";

export const metadata: Metadata = { title: "Admin" };

const STATUS = {
  open: { tone: "good" as const, label: "Kadro açık" },
  locked: { tone: "warn" as const, label: "Takımlar bekleniyor" },
  teams: { tone: "cool" as const, label: "Maç verisi bekleniyor" },
  completed: { tone: "neutral" as const, label: "Tamamlandı" },
  holiday: { tone: "bad" as const, label: "Maç yok" },
};

export default async function AdminPage() {
  const state = await requireAdmin();
  const weeks = [...state.gameweeks].sort((a, b) => b.number - a.number);
  const open = openGameweek(state);
  const needsTeams = weeks.find((g) => g.status === "locked");
  const needsStats = weeks.find((g) => g.status === "teams");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-chalk">
          Haftalık Akış
        </h1>
        <p className="mt-1 text-xs text-chalk-faint">
          {state.seasonName} · {state.managers.length} menajer ·{" "}
          {state.players.filter((p) => p.active).length} oyuncu
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Menajer" value={state.managers.length} />
        <Stat
          label="Tamamlanan"
          value={state.gameweeks.filter((g) => g.status === "completed").length}
          sub="hafta"
        />
        <Stat label="Açık hafta" value={open ? `${open.number}.` : "—"} />
      </div>

      {needsTeams && (
        <NextStep
          tone="warn"
          title={`${needsTeams.number}. hafta takımları bekleniyor`}
          body="Kadrolar kilitlendi. Sahaya çıkan 22 kişiyi iki takıma böl ve kaptanları seç."
          href={`/admin/hafta/${needsTeams.number}`}
          cta="Takımları gir"
        />
      )}

      {needsStats && (
        <NextStep
          tone="cool"
          title={`${needsStats.number}. hafta maç verisi`}
          body={`Maç ${formatDateTimeTR(needsStats.matchAt)}. Skoru, golleri ve reytingleri girip haftayı tamamla.`}
          href={`/admin/hafta/${needsStats.number}`}
          cta="Maç verisini gir"
        />
      )}

      {!needsTeams && !needsStats && (
        <Panel className="border border-neon/25">
          <SectionTitle hint={open ? `Son ${formatDateTimeTR(open.lockAt)}` : undefined}>
            Yapacak iş yok
          </SectionTitle>
          <p className="text-sm text-chalk-dim">
            {open
              ? `${open.number}. hafta açık, menajerler kadrolarını kuruyor.`
              : "Bekleyen hafta yok."}
          </p>
        </Panel>
      )}

      <Panel>
        <SectionTitle hint="Tamamlanan haftalar kilitlidir, değiştirilemez">
          Fikstür
        </SectionTitle>
        <ul className="space-y-2">
          {weeks.map((gw) => (
            <li key={gw.id} className="rounded-xl bg-ink-850/70 p-3 edge-light">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-chalk">
                      {gw.number}. Hafta
                    </span>
                    <Badge tone={STATUS[gw.status].tone}>{STATUS[gw.status].label}</Badge>
                  </div>
                  <p className="text-[11px] text-chalk-faint">
                    Maç {formatDateTimeTR(gw.matchAt)}
                    {gw.scoreA !== null && ` · ${gw.scoreA}-${gw.scoreB}`}
                    {gw.calledUpIds.length > 0 && ` · ${gw.calledUpIds.length} kişi`}
                  </p>
                </div>
                <Link
                  href={`/admin/hafta/${gw.number}`}
                  className="shrink-0 rounded-lg bg-ink-800 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-chalk-dim ring-1 ring-ink-700"
                >
                  {gw.status === "completed" ? "Gör" : "Düzenle"}
                </Link>
              </div>
              <GameweekActions gameweek={serialize(gw)} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function serialize(gw: Gameweek) {
  return { id: gw.id, number: gw.number, status: gw.status };
}

function NextStep({
  tone,
  title,
  body,
  href,
  cta,
}: {
  tone: "warn" | "cool";
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  const ring = tone === "warn" ? "border-flare/40" : "border-sky-cool/40";
  const button = tone === "warn" ? "bg-flare text-ink-950" : "bg-sky-cool text-ink-950";
  return (
    <Panel className={`border ${ring}`}>
      <SectionTitle>{title}</SectionTitle>
      <p className="mb-3 text-sm text-chalk-dim">{body}</p>
      <Link
        href={href}
        className={`block rounded-xl py-3.5 text-center text-sm font-black uppercase tracking-widest ${button}`}
      >
        {cta}
      </Link>
    </Panel>
  );
}

export type { GameweekStatus };
