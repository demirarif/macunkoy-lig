"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addPlayerAction,
  renameSeasonAction,
  resetAccountAction,
  updateBudgetAction,
  updatePlayerAction,
  updateScoringAction,
  type ActionResult,
  type ScoringPatch,
} from "../actions";
import { SLOT_LABEL_LONG, type Player, type Slot } from "@/lib/domain/types";
import { SLOT_ORDER } from "@/lib/domain/rules";

const ALL_SLOTS = SLOT_ORDER;

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const res = await fn();
      setResult(res);
      if (!res.error) router.refresh();
    });

  return { pending, result, run };
}

function Feedback({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <p
      className={`text-xs font-semibold ${result.error ? "text-danger" : "text-neon"}`}
      role="status"
    >
      {result.error ?? result.ok}
    </p>
  );
}

const numberInput =
  "w-20 rounded-lg bg-ink-850 px-2 py-2 text-center text-base font-bold tabular text-chalk edge-light";
const primaryButton =
  "rounded-xl bg-flare px-4 py-2.5 text-xs font-black uppercase tracking-widest text-ink-950 disabled:opacity-50";

export function SeasonForm({ current }: { current: string }) {
  const { pending, result, run } = useAction();
  const [name, setName] = useState(current);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg bg-ink-850 px-3 py-2.5 text-base text-chalk edge-light"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => renameSeasonAction(name))}
          className={primaryButton}
        >
          Kaydet
        </button>
      </div>
      <Feedback result={result} />
    </div>
  );
}

export function BudgetForm({ current }: { current: number }) {
  const { pending, result, run } = useAction();
  const [budget, setBudget] = useState(current);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={budget}
          min={10}
          max={500}
          onChange={(e) => setBudget(Number(e.target.value))}
          className={numberInput}
        />
        <span className="flex-1 text-xs text-chalk-faint">
          birim. 85 en fazla 3 pahalı oyuncu alınacak şekilde ayarlandı; değiştirirsen
          bu denge bozulur.
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => updateBudgetAction(budget))}
          className={primaryButton}
        >
          Kaydet
        </button>
      </div>
      <Feedback result={result} />
    </div>
  );
}

export function ScoringForm({ initial }: { initial: Required<ScoringPatch> }) {
  const { pending, result, run } = useAction();
  const [values, setValues] = useState(initial);

  const fields: Array<[keyof ScoringPatch, string, number]> = [
    ["played", "Oynadı", 1],
    ["noShow", "Ankete yetişemedi", 1],
    ["goalGK", "Gol — Kaleci", 1],
    ["goalDEF", "Gol — Defans", 1],
    ["goalMID", "Gol — Orta saha", 1],
    ["goalFWD", "Gol — Forvet", 1],
    ["win", "Galibiyet", 1],
    ["draw", "Beraberlik", 1],
    ["loss", "Mağlubiyet", 1],
    ["mvp", "Maçın adamı", 1],
    ["captainMultiplier", "Kaptan çarpanı", 0.5],
    ["promoMultiplier", "Kampanya çarpanı", 0.1],
    ["promoDiscount", "Kampanya indirimi (0-0.9)", 0.05],
    ["promoCount", "Kampanyalı oyuncu sayısı", 1],
  ];

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-ink-850">
        {fields.map(([key, label, step]) => (
          <li key={key} className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-sm text-chalk-dim">{label}</span>
            <input
              type="number"
              step={step}
              value={values[key]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [key]: Number(e.target.value) }))
              }
              className={numberInput}
            />
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => updateScoringAction(values))}
          className={primaryButton}
        >
          Puanlamayı kaydet
        </button>
        <Feedback result={result} />
      </div>
      <p className="text-[11px] text-chalk-faint">
        Değişiklikler kapanmış haftaların puanlarını da etkiler — tablo yeniden hesaplanır.
      </p>
    </div>
  );
}

export function PlayerAdmin({
  players,
  registeredPlayerIds,
}: {
  players: Player[];
  registeredPlayerIds: string[];
}) {
  const { pending, result, run } = useAction();
  const [query, setQuery] = useState("");
  const registered = new Set(registeredPlayerIds);

  const visible = players.filter((p) =>
    p.name.toLocaleLowerCase("tr").includes(query.trim().toLocaleLowerCase("tr")),
  );

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Oyuncu ara…"
        className="w-full rounded-lg bg-ink-850 px-3 py-2.5 text-base text-chalk placeholder:text-chalk-faint edge-light"
      />
      <Feedback result={result} />
      <ul className="space-y-1.5">
        {visible.map((player) => (
          <PlayerAdminRow
            key={player.id}
            player={player}
            hasAccount={registered.has(player.id)}
            pending={pending}
            run={run}
          />
        ))}
      </ul>
    </div>
  );
}

function PlayerAdminRow({
  player,
  hasAccount,
  pending,
  run,
}: {
  player: Player;
  hasAccount: boolean;
  pending: boolean;
  run: (fn: () => Promise<ActionResult>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(player.price);
  const [slots, setSlots] = useState<Slot[]>(player.slots);

  return (
    <li className="rounded-xl bg-ink-900/70 edge-light">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-chalk">
            {player.name}
            {!player.active && <span className="ml-2 text-[10px] text-danger">PASİF</span>}
          </span>
          <span className="block text-[11px] text-chalk-faint">
            {player.slots.map((s) => SLOT_LABEL_LONG[s]).join(" · ")}
            {hasAccount && " · hesabı var"}
          </span>
        </span>
        <span className="text-base font-black tabular text-chalk-dim">
          {player.price.toFixed(1)}
        </span>
        <span className={`text-chalk-faint transition-transform ${open ? "rotate-180" : ""}`}>
          ⌄
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-ink-800 px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-chalk-faint">
              Fiyat
            </span>
            <input
              type="number"
              step={0.5}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className={numberInput}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => updatePlayerAction(player.id, { price, slots }))}
              className={primaryButton}
            >
              Kaydet
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ALL_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() =>
                  setSlots((prev) =>
                    prev.includes(slot)
                      ? prev.filter((s) => s !== slot)
                      : [...prev, slot],
                  )
                }
                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
                  slots.includes(slot)
                    ? "bg-neon text-ink-950"
                    : "bg-ink-800 text-chalk-faint"
                }`}
              >
                {SLOT_LABEL_LONG[slot]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => updatePlayerAction(player.id, { active: !player.active }))
              }
              className="rounded-lg bg-ink-800 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-chalk-dim"
            >
              {player.active ? "Havuzdan çıkar" : "Havuza geri al"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() =>
                  updatePlayerAction(player.id, { dualKeeper: !player.dualKeeper }),
                )
              }
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
                player.dualKeeper ? "bg-flare text-ink-950" : "bg-ink-800 text-chalk-faint"
              }`}
            >
              Kaleci/oyuncu riski
            </button>
            {hasAccount && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (
                    window.confirm(
                      `${player.name} hesabı silinsin mi? PIN'i sıfırlanır ve bu isim yeniden kayda açılır. Geçmiş kadroları ve puanları silinmez.`,
                    )
                  ) {
                    run(() => resetAccountAction(player.id));
                  }
                }}
                className="rounded-lg bg-danger/15 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-danger"
              >
                Hesabı sıfırla
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function AddPlayerForm() {
  const { pending, result, run } = useAction();
  const [name, setName] = useState("");
  const [price, setPrice] = useState(10);
  const [slots, setSlots] = useState<Slot[]>(["DEF"]);

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="İsim"
          className="flex-1 rounded-lg bg-ink-850 px-3 py-2.5 text-base text-chalk placeholder:text-chalk-faint edge-light"
        />
        <input
          type="number"
          step={0.5}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className={numberInput}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() =>
              setSlots((prev) =>
                prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
              )
            }
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
              slots.includes(slot) ? "bg-neon text-ink-950" : "bg-ink-800 text-chalk-faint"
            }`}
          >
            {SLOT_LABEL_LONG[slot]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending || name.trim().length < 2}
          onClick={() =>
            run(async () => {
              const res = await addPlayerAction(name, slots, price);
              if (!res.error) setName("");
              return res;
            })
          }
          className={primaryButton}
        >
          Havuza ekle
        </button>
        <Feedback result={result} />
      </div>
      <p className="text-[11px] text-chalk-faint">
        Yeni oyuncunun figürünü eklemek için görselini &quot;oyuncu gorseller&quot;
        klasörüne koy, scripts/figures.json&apos;a satır ekle ve{" "}
        <code className="text-chalk-dim">npm run figurler</code> çalıştır.
      </p>
    </div>
  );
}
