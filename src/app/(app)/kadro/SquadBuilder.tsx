"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { autoPickAction, saveSquadAction, type SaveSquadState } from "./actions";
import { MePanel, type MeStats } from "./MePanel";
import { Pitch, type PitchCell } from "./Pitch";
import { PlayerPicker } from "./PlayerPicker";
import { Countdown } from "@/components/Countdown";
import { ErrorNote } from "@/components/Ui";
import { FORMATIONS, SLOT_ORDER, type Formation } from "@/lib/domain/rules";
import { SLOT_LABEL_LONG, type Player, type Slot, type SquadPick } from "@/lib/domain/types";

function buildCells(formation: Formation, picks: SquadPick[]): PitchCell[] {
  const remaining = [...picks];
  const cells: PitchCell[] = [];
  for (const slot of SLOT_ORDER) {
    for (let i = 0; i < formation.counts[slot]; i++) {
      const idx = remaining.findIndex((p) => p.slot === slot);
      const taken = idx >= 0 ? remaining.splice(idx, 1)[0] : null;
      cells.push({ key: `${slot}-${i}`, slot, playerId: taken?.playerId ?? null });
    }
  }
  return cells;
}

const EMPTY: SaveSquadState = { error: null, savedAt: null };

export interface SquadBuilderProps {
  players: Player[];
  me: Player;
  meStats: MeStats;
  displayName: string;
  budget: number;
  promoIds: string[];
  promoDiscount: number;
  initialFormationId: string;
  initialPicks: SquadPick[];
  lockAt: string;
  serverNow: number;
  gameweekNumber: number;
  wasRollover: boolean;
}

export function SquadBuilder(props: SquadBuilderProps) {
  const [formationId, setFormationId] = useState(props.initialFormationId);
  const [cells, setCells] = useState<PitchCell[]>(() =>
    buildCells(
      FORMATIONS.find((f) => f.id === props.initialFormationId) ?? FORMATIONS[0],
      props.initialPicks,
    ),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mobileTab, setMobileTab] = useState<"saha" | "oyuncular" | "ben">("saha");
  const [state, formAction, saving] = useActionState(saveSquadAction, EMPTY);
  const [autoPending, startAuto] = useTransition();
  const [seenSavedAt, setSeenSavedAt] = useState<number | null>(null);

  // Kaydetme başarılı döndüğünde "değişiklik var" işaretini temizle.
  if (state.savedAt !== null && state.savedAt !== seenSavedAt) {
    setSeenSavedAt(state.savedAt);
    setDirty(false);
  }

  const formation = FORMATIONS.find((f) => f.id === formationId) ?? FORMATIONS[0];
  const byId = useMemo(() => new Map(props.players.map((p) => [p.id, p])), [props.players]);
  const promoIds = useMemo(() => new Set(props.promoIds), [props.promoIds]);

  const priceOf = useMemo(() => {
    const discount = props.promoDiscount;
    return (id: string) => {
      const p = byId.get(id);
      if (!p) return 0;
      const raw = promoIds.has(id) ? p.price * (1 - discount) : p.price;
      return Math.round(raw * 10) / 10;
    };
  }, [byId, promoIds, props.promoDiscount]);

  const onPitch = useMemo(
    () => new Set(cells.map((c) => c.playerId).filter(Boolean) as string[]),
    [cells],
  );
  const spent = useMemo(
    () =>
      Math.round(cells.reduce((s, c) => s + (c.playerId ? priceOf(c.playerId) : 0), 0) * 10) /
      10,
    [cells, priceOf],
  );
  const remaining = Math.round((props.budget - spent) * 10) / 10;
  const filled = cells.filter((c) => c.playerId).length;
  const complete = filled === cells.length && remaining >= 0;

  const slotNeeds = useMemo(() => {
    const needs: Record<Slot, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    for (const cell of cells) if (!cell.playerId) needs[cell.slot]++;
    return needs;
  }, [cells]);

  const rows = useMemo(
    () => SLOT_ORDER.map((slot) => cells.filter((c) => c.slot === slot)).filter((r) => r.length),
    [cells],
  );

  function changeFormation(nextId: string) {
    const target = FORMATIONS.find((f) => f.id === nextId);
    if (!target) return;
    const kept: SquadPick[] = cells
      .filter((c) => c.playerId)
      .map((c) => ({ playerId: c.playerId!, slot: c.slot }));
    setFormationId(nextId);
    setCells(buildCells(target, kept));
    setDirty(true);
    setNotice(null);
  }

  /** Listeden bir oyuncuya basıldı: sahadaki ilk uygun boş yere koy ya da çıkar. */
  function togglePlayer(player: Player) {
    setNotice(null);
    if (onPitch.has(player.id)) {
      setCells((prev) =>
        prev.map((c) => (c.playerId === player.id ? { ...c, playerId: null } : c)),
      );
      setDirty(true);
      return;
    }
    if (priceOf(player.id) > remaining) {
      setNotice(`${player.name} bütçene sığmıyor. Önce birini çıkar.`);
      return;
    }
    const target = cells.find((c) => !c.playerId && player.slots.includes(c.slot));
    if (!target) {
      const possible = player.slots.map((s) => SLOT_LABEL_LONG[s]).join(" / ");
      setNotice(`${possible} yerlerinin hepsi dolu. Önce birini çıkar ya da dizilişi değiştir.`);
      return;
    }
    setCells((prev) =>
      prev.map((c) => (c.key === target.key ? { ...c, playerId: player.id } : c)),
    );
    setDirty(true);
  }

  function clearSlot(cell: PitchCell) {
    if (!cell.playerId) {
      setMobileTab("oyuncular");
      setNotice(`Sağdaki listeden bir ${SLOT_LABEL_LONG[cell.slot].toLowerCase()} seç.`);
      return;
    }
    setCells((prev) => prev.map((c) => (c.key === cell.key ? { ...c, playerId: null } : c)));
    setDirty(true);
    setNotice(null);
  }

  function runAutoPick() {
    startAuto(async () => {
      const picks = await autoPickAction(formationId);
      if (picks.length) {
        setCells(buildCells(formation, picks));
        setDirty(true);
        setNotice(null);
      }
    });
  }

  const picksPayload: SquadPick[] = cells
    .filter((c) => c.playerId)
    .map((c) => ({ playerId: c.playerId!, slot: c.slot }));

  return (
    <LayoutGroup>
      <div className="space-y-3">
        {/* Üst şerit: bütçe, hafta, geri sayım, kaydet */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink-900/70 px-4 py-3 edge-light">
          <div className="min-w-[7rem]">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-chalk-faint">
              Kalan bütçe
            </p>
            <p
              className={`text-3xl font-black leading-none tabular ${
                remaining < 0 ? "text-danger" : "text-neon"
              }`}
            >
              {remaining.toFixed(1)}
              <span className="ml-1 text-xs font-bold text-chalk-faint">
                / {props.budget}
              </span>
            </p>
          </div>

          <div className="h-9 w-px bg-ink-800" />

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-chalk-faint">
              Kadro
            </p>
            <p className="text-3xl font-black leading-none tabular text-chalk">
              {filled}
              <span className="text-xs font-bold text-chalk-faint">/{cells.length}</span>
            </p>
          </div>

          <div className="ml-auto text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-chalk-faint">
              {props.gameweekNumber}. hafta · son
            </p>
            <div className="flex justify-end">
              <Countdown targetIso={props.lockAt} serverNow={props.serverNow} />
            </div>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
            <motion.div
              className={`h-full rounded-full ${remaining < 0 ? "bg-danger" : "bg-neon"}`}
              animate={{ width: `${Math.min(100, (spent / props.budget) * 100)}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 30 }}
            />
          </div>
        </div>

        {props.wasRollover && (
          <p className="rounded-xl bg-flare/10 px-3 py-2 text-xs font-medium text-flare ring-1 ring-flare/30">
            Bu kadro geçen haftadan devretti. Değiştirmezsen aynen oynar.
          </p>
        )}
        {notice && (
          <p className="rounded-xl bg-ink-800 px-3 py-2 text-xs font-medium text-chalk-dim">
            {notice}
          </p>
        )}

        {/* Mobil sekmeleri */}
        <div className="flex gap-1 lg:hidden">
          {(
            [
              ["saha", "Saha"],
              ["oyuncular", "Oyuncular"],
              ["ben", "Ben"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMobileTab(key)}
              className={`flex-1 rounded-lg py-2 text-xs font-black uppercase tracking-widest transition ${
                mobileTab === key ? "bg-neon text-ink-950" : "bg-ink-900 text-chalk-faint"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Üç panel — orta sütun mümkün olduğunca geniş kalsın */}
        <div className="grid gap-3 lg:grid-cols-[13.5rem_minmax(0,1fr)_15.5rem] xl:grid-cols-[15rem_minmax(0,1fr)_17rem]">
          {/* SOL — ben */}
          <aside
            className={`rounded-2xl bg-ink-900/70 p-3 edge-light ${
              mobileTab === "ben" ? "" : "hidden lg:block"
            }`}
          >
            <MePanel player={props.me} stats={props.meStats} displayName={props.displayName} />
          </aside>

          {/* ORTA — saha */}
          <section className={mobileTab === "saha" ? "" : "hidden lg:block"}>
            <div className="mb-2 flex gap-1 overflow-x-auto no-scrollbar">
              {FORMATIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => changeFormation(f.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wide transition ${
                    f.id === formationId
                      ? "bg-neon text-ink-950"
                      : "bg-ink-900 text-chalk-faint edge-light"
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>

            <Pitch
              rows={rows}
              byId={byId}
              priceOf={priceOf}
              promoIds={promoIds}
              onSlotClick={clearSlot}
            />

            <p className="mt-1.5 text-center text-[11px] text-chalk-faint">
              {formation.tagline}
            </p>
          </section>

          {/* SAĞ — oyuncu havuzu */}
          <aside
            className={`rounded-2xl bg-ink-900/70 p-3 edge-light lg:max-h-[42rem] ${
              mobileTab === "oyuncular" ? "" : "hidden lg:flex"
            } lg:flex-col`}
          >
            <PlayerPicker
              players={props.players}
              onPitch={onPitch}
              priceOf={priceOf}
              promoIds={promoIds}
              remaining={remaining}
              slotNeeds={slotNeeds}
              onPick={togglePlayer}
              myPlayerId={props.me.id}
            />
          </aside>
        </div>

        {/* Kaydet */}
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="formationId" value={formationId} />
          <input type="hidden" name="picks" value={JSON.stringify(picksPayload)} />

          {state.error && <ErrorNote>{state.error}</ErrorNote>}
          {state.savedAt && !dirty && (
            <p className="rounded-lg bg-neon/10 px-3 py-2 text-sm font-semibold text-neon ring-1 ring-neon/30">
              {props.gameweekNumber}. hafta kadron kaydedildi. Son saate kadar
              istediğin kadar değiştirebilirsin.
            </p>
          )}

          <div className="sticky bottom-16 flex gap-2 sm:bottom-0">
            <button
              type="button"
              onClick={runAutoPick}
              disabled={autoPending}
              className="rounded-xl bg-ink-800 px-4 py-3.5 text-xs font-black uppercase tracking-widest text-chalk-dim ring-1 ring-ink-700 disabled:opacity-50"
            >
              {autoPending ? "…" : "Sen kur"}
            </button>
            <button
              type="submit"
              disabled={!complete || saving || !dirty}
              className="flex-1 rounded-xl bg-neon py-3.5 text-base font-black uppercase tracking-widest text-ink-950 transition active:scale-[0.98] disabled:bg-ink-800 disabled:text-chalk-faint"
            >
              {saving
                ? "Kaydediliyor…"
                : !complete
                  ? `${cells.length - filled} oyuncu eksik`
                  : dirty
                    ? "Kadroyu kaydet"
                    : "Kaydedildi ✓"}
            </button>
          </div>
        </form>
      </div>
    </LayoutGroup>
  );
}
