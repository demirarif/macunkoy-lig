"use client";

import { motion } from "framer-motion";
import { PlayerFigure } from "./PlayerFigure";
import { SLOT_LABEL, type Player, type Slot } from "@/lib/domain/types";
import { SLOT_COLORS, TIER_STYLES, tierFor } from "@/lib/ui/tiers";

export type CardSize = "sm" | "md" | "lg";

const SIZES: Record<CardSize, { width: string; name: string; price: string }> = {
  sm: { width: "w-[92px]", name: "text-[11px]", price: "text-[11px]" },
  md: { width: "w-[124px]", name: "text-xs", price: "text-xs" },
  lg: { width: "w-[168px]", name: "text-sm", price: "text-sm" },
};

export interface PlayerCardProps {
  player: Player;
  /** Kadroya konduğu slot. Verilmezse oyuncunun tüm mevkileri gösterilir. */
  slot?: Slot;
  size?: CardSize;
  /** Kampanya indirimi uygulanmış fiyat. Verilmezse player.price kullanılır. */
  displayPrice?: number;
  isPromo?: boolean;
  isCaptain?: boolean;
  /** Bu hafta ankete yetişti mi — açılış ekranında yeşil/kırmızı durum. */
  pollStatus?: "in" | "out" | null;
  /** Sağ üstte gösterilecek puan (hafta sonuçlarında). */
  points?: number | null;
  ownership?: number | null;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PlayerCard({
  player,
  slot,
  size = "md",
  displayPrice,
  isPromo = false,
  isCaptain = false,
  pollStatus = null,
  points = null,
  ownership = null,
  selected = false,
  dimmed = false,
  onClick,
  className = "",
}: PlayerCardProps) {
  const price = displayPrice ?? player.price;
  const tier = TIER_STYLES[tierFor(player.price)];
  const dims = SIZES[size];
  const slots = slot ? [slot] : player.slots;
  const interactive = Boolean(onClick);

  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      disabled={!interactive}
      whileTap={interactive ? { scale: 0.95 } : undefined}
      whileHover={interactive ? { y: -4 } : undefined}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className={`group relative shrink-0 ${dims.width} aspect-[3/4] rounded-card text-left
        ${interactive ? "cursor-pointer" : "cursor-default"}
        ${dimmed ? "opacity-35 saturate-50" : ""}
        ${className}`}
      style={{
        background: tier.surface,
        boxShadow: selected
          ? `0 0 0 2px var(--color-neon), 0 18px 40px -14px rgb(74 222 128 / .6)`
          : tier.glow,
        containerType: "inline-size",
      }}
      aria-label={`${player.name}, ${price.toFixed(1)} birim`}
      aria-pressed={interactive ? selected : undefined}
    >
      {/* Kampanyalı kartlarda dönen ışık çizgisi */}
      {isPromo && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-card opacity-70 animate-shimmer"
          style={{
            background:
              "linear-gradient(105deg, transparent 35%, rgb(251 191 36 / .35) 50%, transparent 65%)",
            backgroundSize: "200% 100%",
          }}
        />
      )}

      {/* Fiyat */}
      <span
        className={`absolute left-2 top-1.5 font-black tabular ${dims.price}`}
        style={{ color: tier.accent }}
      >
        {price.toFixed(1)}
        {isPromo && <span className="ml-0.5 text-flare">↓</span>}
      </span>

      {/* Mevki rozetleri */}
      <span className="absolute right-1.5 top-1.5 flex gap-0.5">
        {slots.map((s) => (
          <span
            key={s}
            className={`rounded px-1 py-px text-[9px] font-bold leading-tight ring-1 ${SLOT_COLORS[s].bg} ${SLOT_COLORS[s].text} ${SLOT_COLORS[s].ring}`}
          >
            {SLOT_LABEL[s]}
          </span>
        ))}
      </span>

      {/* Figür — konumlandırmayı saran katman yapar, PlayerFigure kendi içinde
          `relative` olduğu için doğrudan `absolute` veremiyoruz. */}
      <span className="absolute inset-x-0 bottom-[22%] top-[12%]">
        <PlayerFigure playerId={player.id} name={player.name} className="h-full w-full" />
      </span>

      {/* İsim şeridi */}
      <span
        className="absolute inset-x-0 bottom-0 rounded-b-card px-2 pb-1.5 pt-1"
        style={{ background: tier.band }}
      >
        <span
          className={`block truncate font-bold uppercase tracking-wide ${dims.name}`}
          style={{ color: tier.accent }}
        >
          {player.name}
        </span>
        {ownership !== null && (
          <span className="block text-[9px] font-medium text-chalk/60">
            %{ownership} menajerde
          </span>
        )}
      </span>

      {/* Kaptan bandı */}
      {isCaptain && (
        <span className="absolute -left-1 top-[38%] rounded-r bg-flare px-1.5 py-0.5 text-[9px] font-black text-ink-950 shadow-lg">
          KAPTAN 2x
        </span>
      )}

      {/* Anket durumu */}
      {pollStatus && (
        <span
          className={`absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full text-xs font-black shadow-lg ${
            pollStatus === "in" ? "bg-neon text-ink-950" : "bg-danger text-white"
          }`}
          title={pollStatus === "in" ? "Ankete yetişti" : "Ankete yetişemedi"}
        >
          {pollStatus === "in" ? "✓" : "✕"}
        </span>
      )}

      {/* Haftalık puan */}
      {points !== null && (
        <span
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-xs font-black tabular shadow-lg ring-1 ${
            points > 0
              ? "bg-neon text-ink-950 ring-neon-bright"
              : points < 0
                ? "bg-danger text-white ring-danger"
                : "bg-ink-700 text-chalk-dim ring-ink-600"
          }`}
        >
          {points > 0 ? "+" : ""}
          {points}
        </span>
      )}
    </motion.button>
  );
}

