"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  completeAction,
  saveStatsAction,
  saveTeamsAction,
  setPromosAction,
  type ActionResult,
} from "../../actions";
import { PlayerFigure } from "@/components/PlayerFigure";
import { Badge, ErrorNote } from "@/components/Ui";
import { SLOT_LABEL, type GameweekStatus, type Player, type PlayerMatchStat } from "@/lib/domain/types";
import { SLOT_COLORS } from "@/lib/ui/tiers";

export interface WeekEditorProps {
  gameweekId: string;
  gameweekNumber: number;
  status: GameweekStatus;
  players: Player[];
  captainCount: number;
  promoCount: number;
  initial: {
    teamAIds: string[];
    teamBIds: string[];
    captainIds: string[];
    promoPlayerIds: string[];
    scoreA: number | null;
    scoreB: number | null;
    mvpPlayerId: string | null;
    stats: PlayerMatchStat[];
  };
}

const DEFAULT_RATING = 6.5;

/**
 * Admin'in bir haftayı baştan sona yönettiği tek ekran.
 *
 *   1. Takımlar   sahaya çıkan 22 kişiyi A / B olarak işaretle, kaptanları seç
 *   2. Maç        skor, gol, reyting, maçın adamı
 *   3. Tamamla    puanlar ve fiyatlar kesinleşir; geri dönüş yok
 *
 * Hedef: telefondan tek elle. Reyting varsayılan 6.5 gelir, sadece
 * değiştireceğine dokunursun; her değişiklik 1.2 saniye sonra kaydedilir.
 */
export function WeekEditor(props: WeekEditorProps) {
  const router = useRouter();
  const locked = props.status === "completed";

  const [teamA, setTeamA] = useState<string[]>(props.initial.teamAIds);
  const [teamB, setTeamB] = useState<string[]>(props.initial.teamBIds);
  const [captains, setCaptains] = useState<string[]>(props.initial.captainIds);
  const [promos, setPromos] = useState<string[]>(props.initial.promoPlayerIds);
  const [teamsResult, setTeamsResult] = useState<ActionResult | null>(null);
  const [pendingTeams, startTeams] = useTransition();

  const byId = useMemo(() => new Map(props.players.map((p) => [p.id, p])), [props.players]);
  const calledUp = useMemo(() => [...teamA, ...teamB], [teamA, teamB]);
  const teamsSaved = props.initial.teamAIds.length + props.initial.teamBIds.length > 0;

  function cycleTeam(id: string) {
    if (locked) return;
    if (teamA.includes(id)) {
      setTeamA((p) => p.filter((x) => x !== id));
      setTeamB((p) => [...p, id]);
    } else if (teamB.includes(id)) {
      setTeamB((p) => p.filter((x) => x !== id));
      setCaptains((p) => p.filter((x) => x !== id));
    } else {
      setTeamA((p) => [...p, id]);
    }
  }

  function toggleCaptain(id: string) {
    if (locked) return;
    setCaptains((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= props.captainCount) return prev;
      return [...prev, id];
    });
  }

  function togglePromo(id: string) {
    if (locked) return;
    setPromos((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= props.promoCount) return prev;
      return [...prev, id];
    });
  }

  function saveTeams() {
    startTeams(async () => {
      const res = await saveTeamsAction(props.gameweekId, {
        teamAIds: teamA,
        teamBIds: teamB,
        captainIds: captains,
      });
      setTeamsResult(res);
      if (!res.error) router.refresh();
    });
  }

  function savePromos() {
    startTeams(async () => {
      const res = await setPromosAction(props.gameweekId, promos);
      setTeamsResult(res);
      if (!res.error) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {locked && (
        <p className="rounded-xl bg-flare/10 px-3 py-2.5 text-sm font-semibold text-flare ring-1 ring-flare/30">
          Bu hafta tamamlandı. Puanlar kesinleşti ve artık değiştirilemez.
        </p>
      )}

      {/* 1 — Kampanya */}
      <Section
        step={1}
        title="Kampanyalı oyuncular"
        hint={`Bu hafta kadro kuranlar için ${props.promoCount} oyuncu indirimli ve 1.5x puanlı olur.`}
        badge={
          <Badge tone={promos.length === props.promoCount ? "good" : "warn"}>
            {promos.length}/{props.promoCount}
          </Badge>
        }
      >
        <PlayerGrid
          players={props.players}
          marked={promos}
          disabled={locked}
          onToggle={togglePromo}
          tone="flare"
        />
        {!locked && (
          <button
            type="button"
            onClick={savePromos}
            disabled={pendingTeams}
            className="mt-2 w-full rounded-xl bg-ink-800 py-2.5 text-xs font-black uppercase tracking-widest text-chalk-dim ring-1 ring-ink-700"
          >
            Kampanyayı kaydet
          </button>
        )}
      </Section>

      {/* 2 — Takımlar */}
      <Section
        step={2}
        title="Sahaya çıkan takımlar"
        hint="İsme bir kez dokun → A takımı, iki kez → B takımı, üç kez → sahada değil."
        badge={
          <span className="flex gap-1.5">
            <Badge tone="good">A {teamA.length}</Badge>
            <Badge tone="cool">B {teamB.length}</Badge>
          </span>
        }
      >
        <TeamGrid
          players={props.players}
          teamA={teamA}
          teamB={teamB}
          disabled={locked}
          onCycle={cycleTeam}
        />

        {calledUp.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-chalk-faint">
              Kaptanlar — her takımdan 1 ({captains.length}/{props.captainCount})
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["A Takımı", teamA, "text-neon"],
                  ["B Takımı", teamB, "text-sky-cool"],
                ] as const
              ).map(([label, ids, color]) => (
                <div key={label}>
                  <p className={`mb-1 text-[10px] font-black uppercase ${color}`}>{label}</p>
                  <div className="flex flex-wrap gap-1">
                    {ids.map((id) => (
                      <button
                        key={id}
                        type="button"
                        disabled={locked}
                        onClick={() => toggleCaptain(id)}
                        className={`rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                          captains.includes(id)
                            ? "bg-flare text-ink-950"
                            : "bg-ink-850 text-chalk-dim"
                        }`}
                      >
                        {byId.get(id)?.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {teamsResult?.error && (
          <div className="mt-3">
            <ErrorNote>{teamsResult.error}</ErrorNote>
          </div>
        )}
        {teamsResult?.ok && (
          <p className="mt-3 rounded-lg bg-neon/10 px-3 py-2 text-sm font-semibold text-neon ring-1 ring-neon/30">
            {teamsResult.ok}
          </p>
        )}

        {!locked && (
          <button
            type="button"
            onClick={saveTeams}
            disabled={pendingTeams || calledUp.length === 0}
            className="mt-3 w-full rounded-xl bg-flare py-3.5 text-sm font-black uppercase tracking-widest text-ink-950 disabled:opacity-40"
          >
            {pendingTeams ? "Kaydediliyor…" : "Takımları kaydet"}
          </button>
        )}
      </Section>

      {/* 3 — Maç verisi */}
      {teamsSaved ? (
        <MatchSection
          gameweekId={props.gameweekId}
          gameweekNumber={props.gameweekNumber}
          locked={locked}
          roster={[
            ...props.initial.teamAIds.map((id) => ({ id, team: "A" as const })),
            ...props.initial.teamBIds.map((id) => ({ id, team: "B" as const })),
          ]
            .filter(({ id }) => byId.has(id))
            .map(({ id, team }) => ({ id, team, name: byId.get(id)!.name }))}
          initial={props.initial}
        />
      ) : (
        <Section step={3} title="Maç verisi" hint="Önce takımları kaydet.">
          <p className="py-6 text-center text-sm text-chalk-faint">
            Takımlar kaydedilince skor ve reyting girişi burada açılacak.
          </p>
        </Section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MatchSection({
  gameweekId,
  gameweekNumber,
  locked,
  roster,
  initial,
}: {
  gameweekId: string;
  gameweekNumber: number;
  locked: boolean;
  roster: Array<{ id: string; name: string; team: "A" | "B" }>;
  initial: WeekEditorProps["initial"];
}) {
  const router = useRouter();
  const [scoreA, setScoreA] = useState(initial.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(initial.scoreB ?? 0);
  const [mvp, setMvp] = useState<string | null>(initial.mvpPlayerId);
  const [rows, setRows] = useState<Map<string, PlayerMatchStat>>(() => {
    const map = new Map<string, PlayerMatchStat>();
    for (const entry of roster) {
      const existing = initial.stats.find((s) => s.playerId === entry.id);
      map.set(
        entry.id,
        existing ?? {
          playerId: entry.id,
          played: true,
          keptGoal: false,
          team: entry.team,
          goals: 0,
          rating: DEFAULT_RATING,
        },
      );
    }
    return map;
  });

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [completing, startComplete] = useTransition();
  const dirtyRef = useRef(false);

  const payload = useMemo(
    () => ({
      scoreA,
      scoreB,
      mvpPlayerId: mvp,
      stats: roster.map((entry) => ({ ...rows.get(entry.id)!, team: entry.team })),
    }),
    [scoreA, scoreB, mvp, rows, roster],
  );

  const save = useCallback(async () => {
    if (locked) return true;
    setSaveState("saving");
    const result = await saveStatsAction(gameweekId, payload);
    if (result.error) {
      setSaveState("error");
      setError(result.error);
      return false;
    }
    setSaveState("saved");
    setError(null);
    dirtyRef.current = false;
    return true;
  }, [payload, gameweekId, locked]);

  // Otomatik kayıt — yarıda bırakıp sonra devam edebilesin diye.
  useEffect(() => {
    if (!dirtyRef.current) return;
    const timer = setTimeout(save, 1200);
    return () => clearTimeout(timer);
  }, [payload, save]);

  function patch(id: string, change: Partial<PlayerMatchStat>) {
    if (locked) return;
    dirtyRef.current = true;
    setRows((prev) => {
      const next = new Map(prev);
      next.set(id, { ...next.get(id)!, ...change });
      return next;
    });
  }

  const keeperCount = roster.filter((r) => rows.get(r.id)?.keptGoal).length;
  const absentCount = roster.filter((r) => !rows.get(r.id)?.played).length;
  const goalsEntered = roster.reduce((s, r) => s + (rows.get(r.id)?.goals ?? 0), 0);

  return (
    <Section
      step={3}
      title="Maç verisi"
      hint="Reytingler 6.5 varsayılan gelir; sadece değiştireceğine dokun."
      badge={
        saveState === "saving" ? (
          <Badge>Kaydediliyor…</Badge>
        ) : saveState === "saved" ? (
          <Badge tone="good">Kaydedildi</Badge>
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Counter label="A Takımı" value={scoreA} tone="neon" disabled={locked} onChange={(v) => { dirtyRef.current = true; setScoreA(v); }} />
        <Counter label="B Takımı" value={scoreB} tone="sky" disabled={locked} onChange={(v) => { dirtyRef.current = true; setScoreB(v); }} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone={keeperCount === 2 ? "good" : "warn"}>{keeperCount} kaleci</Badge>
        <Badge tone={absentCount === 0 ? "good" : "bad"}>{absentCount} gelmedi</Badge>
        <Badge tone={mvp ? "good" : "warn"}>{mvp ? "MVP seçildi" : "MVP yok"}</Badge>
        <Badge tone={goalsEntered === scoreA + scoreB ? "good" : "warn"}>
          {goalsEntered} gol girildi
        </Badge>
      </div>

      {(["A", "B"] as const).map((team) => (
        <div key={team} className="mt-4">
          <h3
            className={`mb-2 text-xs font-black uppercase tracking-widest ${
              team === "A" ? "text-neon" : "text-sky-cool"
            }`}
          >
            {team} Takımı
          </h3>
          <div className="space-y-1.5">
            {roster
              .filter((e) => e.team === team)
              .map((entry) => (
                <StatRow
                  key={entry.id}
                  entry={entry}
                  stat={rows.get(entry.id)!}
                  isMvp={mvp === entry.id}
                  locked={locked}
                  onPatch={(change) => patch(entry.id, change)}
                  onMvp={() => {
                    if (locked) return;
                    dirtyRef.current = true;
                    setMvp((prev) => (prev === entry.id ? null : entry.id));
                  }}
                />
              ))}
          </div>
        </div>
      ))}

      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {!locked && (
        <div className="sticky bottom-0 -mx-4 mt-4 flex gap-2 bg-ink-950/90 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={save}
            className="rounded-xl bg-ink-800 px-5 py-3.5 text-xs font-black uppercase tracking-widest text-chalk-dim ring-1 ring-ink-700"
          >
            Kaydet
          </button>
          <button
            type="button"
            disabled={completing}
            onClick={() => {
              if (
                !window.confirm(
                  `${gameweekNumber}. hafta TAMAMLANSIN mı?\n\nPuanlar açıklanacak, fiyatlar güncellenecek ve bu hafta bir daha DEĞİŞTİRİLEMEYECEK.`,
                )
              )
                return;
              startComplete(async () => {
                const saved = await save();
                if (!saved) return;
                const result = await completeAction(gameweekId);
                if (result.error) setError(result.error);
                else router.push("/admin");
              });
            }}
            className="flex-1 rounded-xl bg-neon py-3.5 text-sm font-black uppercase tracking-widest text-ink-950 disabled:opacity-50"
          >
            {completing ? "Tamamlanıyor…" : "Haftayı tamamla"}
          </button>
        </div>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ */

function Section({
  step,
  title,
  hint,
  badge,
  children,
}: {
  step: number;
  title: string;
  hint: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-ink-900/70 p-4 edge-light">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex gap-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink-800 text-xs font-black text-chalk-dim">
            {step}
          </span>
          <div>
            <h2 className="text-base font-extrabold uppercase tracking-wide text-chalk">
              {title}
            </h2>
            <p className="text-xs text-chalk-faint">{hint}</p>
          </div>
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

function PlayerGrid({
  players,
  marked,
  disabled,
  onToggle,
  tone,
}: {
  players: Player[];
  marked: string[];
  disabled: boolean;
  onToggle: (id: string) => void;
  tone: "flare";
}) {
  const set = new Set(marked);
  return (
    <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
      {players.map((player) => {
        const active = set.has(player.id);
        return (
          <li key={player.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onToggle(player.id)}
              className={`flex w-full flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition disabled:opacity-50 ${
                active ? `bg-${tone}/15 ring-2 ring-flare` : "bg-ink-850 ring-1 ring-ink-800"
              }`}
            >
              <span className="grid h-8 w-8 place-items-center overflow-hidden rounded bg-ink-800">
                <PlayerFigure playerId={player.id} name={player.name} className="h-full w-full" />
              </span>
              <span
                className={`line-clamp-1 text-center text-[9px] font-bold ${
                  active ? "text-flare" : "text-chalk-faint"
                }`}
              >
                {player.name}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function TeamGrid({
  players,
  teamA,
  teamB,
  disabled,
  onCycle,
}: {
  players: Player[];
  teamA: string[];
  teamB: string[];
  disabled: boolean;
  onCycle: (id: string) => void;
}) {
  const a = new Set(teamA);
  const b = new Set(teamB);
  return (
    <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
      {players.map((player) => {
        const inA = a.has(player.id);
        const inB = b.has(player.id);
        return (
          <li key={player.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onCycle(player.id)}
              className={`flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-left transition disabled:opacity-50 ${
                inA
                  ? "bg-neon/15 ring-2 ring-neon"
                  : inB
                    ? "bg-sky-cool/15 ring-2 ring-sky-cool"
                    : "bg-ink-850 ring-1 ring-ink-800"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded text-[11px] font-black ${
                  inA
                    ? "bg-neon text-ink-950"
                    : inB
                      ? "bg-sky-cool text-ink-950"
                      : "bg-ink-800 text-chalk-faint"
                }`}
              >
                {inA ? "A" : inB ? "B" : "–"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-bold text-chalk">
                  {player.name}
                </span>
                <span className="flex gap-0.5">
                  {player.slots.map((s) => (
                    <span key={s} className={`text-[8px] font-black ${SLOT_COLORS[s].text}`}>
                      {SLOT_LABEL[s]}
                    </span>
                  ))}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Counter({
  label,
  value,
  onChange,
  tone,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  tone: "neon" | "sky";
  disabled: boolean;
}) {
  const color = tone === "neon" ? "text-neon" : "text-sky-cool";
  return (
    <div className="rounded-xl bg-ink-850 p-3 text-center">
      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-chalk-faint">
        {label}
      </p>
      <div className="flex items-center justify-center gap-3">
        <StepButton disabled={disabled} onClick={() => onChange(Math.max(0, value - 1))} label={`${label} azalt`}>
          −
        </StepButton>
        <span className={`w-10 text-4xl font-black tabular ${color}`}>{value}</span>
        <StepButton disabled={disabled} onClick={() => onChange(value + 1)} label={`${label} artır`}>
          +
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-800 text-2xl font-black text-chalk ring-1 ring-ink-700 transition active:scale-90 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function StatRow({
  entry,
  stat,
  isMvp,
  locked,
  onPatch,
  onMvp,
}: {
  entry: { id: string; name: string };
  stat: PlayerMatchStat;
  isMvp: boolean;
  locked: boolean;
  onPatch: (change: Partial<PlayerMatchStat>) => void;
  onMvp: () => void;
}) {
  const absent = !stat.played;
  return (
    <div
      className={`rounded-xl px-3 py-2.5 ring-1 ${
        absent ? "bg-danger/5 ring-danger/25" : "bg-ink-900/70 ring-ink-800"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-850">
          <PlayerFigure playerId={entry.id} name={entry.name} className="h-full w-full" />
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-sm font-bold ${
            absent ? "text-chalk-faint line-through" : "text-chalk"
          }`}
        >
          {entry.name}
        </span>
        <Toggle active={absent} disabled={locked} onClick={() => onPatch({ played: !stat.played })} tone="danger">
          Gelmedi
        </Toggle>
        <Toggle active={stat.keptGoal} disabled={locked} onClick={() => onPatch({ keptGoal: !stat.keptGoal })} tone="sky">
          Kale
        </Toggle>
        <Toggle active={isMvp} disabled={locked} onClick={onMvp} tone="flare">
          MVP
        </Toggle>
      </div>

      {!absent && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Field label="Gol">
            <StepButton disabled={locked} onClick={() => onPatch({ goals: Math.max(0, stat.goals - 1) })} label="Gol azalt">
              −
            </StepButton>
            <span className="w-7 text-center text-xl font-black tabular text-chalk">
              {stat.goals}
            </span>
            <StepButton disabled={locked} onClick={() => onPatch({ goals: stat.goals + 1 })} label="Gol artır">
              +
            </StepButton>
          </Field>
          <Field label="Reyting">
            <StepButton
              disabled={locked}
              onClick={() => onPatch({ rating: Math.max(1, +(stat.rating - 0.5).toFixed(1)) })}
              label="Reyting azalt"
            >
              −
            </StepButton>
            <span
              className={`w-10 text-center text-xl font-black tabular ${
                stat.rating >= 7.5 ? "text-neon" : stat.rating < 6 ? "text-danger" : "text-chalk"
              }`}
            >
              {stat.rating.toFixed(1)}
            </span>
            <StepButton
              disabled={locked}
              onClick={() => onPatch({ rating: Math.min(10, +(stat.rating + 0.5).toFixed(1)) })}
              label="Reyting artır"
            >
              +
            </StepButton>
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-1 rounded-lg bg-ink-850/70 px-2 py-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-chalk-faint">
        {label}
      </span>
      <span className="flex items-center gap-1">{children}</span>
    </div>
  );
}

function Toggle({
  children,
  active,
  onClick,
  tone,
  disabled,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tone: "danger" | "sky" | "flare";
  disabled?: boolean;
}) {
  const activeClass = {
    danger: "bg-danger text-white",
    sky: "bg-sky-cool text-ink-950",
    flare: "bg-flare text-ink-950",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`shrink-0 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wide transition disabled:opacity-50 ${
        active ? activeClass : "bg-ink-800 text-chalk-faint"
      }`}
    >
      {children}
    </button>
  );
}
