"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PlayerFigure } from "@/components/PlayerFigure";
import { SLOT_LABEL, type PlayerScoreBreakdown } from "@/lib/domain/types";
import { SLOT_COLORS, TIER_STYLES, tierFor } from "@/lib/ui/tiers";

export interface BreakdownRow {
  breakdown: PlayerScoreBreakdown;
  playerName: string;
  playerPrice: number;
}

/** Puan dökümü — her satıra dokununca hangi kalemden kaç puan geldiği açılır. */
export function ScoreBreakdown({ rows, total }: { rows: BreakdownRow[]; total: number }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-1.5">
      {rows.map(({ breakdown, playerName, playerPrice }) => {
        const tier = TIER_STYLES[tierFor(playerPrice)];
        const isOpen = open === breakdown.playerId;
        const hasMultiplier =
          breakdown.captainMultiplier !== 1 || breakdown.promoMultiplier !== 1;

        return (
          <div key={breakdown.playerId} className="overflow-hidden rounded-xl bg-ink-900/70 edge-light">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : breakdown.playerId)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
              aria-expanded={isOpen}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg"
                style={{ background: tier.surface }}
              >
                <PlayerFigure
                  playerId={breakdown.playerId}
                  name={playerName}
                  className="h-full w-full"
                />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-chalk">{playerName}</span>
                  <span className={`text-[10px] font-bold ${SLOT_COLORS[breakdown.slot].text}`}>
                    {SLOT_LABEL[breakdown.slot]}
                  </span>
                </span>
                <span className="flex flex-wrap gap-1.5 text-[10px] font-bold uppercase">
                  {breakdown.captainMultiplier !== 1 && (
                    <span className="text-flare">Kaptan 2x</span>
                  )}
                  {breakdown.promoMultiplier !== 1 && (
                    <span className="text-flare">Kampanya 1.5x</span>
                  )}
                  {breakdown.slotMismatch && (
                    <span className="text-danger">Slot uyuşmadı</span>
                  )}
                  {breakdown.didNotPlay && <span className="text-danger">Yetişemedi</span>}
                </span>
              </span>

              <span
                className={`shrink-0 text-lg font-black tabular ${
                  breakdown.total > 0
                    ? "text-neon"
                    : breakdown.total < 0
                      ? "text-danger"
                      : "text-chalk-faint"
                }`}
              >
                {breakdown.total > 0 ? "+" : ""}
                {breakdown.total}
              </span>
              <span
                className={`shrink-0 text-chalk-faint transition-transform ${isOpen ? "rotate-180" : ""}`}
                aria-hidden
              >
                ⌄
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <ul className="space-y-1 border-t border-ink-800 px-3 py-2.5 pl-[3.75rem]">
                    {breakdown.lines.map((line, i) => (
                      <li key={i} className="flex justify-between text-xs">
                        <span className="text-chalk-dim">{line.label}</span>
                        <span
                          className={`font-bold tabular ${
                            line.points > 0
                              ? "text-neon"
                              : line.points < 0
                                ? "text-danger"
                                : "text-chalk-faint"
                          }`}
                        >
                          {line.points > 0 ? "+" : ""}
                          {line.points}
                        </span>
                      </li>
                    ))}
                    {hasMultiplier && (
                      <li className="flex justify-between border-t border-ink-800 pt-1 text-xs">
                        <span className="text-chalk-dim">
                          Ara toplam {breakdown.subtotal} ×
                          {breakdown.captainMultiplier * breakdown.promoMultiplier}
                        </span>
                        <span className="font-black tabular text-chalk">
                          {breakdown.total}
                        </span>
                      </li>
                    )}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <div className="flex items-center justify-between rounded-xl bg-ink-800 px-3 py-3">
        <span className="text-sm font-black uppercase tracking-widest text-chalk-dim">
          Hafta toplamı
        </span>
        <span
          className={`text-2xl font-black tabular ${total >= 0 ? "text-neon" : "text-danger"}`}
        >
          {total}
        </span>
      </div>
    </div>
  );
}
