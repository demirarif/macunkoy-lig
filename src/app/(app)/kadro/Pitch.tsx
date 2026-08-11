"use client";

import { motion } from "framer-motion";
import { PlayerFigure } from "@/components/PlayerFigure";
import { SLOT_LABEL_LONG, type Player, type Slot } from "@/lib/domain/types";
import { SLOT_COLORS, TIER_STYLES, tierFor } from "@/lib/ui/tiers";

export interface PitchCell {
  key: string;
  slot: Slot;
  playerId: string | null;
}

/**
 * Yeşil saha.
 *
 * Yükseklik sıra sayısından hesaplanır (satır başına sabit yükseklik), böylece
 * hiçbir figürün üstü kırpılmaz. Sağdaki listeden bir oyuncuya basıldığında
 * figür buraya "uçar": aynı `layoutId` hem listede hem sahada kullanıldığı için
 * framer-motion iki konum arasındaki geçişi kendisi canlandırır.
 */

/** Bir sıranın kapladığı yükseklik (figür + isim + fiyat + boşluk), px. */
const ROW_HEIGHT = { base: 104, lg: 132 };
const PITCH_PADDING = 32;

export function Pitch({
  rows,
  byId,
  priceOf,
  promoIds,
  onSlotClick,
}: {
  rows: PitchCell[][];
  byId: Map<string, Player>;
  priceOf: (id: string) => number;
  promoIds: Set<string>;
  onSlotClick: (cell: PitchCell) => void;
}) {
  // Saha, sıra sayısı kadar yer kaplar; ekran genişledikçe clamp ile büyür.
  // Böylece hiçbir figürün üstü kırpılmıyor, dar ekranda da taşmıyor.
  const min = rows.length * ROW_HEIGHT.base + PITCH_PADDING;
  const max = rows.length * ROW_HEIGHT.lg + PITCH_PADDING;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ minHeight: `clamp(${min}px, ${rows.length * 11}vw, ${max}px)` }}
    >
      {/* Çim */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(178deg, #23884d 0%, #17693d 48%, #0d4527 100%)",
        }}
      />
      {/* Biçme şeritleri */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.14]"
        style={{
          background:
            "repeating-linear-gradient(180deg, rgba(255,255,255,.95) 0 7%, transparent 7% 14%)",
        }}
      />
      {/* Saha çizgileri */}
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full opacity-[0.34]"
        preserveAspectRatio="none"
        viewBox="0 0 100 140"
      >
        <g fill="none" stroke="white" strokeWidth="0.45" vectorEffect="non-scaling-stroke">
          <rect x="3" y="3" width="94" height="134" />
          <line x1="3" y1="70" x2="97" y2="70" />
          <circle cx="50" cy="70" r="13" />
          <circle cx="50" cy="70" r="1" fill="white" stroke="none" />
          <rect x="26" y="3" width="48" height="18" />
          <rect x="38" y="3" width="24" height="7" />
          <rect x="26" y="119" width="48" height="18" />
          <rect x="38" y="130" width="24" height="7" />
        </g>
      </svg>
      {/* Kenar gölgesi — figürler zeminden ayrışsın */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ boxShadow: "inset 0 0 110px 26px rgba(0,0,0,.40)" }}
      />

      <div
        className="relative grid gap-1 px-2 py-4 sm:px-5"
        style={{ gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))`, minHeight: "inherit" }}
      >
        {rows.map((row) => (
          <div
            key={row[0].slot}
            className="flex items-center justify-center gap-2 sm:gap-4 lg:gap-6"
          >
            {row.map((cell) => (
              <PitchSlot
                key={cell.key}
                cell={cell}
                player={cell.playerId ? byId.get(cell.playerId) : undefined}
                price={cell.playerId ? priceOf(cell.playerId) : 0}
                isPromo={cell.playerId ? promoIds.has(cell.playerId) : false}
                onClick={() => onSlotClick(cell)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PitchSlot({
  cell,
  player,
  price,
  isPromo,
  onClick,
}: {
  cell: PitchCell;
  player: Player | undefined;
  price: number;
  isPromo: boolean;
  onClick: () => void;
}) {
  if (!player) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Boş ${SLOT_LABEL_LONG[cell.slot]} yeri`}
        className="group grid w-[70px] shrink-0 place-items-center gap-0.5 rounded-xl border-2 border-dashed
          border-white/30 bg-white/[0.08] py-4 backdrop-blur-[1px] transition
          hover:border-white/75 hover:bg-white/15 sm:w-[86px] lg:w-[104px] lg:py-6"
      >
        <span className="text-xl font-black leading-none text-white/55 group-hover:text-white/90 lg:text-2xl">
          +
        </span>
        <span className="text-[9px] font-black uppercase tracking-wider text-white/65 lg:text-[10px]">
          {SLOT_LABEL_LONG[cell.slot]}
        </span>
      </button>
    );
  }

  const tier = TIER_STYLES[tierFor(player.price)];

  return (
    <motion.button
      type="button"
      layoutId={`fig-${player.id}`}
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="relative w-[70px] shrink-0 sm:w-[86px] lg:w-[104px]"
      aria-label={`${player.name}, çıkarmak için dokun`}
    >
      <motion.span layout className="relative block h-[60px] w-full sm:h-[74px] lg:h-[92px]">
        <PlayerFigure playerId={player.id} name={player.name} className="h-full w-full" />
        {isPromo && (
          <span className="absolute right-0 top-0 rounded bg-flare px-1 text-[8px] font-black text-ink-950 shadow">
            %
          </span>
        )}
      </motion.span>

      <motion.span
        layout
        className="mt-1 flex items-stretch overflow-hidden rounded-md shadow-lg"
        style={{ background: "rgba(4,18,11,.82)" }}
      >
        <span
          className="min-w-0 flex-1 truncate px-1.5 py-[3px] text-center text-[10px] font-black uppercase leading-tight tracking-tight lg:text-[11px]"
          style={{ color: tier.accent }}
        >
          {player.name}
        </span>
        <span
          className={`shrink-0 px-1 py-[3px] text-[9px] font-black tabular lg:text-[10px] ${SLOT_COLORS[cell.slot].text}`}
          style={{ background: "rgba(0,0,0,.35)" }}
        >
          {price.toFixed(1)}
        </span>
      </motion.span>
    </motion.button>
  );
}
