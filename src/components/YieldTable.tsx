"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PlayerFigure } from "@/components/PlayerFigure";
import { SLOT_LABEL, type Slot } from "@/lib/domain/types";
import { SLOT_COLORS, TIER_STYLES, tierFor } from "@/lib/ui/tiers";

export interface YieldRow {
  playerId: string;
  name: string;
  price: number;
  slots: string[];
  perWeek: number;
  total: number;
  appearances: number;
  missed: number;
  goals: number;
  averageRating: number | null;
  valueIndex: number;
  ownership: number;
}

type SortKey = "perWeek" | "total" | "valueIndex" | "goals" | "rating" | "ownership";

const SORTS: Array<{ key: SortKey; label: string; hint: string }> = [
  { key: "perWeek", label: "Haftalık", hint: "Haftalık ortalama getiri" },
  { key: "total", label: "Toplam", hint: "Sezon boyu toplam üretim" },
  { key: "valueIndex", label: "Verim", hint: "Fiyat başına getiri — ucuz altın bulmak için" },
  { key: "goals", label: "Gol", hint: "En çok gol atanlar" },
  { key: "rating", label: "Reyting", hint: "Ortalama reytinge göre" },
  { key: "ownership", label: "Seçilme", hint: "En çok kadroya alınanlar" },
];

/**
 * "Kim kaç puan getiriyor" tablosu.
 *
 * Gösterilen puan, oyuncunun kendi mevkisinde ürettiği ham puandır — kaptan ve
 * kampanya çarpanları hariç. Yani "bu oyuncuyu kadroma koysaydım o hafta kaç
 * puan alırdım" sorusunun cevabı.
 */
export function YieldTable({
  rows,
  linkPlayers = true,
}: {
  rows: YieldRow[];
  linkPlayers?: boolean;
}) {
  const [sort, setSort] = useState<SortKey>("perWeek");
  const [query, setQuery] = useState("");
  const [slotFilter, setSlotFilter] = useState<Slot | "ALL">("ALL");

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return rows
      .filter((r) => slotFilter === "ALL" || r.slots.includes(slotFilter))
      .filter((r) => !q || r.name.toLocaleLowerCase("tr").includes(q))
      .sort((a, b) => {
        switch (sort) {
          case "total":
            return b.total - a.total;
          case "valueIndex":
            return b.valueIndex - a.valueIndex;
          case "goals":
            return b.goals - a.goals;
          case "rating":
            return (b.averageRating ?? -1) - (a.averageRating ?? -1);
          case "ownership":
            return b.ownership - a.ownership;
          default:
            return b.perWeek - a.perWeek;
        }
      });
  }, [rows, sort, query, slotFilter]);

  const activeHint = SORTS.find((s) => s.key === sort)?.hint;
  const best = visible[0]?.perWeek ?? 1;

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Oyuncu ara…"
        className="w-full rounded-xl bg-ink-850 px-4 py-2.5 text-sm text-chalk placeholder:text-chalk-faint edge-light"
      />

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        <Chip active={slotFilter === "ALL"} onClick={() => setSlotFilter("ALL")}>
          Hepsi
        </Chip>
        {(["GK", "DEF", "MID", "FWD"] as const).map((s) => (
          <Chip key={s} active={slotFilter === s} onClick={() => setSlotFilter(s)}>
            {SLOT_LABEL[s]}
          </Chip>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {SORTS.map((s) => (
          <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)} tone="flare">
            {s.label}
          </Chip>
        ))}
      </div>
      {activeHint && <p className="text-[11px] text-chalk-faint">{activeHint}</p>}

      <ol className="space-y-1.5">
        {visible.map((row, index) => (
          <li key={row.playerId}>
            <Row row={row} index={index} best={best} linked={linkPlayers} />
          </li>
        ))}
      </ol>

      {visible.length === 0 && (
        <p className="py-8 text-center text-sm text-chalk-faint">
          Bu filtreye uyan oyuncu yok.
        </p>
      )}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  tone = "neon",
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tone?: "neon" | "flare";
}) {
  const activeClass = tone === "neon" ? "bg-neon text-ink-950" : "bg-flare text-ink-950";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition ${
        active ? activeClass : "bg-ink-850 text-chalk-faint"
      }`}
    >
      {children}
    </button>
  );
}

function Row({
  row,
  index,
  best,
  linked,
}: {
  row: YieldRow;
  index: number;
  best: number;
  linked: boolean;
}) {
  const tier = TIER_STYLES[tierFor(row.price)];
  // Getiriyi görsel olarak da okunur yapmak için en iyiye göre oranlı bir çubuk.
  const width = best > 0 ? Math.max(0, Math.min(100, (row.perWeek / best) * 100)) : 0;

  const content = (
    <div className="relative overflow-hidden rounded-xl bg-ink-900/70 px-3 py-2.5 edge-light">
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 bg-neon/[0.08]"
        style={{ width: `${width}%` }}
      />
      <div className="relative flex items-center gap-3">
        <span className="w-5 shrink-0 text-xs font-black tabular text-chalk-faint">
          {index + 1}
        </span>

        <span
          className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg"
          style={{ background: tier.surface, boxShadow: `inset 0 0 0 1px ${tier.border}33` }}
        >
          <PlayerFigure playerId={row.playerId} name={row.name} className="h-full w-full" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-chalk">{row.name}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0 text-[10px] text-chalk-faint">
            <span className="flex gap-1 font-black">
              {row.slots.map((s) => (
                <span key={s} className={SLOT_COLORS[s as Slot].text}>
                  {SLOT_LABEL[s as Slot]}
                </span>
              ))}
            </span>
            <span>{row.appearances} maç</span>
            {row.missed > 0 && <span className="text-danger">{row.missed} yok</span>}
            {row.goals > 0 && <span>{row.goals} gol</span>}
            {row.averageRating !== null && <span>ort {row.averageRating.toFixed(1)}</span>}
            {row.ownership > 0 && <span>%{row.ownership}</span>}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span
            className={`block text-lg font-black leading-none tabular ${
              row.perWeek >= 0 ? "text-neon" : "text-danger"
            }`}
          >
            {row.perWeek > 0 ? "+" : ""}
            {row.perWeek}
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-chalk-faint">
            hafta
          </span>
        </span>

        <span className="hidden shrink-0 text-right sm:block">
          <span className="block text-sm font-black tabular text-chalk-dim">{row.total}</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-chalk-faint">
            toplam
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block text-sm font-black tabular" style={{ color: tier.accent }}>
            {row.price.toFixed(1)}
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-chalk-faint">
            fiyat
          </span>
        </span>
      </div>
    </div>
  );

  return linked ? (
    <Link href={`/oyuncu/${row.playerId}`} className="block transition hover:brightness-125">
      {content}
    </Link>
  ) : (
    content
  );
}
