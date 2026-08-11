"use client";

import Link from "next/link";
import { PlayerCard } from "@/components/PlayerCard";
import { SLOT_LABEL_LONG, type Player } from "@/lib/domain/types";
import { TIER_STYLES, tierFor } from "@/lib/ui/tiers";

export interface MeStats {
  rank: number | null;
  totalPoints: number;
  lastWeekPoints: number | null;
  bestWeek: number;
  managerCount: number;
  /** Bu oyuncunun (yani senin) sahada ürettiği ortalama haftalık puan. */
  yieldPerWeek: number;
  ownership: number;
  averageRating: number | null;
  goals: number;
  appearances: number;
}

/**
 * Sol panel: "ben".
 *
 * İki kimlik aynı anda burada: menajer olarak sıralaman ve futbolcu olarak
 * ne kadar puan ürettiğin. Grubun en çok bakacağı yer ikincisi olacak.
 */
export function MePanel({
  player,
  stats,
  displayName,
}: {
  player: Player;
  stats: MeStats;
  displayName: string;
}) {
  const tier = TIER_STYLES[tierFor(player.price)];

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 lg:flex-col lg:items-stretch">
        <div className="shrink-0 self-center">
          <PlayerCard player={player} size="md" />
        </div>

        <div className="min-w-0 flex-1 lg:text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neon">
            Menajer
          </p>
          <h2 className="truncate text-2xl font-black uppercase leading-none tracking-tight text-chalk">
            {displayName}
          </h2>
          <p className="mt-0.5 text-[11px] text-chalk-faint">
            {player.slots.map((s) => SLOT_LABEL_LONG[s]).join(" · ")}
          </p>
          <p className="mt-1.5 text-[11px] font-bold" style={{ color: tier.accent }}>
            {tier.label}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 lg:grid-cols-2">
        <Cell
          label="Sıra"
          value={stats.rank ? `${stats.rank}.` : "—"}
          sub={`${stats.managerCount} menajer`}
        />
        <Cell label="Toplam" value={stats.totalPoints} tone={stats.totalPoints >= 0 ? "good" : "bad"} />
        <Cell
          label="Geçen hafta"
          value={stats.lastWeekPoints ?? "—"}
          tone={
            stats.lastWeekPoints === null
              ? "neutral"
              : stats.lastWeekPoints >= 0
                ? "good"
                : "bad"
          }
        />
        <Cell label="En iyi hafta" value={stats.bestWeek} />
      </div>

      <div className="rounded-xl bg-ink-850/70 p-3 edge-light">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-chalk-faint">
          Futbolcu olarak sen
        </p>
        <dl className="space-y-1.5 text-xs">
          <Line
            label="Haftalık getirin"
            value={`${stats.yieldPerWeek > 0 ? "+" : ""}${stats.yieldPerWeek}`}
            tone={stats.yieldPerWeek >= 0 ? "good" : "bad"}
          />
          <Line label="Seni seçenler" value={`%${stats.ownership}`} />
          <Line
            label="Ortalama reyting"
            value={stats.averageRating?.toFixed(1) ?? "—"}
          />
          <Line label="Gol" value={String(stats.goals)} />
          <Line label="Maç" value={String(stats.appearances)} />
        </dl>
        <Link
          href={`/oyuncu/${player.id}`}
          className="mt-2.5 block rounded-lg bg-ink-800 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-chalk-dim hover:bg-ink-700"
        >
          Kartıma bak
        </Link>
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const color =
    tone === "good" ? "text-neon" : tone === "bad" ? "text-danger" : "text-chalk";
  return (
    <div className="rounded-lg bg-ink-850/70 px-2 py-1.5 edge-light">
      <div className="text-[9px] font-black uppercase tracking-widest text-chalk-faint">
        {label}
      </div>
      <div className={`text-lg font-black leading-tight tabular ${color}`}>{value}</div>
      {sub && <div className="text-[9px] text-chalk-faint">{sub}</div>}
    </div>
  );
}

function Line({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const color =
    tone === "good" ? "text-neon" : tone === "bad" ? "text-danger" : "text-chalk";
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-chalk-faint">{label}</dt>
      <dd className={`font-black tabular ${color}`}>{value}</dd>
    </div>
  );
}
