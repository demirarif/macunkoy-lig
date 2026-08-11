"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PlayerFigure } from "@/components/PlayerFigure";
import { SLOT_ORDER } from "@/lib/domain/rules";
import { SLOT_LABEL, SLOT_LABEL_LONG, type Player, type Slot } from "@/lib/domain/types";
import { SLOT_COLORS, TIER_STYLES, tierFor } from "@/lib/ui/tiers";

/**
 * Sağ panel: havuzdaki herkes, figürleriyle.
 *
 * Bir oyuncuya basınca sahadaki ilk uygun yere yerleşir. Sahaya çıkan
 * oyuncunun figürü listede kalmaz — `layoutId` çakışmasın ve figür gerçekten
 * "listeden sahaya taşınmış" gibi görünsün diye satır boş bir yuvaya döner.
 */
export function PlayerPicker({
  players,
  onPitch,
  priceOf,
  promoIds,
  remaining,
  slotNeeds,
  onPick,
  myPlayerId,
}: {
  players: Player[];
  onPitch: Set<string>;
  priceOf: (id: string) => number;
  promoIds: Set<string>;
  remaining: number;
  /** Hangi mevkide kaç boş yer kaldı — listede "yeri yok" uyarısı için. */
  slotNeeds: Record<Slot, number>;
  onPick: (player: Player) => void;
  myPlayerId: string;
}) {
  const [query, setQuery] = useState("");
  const [slotFilter, setSlotFilter] = useState<Slot | "ALL">("ALL");
  const [hideUnaffordable, setHideUnaffordable] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return players
      .filter((p) => p.active)
      .filter((p) => slotFilter === "ALL" || p.slots.includes(slotFilter))
      .filter((p) => !q || p.name.toLocaleLowerCase("tr").includes(q))
      .filter((p) => !hideUnaffordable || onPitch.has(p.id) || priceOf(p.id) <= remaining)
      .sort((a, b) => {
        const aOn = onPitch.has(a.id) ? 1 : 0;
        const bOn = onPitch.has(b.id) ? 1 : 0;
        // Sahadakiler listenin dibine insin; seçilecekler hep üstte kalsın.
        return aOn - bOn || priceOf(b.id) - priceOf(a.id);
      });
  }, [players, slotFilter, query, hideUnaffordable, onPitch, priceOf, remaining]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2 pb-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Oyuncu ara…"
          aria-label="Oyuncu ara"
          className="w-full rounded-lg bg-ink-850 px-3 py-2 text-sm text-chalk placeholder:text-chalk-faint edge-light"
        />
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          <FilterChip active={slotFilter === "ALL"} onClick={() => setSlotFilter("ALL")}>
            Hepsi
          </FilterChip>
          {SLOT_ORDER.map((slot) => (
            <FilterChip
              key={slot}
              active={slotFilter === slot}
              onClick={() => setSlotFilter(slot)}
              badge={slotNeeds[slot] > 0 ? slotNeeds[slot] : undefined}
            >
              {SLOT_LABEL_LONG[slot]}
            </FilterChip>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[11px] font-semibold text-chalk-faint">
          <input
            type="checkbox"
            checked={hideUnaffordable}
            onChange={(e) => setHideUnaffordable(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--color-neon)]"
          />
          Sadece bütçeme sığanlar
        </label>
      </div>

      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
        {visible.map((player) => (
          <PickerRow
            key={player.id}
            player={player}
            price={priceOf(player.id)}
            isPromo={promoIds.has(player.id)}
            isOnPitch={onPitch.has(player.id)}
            affordable={priceOf(player.id) <= remaining}
            hasSlot={player.slots.some((s) => slotNeeds[s] > 0)}
            isMe={player.id === myPlayerId}
            onClick={() => onPick(player)}
          />
        ))}
        {visible.length === 0 && (
          <li className="py-8 text-center text-xs text-chalk-faint">
            Bu filtreye uyan oyuncu yok.
          </li>
        )}
      </ul>
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
  badge,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition ${
        active ? "bg-neon text-ink-950" : "bg-ink-850 text-chalk-faint"
      }`}
    >
      {children}
      {badge !== undefined && (
        <span
          className={`grid h-3.5 min-w-3.5 place-items-center rounded-full px-1 text-[9px] ${
            active ? "bg-ink-950/25 text-ink-950" : "bg-neon/20 text-neon"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function PickerRow({
  player,
  price,
  isPromo,
  isOnPitch,
  affordable,
  hasSlot,
  isMe,
  onClick,
}: {
  player: Player;
  price: number;
  isPromo: boolean;
  isOnPitch: boolean;
  affordable: boolean;
  hasSlot: boolean;
  isMe: boolean;
  onClick: () => void;
}) {
  const tier = TIER_STYLES[tierFor(player.price)];
  const blocked = !isOnPitch && (!affordable || !hasSlot);

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={blocked}
        className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition
          ${
            isOnPitch
              ? "bg-neon/10 ring-1 ring-neon/35"
              : blocked
                ? "opacity-35"
                : "bg-ink-900/70 ring-1 ring-ink-800 hover:bg-ink-850"
          }`}
        title={
          isOnPitch
            ? "Sahada — çıkarmak için dokun"
            : !affordable
              ? "Bütçeye sığmıyor"
              : !hasSlot
                ? "Bu mevkide boş yer yok"
                : "Sahaya ekle"
        }
      >
        <span
          className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg"
          style={{ background: tier.surface, boxShadow: `inset 0 0 0 1px ${tier.border}33` }}
        >
          {isOnPitch ? (
            <span className="text-[9px] font-black uppercase leading-tight text-neon">
              Saha
              <br />
              da
            </span>
          ) : (
            <motion.span layoutId={`fig-${player.id}`} className="block h-full w-full">
              <PlayerFigure playerId={player.id} name={player.name} className="h-full w-full" />
            </motion.span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="truncate text-[13px] font-bold text-chalk">{player.name}</span>
            {isMe && (
              <span className="shrink-0 rounded bg-neon/20 px-1 text-[8px] font-black text-neon">
                SEN
              </span>
            )}
            {player.dualKeeper && (
              <span
                className="shrink-0 rounded bg-flare/15 px-1 text-[8px] font-black text-flare"
                title="Kaleci de olabilir oyuncu da — yanlış mevkiye koyarsan gol puanı yanar"
              >
                RİSK
              </span>
            )}
          </span>
          <span className="flex gap-1">
            {player.slots.map((s) => (
              <span key={s} className={`text-[9px] font-black ${SLOT_COLORS[s].text}`}>
                {SLOT_LABEL[s]}
              </span>
            ))}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span
            className="block text-[13px] font-black tabular"
            style={{ color: tier.accent }}
          >
            {price.toFixed(1)}
          </span>
          {isPromo && (
            <span className="block text-[9px] font-black text-flare">KAMPANYA</span>
          )}
        </span>
      </button>
    </li>
  );
}
