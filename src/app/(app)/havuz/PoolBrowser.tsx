"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SLOT_ORDER } from "@/lib/domain/rules";
import { SLOT_LABEL, SLOT_LABEL_LONG, type Player, type Slot } from "@/lib/domain/types";
import { PlayerFigure } from "@/components/PlayerFigure";
import { SLOT_COLORS, TIER_STYLES, tierFor } from "@/lib/ui/tiers";

export interface PoolEntry {
  player: Player;
  effectivePrice: number;
  isPromo: boolean;
  appearances: number;
  missed: number;
  goals: number;
  averageRating: number | null;
  ownership: number;
  priceDelta: number;
}

type SortKey = "price" | "rating" | "goals" | "ownership" | "reliability";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "price", label: "Fiyat" },
  { key: "rating", label: "Reyting" },
  { key: "goals", label: "Gol" },
  { key: "ownership", label: "Seçilme" },
  { key: "reliability", label: "Devam" },
];

export function PoolBrowser({ entries }: { entries: PoolEntry[] }) {
  const [slot, setSlot] = useState<Slot | "ALL">("ALL");
  const [sort, setSort] = useState<SortKey>("price");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    const reliability = (e: PoolEntry) =>
      e.appearances + e.missed === 0 ? -1 : e.appearances / (e.appearances + e.missed);

    return entries
      .filter((e) => slot === "ALL" || e.player.slots.includes(slot))
      .filter((e) => !q || e.player.name.toLocaleLowerCase("tr").includes(q))
      .sort((a, b) => {
        switch (sort) {
          case "rating":
            return (b.averageRating ?? -1) - (a.averageRating ?? -1);
          case "goals":
            return b.goals - a.goals;
          case "ownership":
            return b.ownership - a.ownership;
          case "reliability":
            return reliability(b) - reliability(a);
          default:
            return b.player.price - a.player.price;
        }
      });
  }, [entries, slot, sort, query]);

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Oyuncu ara…"
        className="w-full rounded-xl bg-ink-900 px-4 py-2.5 text-base text-chalk placeholder:text-chalk-faint edge-light"
      />

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        <Chip active={slot === "ALL"} onClick={() => setSlot("ALL")}>
          Hepsi
        </Chip>
        {SLOT_ORDER.map((s) => (
          <Chip key={s} active={slot === s} onClick={() => setSlot(s)}>
            {SLOT_LABEL_LONG[s]}
          </Chip>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {SORTS.map((s) => (
          <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)} small>
            {s.label}
          </Chip>
        ))}
      </div>

      <ul className="space-y-1.5">
        {visible.map((entry) => (
          <li key={entry.player.id}>
            <PoolRow entry={entry} />
          </li>
        ))}
      </ul>

      {visible.length === 0 && (
        <p className="py-8 text-center text-sm text-chalk-faint">Bu filtreye uyan kimse yok.</p>
      )}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  small = false,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full font-bold uppercase tracking-wide transition ${
        small ? "px-3 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs"
      } ${active ? "bg-neon text-ink-950" : "bg-ink-900 text-chalk-faint edge-light"}`}
    >
      {children}
    </button>
  );
}

function PoolRow({ entry }: { entry: PoolEntry }) {
  const { player } = entry;
  const tier = TIER_STYLES[tierFor(player.price)];
  const total = entry.appearances + entry.missed;

  return (
    <Link
      href={`/oyuncu/${player.id}`}
      className="flex items-center gap-3 rounded-xl bg-ink-900/70 px-3 py-2.5 transition hover:bg-ink-850 edge-light"
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg"
        style={{ background: tier.surface, boxShadow: `inset 0 0 0 1px ${tier.border}44` }}
      >
        <PlayerFigure playerId={player.id} name={player.name} className="h-full w-full" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-chalk">{player.name}</span>
          {player.dualKeeper && (
            <span className="shrink-0 rounded bg-flare/15 px-1 text-[9px] font-bold text-flare">
              K/FW
            </span>
          )}
        </span>
        <span className="flex gap-1.5 text-[10px] font-bold">
          {player.slots.map((s) => (
            <span key={s} className={SLOT_COLORS[s].text}>
              {SLOT_LABEL[s]}
            </span>
          ))}
          <span className="text-chalk-faint">
            {total > 0 ? `${entry.appearances}/${total} maç` : "yeni"}
          </span>
          {entry.goals > 0 && <span className="text-chalk-dim">{entry.goals} gol</span>}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="flex items-baseline justify-end gap-1">
          <span className="text-base font-black tabular" style={{ color: tier.accent }}>
            {entry.effectivePrice.toFixed(1)}
          </span>
          {entry.priceDelta !== 0 && (
            <span
              className={`text-[10px] font-black ${
                entry.priceDelta > 0 ? "text-neon" : "text-danger"
              }`}
            >
              {entry.priceDelta > 0 ? "▲" : "▼"}
            </span>
          )}
        </span>
        <span className="block text-[10px] text-chalk-faint">
          {entry.averageRating !== null ? `ort ${entry.averageRating.toFixed(1)}` : "—"}
          {entry.ownership > 0 && ` · %${entry.ownership}`}
        </span>
      </span>
    </Link>
  );
}
